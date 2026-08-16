const { fail } = require('../utils/response');

/**
 * Join-channel gate removed from the product flow. We still enforce that the
 * request comes from a Telegram-authenticated session, but the dashboard and
 * tools are no longer blocked behind a channel subscription check.
 */
async function requireChannelMembership(req, res, next) {
  if (!req.telegramId) {
    return fail(res, 'Please open PDF Pro AI from Telegram to continue.', 401);
  }
  next();
}

module.exports = { requireChannelMembership };
