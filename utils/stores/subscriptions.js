const { createStore } = require('../jsonStore');

const store = createStore('subscriptions.json', []);

function getSubscription(telegramId) {
  if (!telegramId) return null;
  return store.read().find((s) => String(s.telegramId) === String(telegramId)) || null;
}

function isPremiumActive(telegramId) {
  const sub = getSubscription(telegramId);
  return Boolean(sub && sub.expireDate && new Date(sub.expireDate).getTime() > Date.now() && sub.status === 'active');
}

/**
 * Extends (or starts) a subscription by `days`, counted from whichever is
 * later — right now, or the current expiry — so renewals stack instead of
 * wasting whatever time was left on the current period.
 */
function grantPremium(telegramId, days, plan = 'premium') {
  const subs = store.read();
  const idx = subs.findIndex((s) => String(s.telegramId) === String(telegramId));

  const base = idx !== -1 && subs[idx].expireDate && new Date(subs[idx].expireDate).getTime() > Date.now()
    ? new Date(subs[idx].expireDate)
    : new Date();
  base.setDate(base.getDate() + days);

  const record = {
    telegramId: String(telegramId),
    plan,
    startDate: idx !== -1 ? subs[idx].startDate : new Date().toISOString(),
    expireDate: base.toISOString(),
    status: 'active'
  };

  if (idx === -1) subs.push(record); else subs[idx] = record;
  store.write(subs);
  return record;
}

function revokePremium(telegramId) {
  const subs = store.read();
  const idx = subs.findIndex((s) => String(s.telegramId) === String(telegramId));
  if (idx === -1) return null;
  subs[idx] = { ...subs[idx], status: 'revoked' };
  store.write(subs);
  return subs[idx];
}

function listSubscriptions() {
  return store.read();
}

module.exports = { getSubscription, isPremiumActive, grantPremium, revokePremium, listSubscriptions };
