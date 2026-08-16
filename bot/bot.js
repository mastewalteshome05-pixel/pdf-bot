const TelegramBot = require('node-telegram-bot-api');
const telegramConfig = require('../config/telegram');
const appConfig = require('../config/app');
const logger = require('../utils/logger');
const commands = require('./commands');
const handlers = require('./handlers');
const payments = require('./payments');
const { setBotUsername, getBotUsername } = require('./botIdentity');

let botInstance = null;

/**
 * Initializes the Telegram bot. Uses long-polling by default (works fine
 * in production on a persistent-process host like Render/Railway); only
 * switches to webhook mode if TELEGRAM_USE_WEBHOOK=true is explicitly set
 * (see config/telegram.js) — webhook mode isn't wired up yet.
 */
function initBot() {
  if (!telegramConfig.isConfigured()) {
    logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot will not start. The web app will still run.');
    return null;
  }

  const bot = new TelegramBot(telegramConfig.botToken, {
    polling: telegramConfig.usePolling
  });

  commands.register(bot);
  handlers.register(bot);
  payments.register(bot);

  bot.on('polling_error', (err) => logger.error('Telegram polling error', err));
  bot.on('webhook_error', (err) => logger.error('Telegram webhook error', err));

  // getMe() confirms the bot's own @username, which powers referral link
  // generation (https://t.me/<username>?start=...). A single failed attempt
  // used to leave referral links permanently broken until restart — now it
  // retries with backoff, on top of the BOT_USERNAME env fallback in
  // botIdentity.js, so a transient network hiccup at boot can't strand it.
  resolveBotUsernameWithRetry(bot);

  logger.info(`Resolved admin Telegram IDs: ${appConfig.admins.length ? appConfig.admins.join(', ') : '(none set)'}`);
  logger.info('Join-channel gate disabled — users open the dashboard directly.');

  logger.info(`Telegram bot started in ${telegramConfig.usePolling ? 'polling' : 'webhook'} mode.`);
  botInstance = bot;
  return bot;
}

function resolveBotUsernameWithRetry(bot, attempt = 1) {
  const maxAttempts = 5;
  bot.getMe()
    .then((me) => { setBotUsername(me.username); logger.info(`Bot identity confirmed: @${me.username}`); })
    .catch((err) => {
      logger.error(`Failed to resolve bot username via getMe() (attempt ${attempt}/${maxAttempts})`, err);
      if (attempt >= maxAttempts) {
        logger.warn('Giving up on getMe() — relying on BOT_USERNAME env fallback (config/telegram.js) for referral links, if set.');
        return;
      }
      setTimeout(() => resolveBotUsernameWithRetry(bot, attempt + 1), attempt * 5000); // 5s, 10s, 15s, 20s
    });
}

function getBot() {
  return botInstance;
}

module.exports = { initBot, getBot, getBotUsername };
