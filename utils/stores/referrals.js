const crypto = require('crypto');
const { createStore } = require('../jsonStore');

// profiles: one row per user — their own code, who referred them, and their
//   running totals. events: one immutable row per *verified* referral — the
//   single source of truth for "has this referred user already been counted",
//   so a referrer can never be credited twice for the same person.
const store = createStore('referrals.json', { profiles: {}, events: [] });

function read() {
  const data = store.read();
  if (!data.profiles) data.profiles = {};
  if (!data.events) data.events = [];
  return data;
}

function generateCode(telegramId) {
  // Short, shareable, and collision-resistant enough for this scale —
  // derived from the id so it's stable if ever regenerated, plus a random
  // suffix so it can't be guessed/enumerated from the telegramId alone.
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${String(telegramId).slice(-4)}${suffix}`.toUpperCase();
}

function getProfile(telegramId) {
  const { profiles } = read();
  return profiles[telegramId] || null;
}

function getByCode(code) {
  const { profiles } = read();
  return Object.values(profiles).find((p) => p.referralCode === code) || null;
}

/** Ensures a referral profile (and code) exists for this user; never overwrites one that already exists. */
function ensureProfile(telegramId) {
  const data = read();
  if (data.profiles[telegramId]) return data.profiles[telegramId];

  data.profiles[telegramId] = {
    telegramId: String(telegramId),
    referralCode: generateCode(telegramId),
    referrerId: null,
    referralCount: 0,
    freeCredits: 0,
    milestones: { m10: false, m100: false, m30premium: false },
    verified: false // has this user's own referral (the one who invited them) been counted yet
  };
  store.write(data);
  return data.profiles[telegramId];
}

/**
 * Attaches `referredTelegramId` to whoever owns `code`, WITHOUT crediting
 * the referrer yet — crediting only happens in verifyReferral, once we can
 * confirm this is a real, verified user (see business rules below).
 * Silently no-ops (returns null) on: unknown code, self-referral, or a user
 * who's already attached to a referrer (first attribution wins — stops
 * someone from re-triggering /start with a different code to double-dip).
 */
function attachReferrer(referredTelegramId, code) {
  const data = read();
  const referred = data.profiles[referredTelegramId];
  const referrer = Object.values(data.profiles).find((p) => p.referralCode === code);

  if (!referred || !referrer) return null;
  if (referrer.telegramId === referred.telegramId) return null; // no self-referral
  if (referred.referrerId) return null; // already attributed — first wins

  referred.referrerId = referrer.telegramId;
  store.write(data);
  return referred;
}

/**
 * The actual credit moment. Only ever called once verification is
 * confirmed (channel join, or immediately if no channel is required — see
 * bot/commands.js and middleware/channelCheck.js for the call sites).
 * Idempotent: a referredTelegramId can only ever produce ONE event, checked
 * against the event log — not against a boolean on the referred user's
 * profile alone — so this is the actual abuse-prevention boundary, not
 * just a convenience flag.
 *
 * Returns the milestone-bonus info (if any) so the caller can notify the
 * referrer, or null if there was nothing to verify / already verified.
 */
function verifyReferral(referredTelegramId) {
  const data = read();
  const referred = data.profiles[referredTelegramId];
  if (!referred || !referred.referrerId || referred.verified) return null;

  const alreadyLogged = data.events.some((e) => String(e.referredUserId) === String(referredTelegramId));
  if (alreadyLogged) {
    referred.verified = true; // heal an inconsistent state rather than re-credit
    store.write(data);
    return null;
  }

  const referrer = data.profiles[referred.referrerId];
  if (!referrer) return null;

  data.events.push({
    referrerId: referrer.telegramId,
    referredUserId: referred.telegramId,
    verifiedAt: new Date().toISOString()
  });

  referrer.referralCount += 1;
  referrer.freeCredits += 5;
  referred.verified = true;

  const bonuses = { creditsAwarded: 5, milestone10: false, milestone100: false, milestonePremium: false };

  if (referrer.referralCount >= 10 && !referrer.milestones.m10) {
    referrer.milestones.m10 = true;
    referrer.freeCredits += 10;
    bonuses.milestone10 = true;
  }
  if (referrer.referralCount >= 100 && !referrer.milestones.m100) {
    referrer.milestones.m100 = true;
    referrer.freeCredits += 100;
    bonuses.milestone100 = true;
  }
  if (referrer.referralCount >= 30 && !referrer.milestones.m30premium) {
    referrer.milestones.m30premium = true;
    bonuses.milestonePremium = true; // caller grants the actual 30-day premium via db.grantPremium
  }

  store.write(data);
  return { referrerId: referrer.telegramId, ...bonuses };
}

/** Spends one credit if the user has any; returns true if a credit was consumed. */
function spendCredit(telegramId) {
  const data = read();
  const profile = data.profiles[telegramId];
  if (!profile || profile.freeCredits <= 0) return false;
  profile.freeCredits -= 1;
  store.write(data);
  return true;
}

function listProfiles() {
  return Object.values(read().profiles);
}

function listEvents() {
  return read().events;
}

module.exports = {
  ensureProfile, getProfile, getByCode,
  attachReferrer, verifyReferral, spendCredit,
  listProfiles, listEvents
};
