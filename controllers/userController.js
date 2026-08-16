const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { success, fail } = require('../utils/response');
const appConfig = require('../config/app');
const fs = require('fs-extra');
const path = require('path');
const telegramConfig = require('../config/telegram');
const supportConfig = require('../config/support');
const db = require('../utils/db');
const { getBot } = require('../bot/bot');
const { getBotUsername } = require('../bot/botIdentity');

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Verify Telegram WebApp `initData` per Telegram's documented HMAC scheme:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(telegramConfig.botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) return null;

  const userJson = params.get('user');
  return userJson ? JSON.parse(userJson) : null;
}

function readLogTail(filePath, maxLines = 40) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return [];
    return raw.split(/\r?\n/).filter(Boolean).slice(-maxLines);
  } catch {
    return [];
  }
}

/** POST /api/user/login — validates Telegram initData and issues a session JWT. */
const login = asyncRoute(async (req, res) => {
  const { initData } = req.body;
  if (!initData) return fail(res, 'initData is required.', 400);

  if (!telegramConfig.isConfigured()) {
    return fail(res, 'Telegram bot is not configured on the server.', 500);
  }

  const tgUser = verifyTelegramInitData(initData);
  if (!tgUser) return fail(res, 'Invalid Telegram authentication data.', 401);

  const user = db.upsertUser(String(tgUser.id), {
    firstName: tgUser.first_name,
    lastName: tgUser.last_name || '',
    username: tgUser.username || '',
    languageCode: tgUser.language_code || 'en',
    lastLoginAt: new Date().toISOString(),
    isAdmin: appConfig.admins.includes(String(tgUser.id))
  });

  const token = jwt.sign({ id: user.id, isAdmin: user.isAdmin }, appConfig.jwtSecret, { expiresIn: '7d' });
  db.verifyReferral(String(tgUser.id));

  return success(
    res,
    {
      user: { ...user, premium: db.isPremiumActive(user) },
      token,
      needsJoin: false,
      joinChannels: [],
      joinMessage: null,
      membershipUnavailable: false,
      debug: {
        telegramId: String(tgUser.id),
        recognizedAsAdmin: appConfig.admins.includes(String(tgUser.id)),
        adminsConfiguredCount: appConfig.admins.length
      }
    },
    'Logged in successfully.'
  );
});

/** GET /api/user/me */
const me = asyncRoute(async (req, res) => {
  const user = db.getUser(req.telegramId);
  if (!user) return fail(res, 'User not found.', 404);
  return success(res, { user: { ...user, premium: db.isPremiumActive(user) } });
});

/** GET /api/user/stats — personal usage summary (placeholder-friendly demo stats). */
const stats = asyncRoute(async (req, res) => {
  const global = db.getStats();
  return success(res, {
    global,
    config: {
      supportUsername: supportConfig.username,
      freeDailyLimit: db.getSettings().freeDailyLimit
    }
  });
});

/**
 * GET /api/user/usage — the calling user's real, server-tracked usage for
 * their current rolling 24h window (not a per-browser-session guess). This
 * is what the dashboard's "Ops today" / "Free left" cards should read from,
 * so a page refresh or a different device always shows the true number.
 */
const getUsage = asyncRoute(async (req, res) => {
  const { freeDailyLimit: limit } = db.getSettings();
  const user = req.user || db.getUser(req.telegramId);
  const premium = db.isPremiumActive(user);
  const used = db.getUsageToday(req.telegramId);

  return success(res, {
    used,
    limit,
    remaining: premium ? null : Math.max(0, limit - used), // null = unlimited
    premium,
    resetAt: premium ? null : db.getUsageResetAt(req.telegramId)
  });
});

/** POST /api/user/settings — persist dark mode / language / etc. */
const updateSettings = asyncRoute(async (req, res) => {
  const user = db.upsertUser(req.telegramId, { settings: req.body });
  return success(res, { user }, 'Settings saved.');
});

