const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const appConfig = require('../config/app');
const { fail } = require('../utils/response');
const db = require('../utils/db');

/** Global IP-based limiter — protects the server from abuse. */
const apiLimiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => fail(res, 'Too many requests. Please slow down.', 429)
});

// Anonymous/guest visitors (no logged-in Telegram identity) get a
// short-lived, in-memory IP-based cap — not worth persisting to usage.json
// forever since IPs churn and aren't a real user identity.
const guestOpsCache = new NodeCache({ stdTTL: 24 * 60 * 60 });

/**
 * Per-user daily operation cap for free-tier accounts, backed by
 * data/usage.json so it survives restarts (real abuse prevention, not just
 * an in-memory counter) — and settings.json for the current free-tier
 * limit, so admins can change it without redeploying.
 */
function dailyOperationLimiter(req, res, next) {
  const { maintenanceMode, maintenanceMessage, freeDailyLimit: limit } = db.getSettings();
  if (maintenanceMode) return fail(res, maintenanceMessage, 503);

  const type = `${req.baseUrl}${req.path}`.replace(/^\/api\//, '');

  // req.telegramId is set by middleware/auth.js's identify() from a
  // verified JWT — never trust a client-supplied header for this.
  if (!req.telegramId) {
    const key = `ops:${req.ip}`;
    const count = guestOpsCache.get(key) || 0;
    if (count >= limit) {
      return fail(res, `Free daily limit of ${limit} operations reached. Log in and upgrade to Premium for unlimited access.`, 403);
    }
    guestOpsCache.set(key, count + 1);
    return next();
  }

  const isPremium = db.isPremiumActive(req.user || db.getUser(req.telegramId));
  if (isPremium) {
    db.recordUsage(req.telegramId, type); // still logged, for admin stats — just not capped
    return next();
  }

  const used = db.getUsageToday(req.telegramId);
  if (used >= limit) {
    // Referral credits are a persistent bonus pool (not a daily reset) —
    // spend one only once the free daily quota is actually exhausted.
    if (db.spendReferralCredit(req.telegramId)) {
      db.recordUsage(req.telegramId, type);
      return next();
    }
    return fail(res, `Free daily limit of ${limit} operations reached. Upgrade to Premium, or invite friends with /invite to earn free credits.`, 403);
  }

  db.recordUsage(req.telegramId, type);
  next();
}

module.exports = { apiLimiter, dailyOperationLimiter };
