require('dotenv').config();

/**
 * Single source of truth for the "Help & Support" destination — used by the
 * bot's inline "Contact Support" button (bot/keyboards.js) and exposed to
 * the Mini App via GET /api/user/stats -> config.supportUsername so the
 * frontend's "Contact" button (public/js/app.js) never hardcodes it either.
 * Override with SUPPORT_TELEGRAM_USERNAME in .env if this ever changes.
 */
module.exports = {
  username: (process.env.SUPPORT_TELEGRAM_USERNAME || 'officalvexon').replace(/^@/, '')
};