/** GET /api/user/admin/overview — admin-only dashboard data. */
const adminOverview = asyncRoute(async (req, res) => {
  const payments = db.listPayments();
  const broadcasts = db.listBroadcasts();
  const referrals = db.listReferralProfiles();
  const referralEvents = db.listReferralEvents();
  const planKeys = Object.keys(db.getSettings().plans || {});
  const planSummary = planKeys.reduce((acc, key) => {
    acc[key] = { paid: 0, pending: 0, rejected: 0 };
    return acc;
  }, {});

  let revenueStars = 0;
  let revenueUsdt = 0;
  let pendingPayments = 0;
  let paidPayments = 0;

  payments.forEach((payment) => {
    const plan = payment.plan && planSummary[payment.plan] ? payment.plan : null;
    if (plan) {
      planSummary[plan][payment.status || 'paid'] = (planSummary[plan][payment.status || 'paid'] || 0) + 1;
    }
    if ((payment.status || 'paid') === 'paid') {
      paidPayments += 1;
      if (String(payment.currency || '').toUpperCase() === 'XTR') revenueStars += Number(payment.amount || 0);
      if (String(payment.currency || '').toUpperCase() === 'USDT') revenueUsdt += Number(payment.amount || 0);
    } else if ((payment.status || '').toLowerCase() === 'pending') {
      pendingPayments += 1;
    }
  });

  const topReferrers = referrals
    .slice()
    .sort((a, b) => Number(b.referralCount || 0) - Number(a.referralCount || 0))
    .slice(0, 8);

  const logs = {
    access: readLogTail(path.join(appConfig.paths.logs, 'access.log'), 40),
    error: readLogTail(path.join(appConfig.paths.logs, 'error.log'), 40)
  };

  return success(res, {
    stats: db.getStats(),
    users: db.listUsers().map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName || '',
      username: u.username,
      premium: db.isPremiumActive(u),
      premiumUntil: u.premiumUntil || null,
      lastLoginAt: u.lastLoginAt
    })),
    payments,
    broadcasts,
    referrals: { profiles: referrals, events: referralEvents, topReferrers },
    logs,
    analytics: {
      totalPayments: payments.length,
      paidPayments,
      pendingPayments,
      revenueStars,
      revenueUsdt,
      referralUsers: referrals.length,
      referralEvents: referralEvents.length,
      planSummary
    }
  });
});

/** POST /api/user/admin/premium — grant/revoke premium for a user. */
const setPremium = asyncRoute(async (req, res) => {
  const { targetUserId, premium, days, plan } = req.body;
  if (!targetUserId) return fail(res, 'targetUserId is required.', 422);
  const user = premium
    ? db.grantPremium(String(targetUserId), parseInt(days, 10) || 30, plan || 'monthly')
    : db.revokePremium(String(targetUserId));
  return success(res, { user }, `Premium ${premium ? 'granted' : 'revoked'}.`);
});

/** GET /api/user/admin/settings — current maintenance mode, free limit, and plan pricing. */
const getAdminSettings = asyncRoute(async (req, res) => {
  return success(res, { settings: db.getSettings() });
});

/** POST /api/user/admin/settings — update maintenance mode / free limit / plan pricing. */
const updateAdminSettings = asyncRoute(async (req, res) => {
  const { maintenanceMode, maintenanceMessage, freeDailyLimit, plans } = req.body;
  const patch = {};
  if (typeof maintenanceMode === 'boolean') patch.maintenanceMode = maintenanceMode;
  if (typeof maintenanceMessage === 'string') patch.maintenanceMessage = maintenanceMessage;
  if (Number.isFinite(Number(freeDailyLimit))) patch.freeDailyLimit = Number(freeDailyLimit);
  if (plans && typeof plans === 'object') patch.plans = { ...db.getSettings().plans, ...plans };
  return success(res, { settings: db.updateSettings(patch) }, 'Settings updated.');
});

/** GET /api/user/admin/channels — join gating removed from the product flow. */
const getAdminChannels = asyncRoute(async (req, res) => {
  return success(res, { channels: { forceJoin: false, requiredChannels: [] } });
});

/** POST /api/user/admin/channels — retained for back-compat, but channel gating is disabled. */
const updateAdminChannels = asyncRoute(async (req, res) => {
  return success(res, { channels: { forceJoin: false, requiredChannels: [] } }, 'Channel gating is disabled.');
});

