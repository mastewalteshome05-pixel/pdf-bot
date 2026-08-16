const { createStore } = require('../jsonStore');

// Each user gets ONE rolling window: { count, windowStart }.
// windowStart is set the moment their first operation in a fresh cycle runs;
// the cap resets exactly 24h after that moment — not at UTC midnight — so
// someone who uses their 10 free ops at 11pm gets a fresh 10 at 11pm the
// next day, not at midnight two hours later. This matches "10 free every
// 24 hours" literally, and also means everyone's reset time is anchored to
// when they actually use the bot, not a shared global clock.
const store = createStore('usage.json', {});

const WINDOW_MS = 24 * 60 * 60 * 1000;

function readWindow(telegramId) {
  const usage = store.read();
  const entry = usage[String(telegramId)];
  if (!entry) return { count: 0, windowStart: null, expired: true };

  const expired = Date.now() - entry.windowStart >= WINDOW_MS;
  return { count: expired ? 0 : entry.count, windowStart: entry.windowStart, expired };
}

/** How many operations this user has run in their current 24h window (read-only, no side effects). */
function getUsageToday(telegramId) {
  return readWindow(telegramId).count;
}

/** When the user's current window resets (ISO string), or null if they have no active window. */
function getResetAt(telegramId) {
  const usage = store.read();
  const entry = usage[String(telegramId)];
  if (!entry) return null;
  const resetAt = entry.windowStart + WINDOW_MS;
  return Date.now() >= resetAt ? null : new Date(resetAt).toISOString();
}

/** Records one operation of `type`; starts a fresh 24h window if none is active or the old one expired. */
function recordUsage(telegramId, type) {
  const usage = store.read();
  const key = String(telegramId);
  const existing = usage[key];
  const expired = !existing || Date.now() - existing.windowStart >= WINDOW_MS;

  const entry = expired
    ? { count: 0, windowStart: Date.now(), byType: {} }
    : { ...existing, byType: { ...(existing.byType || {}) } };

  entry.count += 1;
  if (type) entry.byType[type] = (entry.byType[type] || 0) + 1;
  usage[key] = entry;

  // Prune windows that fully expired more than a day ago so the file
  // doesn't grow forever — safe because getUsageToday/getResetAt already
  // treat an expired window as "no active window" regardless.
  for (const id of Object.keys(usage)) {
    if (id !== key && Date.now() - usage[id].windowStart >= WINDOW_MS * 2) delete usage[id];
  }

  store.write(usage);
  return entry.count;
}

/** Sums every user's operations in their currently-active window — for the admin dashboard. */
function getTotalUsageToday() {
  const usage = store.read();
  return Object.entries(usage).reduce((sum, [, entry]) => {
    const active = Date.now() - entry.windowStart < WINDOW_MS;
    return sum + (active ? entry.count : 0);
  }, 0);
}

module.exports = { getUsageToday, getResetAt, recordUsage, getTotalUsageToday };
