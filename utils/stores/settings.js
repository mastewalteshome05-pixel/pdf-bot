const { createStore } = require('../jsonStore');
const appConfig = require('../../config/app');

// Seeded once from .env on first run; from then on settings.json is the
// live source of truth and can be changed at runtime (e.g. from an admin
// panel) without redeploying.
const DEFAULTS = {
  maintenanceMode: false,
  maintenanceMessage: 'PDF Pro AI is undergoing maintenance. Please check back shortly.',
  freeDailyLimit: appConfig.freeDailyOperations,
  plans: appConfig.premium // { premium: {...}, pro: {...} } — id/label/usd/stars/days per plan
};

const store = createStore('settings.json', DEFAULTS);

function getSettings() {
  // Backfill any keys added after a settings.json already existed on disk.
  return { ...DEFAULTS, ...store.read() };
}

function updateSettings(patch) {
  const merged = { ...getSettings(), ...patch };
  store.write(merged);
  return merged;
}

module.exports = { getSettings, updateSettings };