/** POST /api/user/admin/payments/:paymentId/approve — approve a pending USDT/manual payment. */
const approvePayment = asyncRoute(async (req, res) => {
  const { paymentId } = req.params;
  const payment = db.getPayment(paymentId);
  if (!payment) return fail(res, 'Payment not found.', 404);

  const plan = db.getSettings().plans[payment.plan];
  if (!plan) return fail(res, 'Plan not found for this payment.', 422);

  const updated = db.updatePayment(paymentId, {
    status: 'paid',
    approvedAt: new Date().toISOString(),
    approvedBy: req.telegramId
  });
  const user = db.grantPremium(String(payment.telegramId), plan.days, plan.id);
  return success(res, { payment: updated, user }, 'Payment approved and premium granted.');
});

/** POST /api/user/admin/payments/:paymentId/reject — reject a pending payment. */
const rejectPayment = asyncRoute(async (req, res) => {
  const { paymentId } = req.params;
  const payment = db.getPayment(paymentId);
  if (!payment) return fail(res, 'Payment not found.', 404);
  const updated = db.updatePayment(paymentId, {
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectedBy: req.telegramId
  });
  return success(res, { payment: updated }, 'Payment rejected.');
});

/** POST /api/user/admin/broadcast — send a message to all users via the bot. */
const broadcastMessage = asyncRoute(async (req, res) => {
  const { message } = req.body;
  if (!message || !String(message).trim()) return fail(res, 'Broadcast message is required.', 422);

  const bot = getBot();
  if (!bot) return fail(res, 'Telegram bot is not available right now.', 503);

  const recipients = db.listUsers().filter((u) => u.status !== 'banned');
  let sent = 0;
  const errors = [];

  for (const user of recipients) {
    try {
      await bot.sendMessage(String(user.telegramId), String(message));
      sent += 1;
    } catch (err) {
      errors.push(String(user.telegramId));
    }
  }

  const record = db.recordBroadcast({
    message: String(message),
    sentCount: sent,
    failedCount: errors.length,
    senderTelegramId: req.telegramId
  });

  return success(res, { record, sent, failed: errors.length }, 'Broadcast sent.');
});

/** GET /api/user/referral — the calling user's own referral code/link + stats. */
const getReferralStats = asyncRoute(async (req, res) => {
  const profile = db.ensureReferralProfile(req.telegramId);
  const username = getBotUsername();
  const link = username ? `https://t.me/${username}?start=ref_${profile.referralCode}` : null;

  return success(res, {
    referralCode: profile.referralCode,
    referralLink: link,
    referralCount: profile.referralCount,
    freeCredits: profile.freeCredits,
    milestones: profile.milestones
  });
});

/** GET /api/user/admin/referrals — every user's referral profile + the verified-event log. */
const adminReferrals = asyncRoute(async (req, res) => {
  return success(res, {
    profiles: db.listReferralProfiles(),
    events: db.listReferralEvents()
  });
});

/** GET /api/user/admin/coupons — list coupon codes. */
const getAdminCoupons = asyncRoute(async (req, res) => {
  return success(res, { coupons: db.listCoupons() });
});

/** POST /api/user/admin/coupons — create or update a coupon. */
const upsertAdminCoupon = asyncRoute(async (req, res) => {
  const { code, label, type, value, maxUses, expiresAt, active } = req.body;
  if (!code) return fail(res, 'Coupon code is required.', 422);
  const coupon = db.addCoupon({ code, label, type, value, maxUses, expiresAt, active });
  return success(res, { coupon, coupons: db.listCoupons() }, 'Coupon saved.');
});

/** POST /api/user/admin/coupons/:code/toggle — toggle active state. */
const toggleAdminCoupon = asyncRoute(async (req, res) => {
  const { code } = req.params;
  const coupon = db.toggleCoupon(code);
  if (!coupon) return fail(res, 'Coupon not found.', 404);
  return success(res, { coupon, coupons: db.listCoupons() }, 'Coupon updated.');
});

/** DELETE /api/user/admin/coupons/:code — remove a coupon. */
const deleteAdminCoupon = asyncRoute(async (req, res) => {
  const { code } = req.params;
  db.deleteCoupon(code);
  return success(res, { coupons: db.listCoupons() }, 'Coupon deleted.');
});

module.exports = {
  login, me, stats, getUsage, updateSettings, adminOverview, setPremium,
  getAdminSettings, updateAdminSettings, getAdminChannels, updateAdminChannels,
  approvePayment, rejectPayment, broadcastMessage,
  getReferralStats, adminReferrals, getAdminCoupons, upsertAdminCoupon, toggleAdminCoupon, deleteAdminCoupon
};
