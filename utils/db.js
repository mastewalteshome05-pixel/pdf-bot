/**
 * Facade over six separate JSON stores under /data:
 *   users.json          — account, join date, status
 *   payments.json        — payment history
 *   subscriptions.json   — premium plan + expiry
 *   settings.json        — maintenance mode, free daily limit, plan pricing
 *   channels.json        — legacy back-compat settings (disabled)
 *   usage.json            — per-user daily tool usage (free-tier cap + abuse prevention)
 *
 * Each store is a small standalone module in utils/stores/ — this file just
 * composes them so the rest of the app (controllers, middleware, bot) keeps
 * calling one `db.*` API instead of importing six modules everywhere.
 */
const users = require('./stores/users');
const subscriptions = require('./stores/subscriptions');
const payments = require('./stores/payments');
const broadcasts = require('./stores/broadcasts');
const settings = require('./stores/settings');
const channels = require('./stores/channels');
const usage = require('./stores/usage');
const referrals = require('./stores/referrals');
const coupons = require('./stores/coupons');

function resolveTelegramId(userOrId) {
  if (!userOrId) return null;
  return typeof userOrId === 'object' ? (userOrId.telegramId || userOrId.id) : String(userOrId);
}

/** Merges a users.json record with its live subscription status. */
function mergeUserWithSubscription(user) {
  if (!user) return null;
  const sub = subscriptions.getSubscription(user.telegramId);
  return {
    ...user,
    id: user.telegramId, // back-compat alias — some callers/frontend still read `.id`
    premium: subscriptions.isPremiumActive(user.telegramId),
    premiumUntil: sub ? sub.expireDate : null,
    plan: sub ? sub.plan : null
  };
}

// ── Users ────────────────────────────────────────────────
function getUser(telegramId) {
  return mergeUserWithSubscription(users.getUser(telegramId));
}

function upsertUser(telegramId, patch) {
  return mergeUserWithSubscription(users.upsertUser(telegramId, patch));
}

function listUsers() {
  return users.listUsers().map(mergeUserWithSubscription);
}

// ── Premium / subscriptions ─────────────────────────────
function isPremiumActive(userOrId) {
  const telegramId = resolveTelegramId(userOrId);
  return telegramId ? subscriptions.isPremiumActive(telegramId) : false;
}

function grantPremium(telegramId, days, plan = 'premium') {
  if (!users.getUser(telegramId)) users.upsertUser(telegramId, {}); // ensure a users.json row exists
  subscriptions.grantPremium(telegramId, days, plan);
  return getUser(telegramId);
}

function revokePremium(telegramId) {
  subscriptions.revokePremium(telegramId);
  return getUser(telegramId);
}

// ── Payments ─────────────────────────────────────────────
const recordPayment = payments.recordPayment;
const listPayments = payments.listPayments;
const getPayment = payments.getPayment;
const updatePayment = payments.updatePayment;

// ── Broadcasts ────────────────────────────────────────────
const recordBroadcast = broadcasts.recordBroadcast;
const listBroadcasts = broadcasts.listBroadcasts;

// ── Settings (maintenance mode, free daily limit, plan pricing) ────────
const getSettings = settings.getSettings;
const updateSettings = settings.updateSettings;

// ── Channels (disabled) ───────────────────────────────
const getChannels = channels.getChannels;
const setChannels = channels.setChannels;

// ── Usage (rolling 24h cap + abuse prevention) ──────────
const getUsageToday = usage.getUsageToday;
const getUsageResetAt = usage.getResetAt;
const recordUsage = usage.recordUsage;

// ── Referrals ────────────────────────────────────────────
const ensureReferralProfile = referrals.ensureProfile;
const getReferralProfile = referrals.getProfile;
const getReferralByCode = referrals.getByCode;
const attachReferrer = referrals.attachReferrer;
const spendReferralCredit = referrals.spendCredit;
const listReferralProfiles = referrals.listProfiles;
const listReferralEvents = referrals.listEvents;

// ── Coupons ──────────────────────────────────────────────
const listCoupons = coupons.listCoupons;
const addCoupon = coupons.addCoupon;
const deleteCoupon = coupons.deleteCoupon;
const toggleCoupon = coupons.toggleCoupon;

/**
 * The credit moment for a referral — only call this once you can vouch the
 * referred user is real (channel-join verified, or no channel required).
 * Also grants the 30-referral premium milestone here (rather than inside
 * the referrals store) since that needs the subscriptions store too.
 */
function verifyReferral(telegramId) {
  const result = referrals.verifyReferral(telegramId);
  if (result && result.milestonePremium) {
    const referrer = getUser(result.referrerId);
    grantPremium(result.referrerId, 30, (referrer && referrer.plan) || 'premium');
  }
  return result;
}

// ── Aggregate stats for the admin dashboard ─────────────
function getStats() {
  return {
    totalUsers: users.listUsers().length,
    premiumUsers: subscriptions.listSubscriptions().filter((s) => isPremiumActive(s.telegramId)).length,
    operationsToday: usage.getTotalUsageToday()
  };
}

module.exports = {
  getUser, upsertUser, listUsers,
  isPremiumActive, grantPremium, revokePremium,
  recordPayment, listPayments, getPayment, updatePayment,
  getSettings, updateSettings,
  getChannels, setChannels,
  recordBroadcast, listBroadcasts,
  getUsageToday, getUsageResetAt, recordUsage,
  ensureReferralProfile, getReferralProfile, getReferralByCode, attachReferrer,
  spendReferralCredit, listReferralProfiles, listReferralEvents, verifyReferral,
  listCoupons, addCoupon, deleteCoupon, toggleCoupon,
  getStats
};
