const db = require('../utils/db');
const { fail } = require('../utils/response');

/**
 * Hard-gates Premium-only tools (PDF↔Word/Excel/PPT, OCR, background
 * remover, ...) — distinct from middleware/rateLimiter.js's
 * dailyOperationLimiter, which only caps how many *free* tools a guest/free
 * user can run per day rather than blocking a tool outright.
 *
 * Must run after middleware/auth.js's `identify` (or `authenticate`) so
 * req.telegramId / req.user are already set.
 */
function requirePremium(req, res, next) {
  if (!req.telegramId) {
    return fail(res, 'This tool is Premium-only. Log in from the Telegram Mini App and upgrade to use it.', 401);
  }

  const user = req.user || db.getUser(req.telegramId);
  if (!db.isPremiumActive(user)) {
    return fail(
      res,
      'This tool is Premium-only. Upgrade to unlock it.',
      403,
      { plans: Object.values(db.getSettings().plans) }
    );
  }

  next();
}

/**
 * Hard-gates Pro-exclusive tools (currently: OCR). Stricter than
 * requirePremium — an active Premium subscription is NOT enough here,
 * only the Pro plan (`user.plan === 'pro'`) qualifies. Premium subscribers
 * still get everything requirePremium covers.
 */
function requirePro(req, res, next) {
  if (!req.telegramId) {
    return fail(res, 'This feature is available in Pro plan only.', 401);
  }

  const user = req.user || db.getUser(req.telegramId);
  if (!(db.isPremiumActive(user) && user.plan === 'pro')) {
    return fail(
      res,
      'This feature is available in Pro plan only.',
      403,
      { plans: Object.values(db.getSettings().plans) }
    );
  }

  next();
}

module.exports = { requirePremium, requirePro };
