const telegramConfig = require('../config/telegram');

let username = null;

function setBotUsername(u) {
  username = u;
}

/**
 * Falls back to BOT_USERNAME from .env if bot.getMe() hasn't resolved yet
 * (e.g. transient network hiccup on boot) — otherwise referral links would
 * stay permanently broken (null) until the next process restart. getMe()'s
 * result, once it arrives, still overwrites this via setBotUsername above.
 */
function getBotUsername() {
  return username || telegramConfig.botUsername || null;
}

module.exports = { setBotUsername, getBotUsername };
