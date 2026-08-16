require('dotenv').config();

module.exports = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
  miniAppUrl: process.env.TELEGRAM_MINI_APP_URL || process.env.APP_URL || '',

  // Only needed as a FALLBACK for building referral links (https://t.me/<username>?start=...)
  // if bot.getMe() hasn't resolved yet (see bot/bot.js). Set this if you ever
  // see referral links come back empty right after a deploy/restart. Strip a
  // leading @ if someone pastes it that way.
  botUsername: (process.env.BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, ''),

  // Long-polling works fine in production too (Render/Railway keep a
  // persistent process running) and needs zero extra setup. Webhook mode
  // isn't wired up in this app (no bot.setWebHook call, no webhook route),
  // so it must never turn on just because NODE_ENV=production — that was
  // silently killing all bot updates. Only flip to webhook mode by setting
  // TELEGRAM_USE_WEBHOOK=true once a real webhook route exists.
  usePolling: process.env.TELEGRAM_USE_WEBHOOK !== 'true',

  isConfigured() {
    return Boolean(this.botToken);
  }
};
