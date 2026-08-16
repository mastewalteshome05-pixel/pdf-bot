const telegramConfig = require('../config/telegram');
const supportConfig = require('../config/support');
const db = require('../utils/db');

/** Reply keyboard shown after /start — quick access buttons. */
function mainReplyKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '🚀 Open PDF Pro AI', web_app: { url: telegramConfig.miniAppUrl } }],
        [{ text: '❓ Help' }, { text: '💎 Premium' }]
      ],
      resize_keyboard: true
    }
  };
}

/** Inline keyboard with a single "Open App" web_app button — used in most bot replies. */
function openAppInlineKeyboard(label = '🚀 Open PDF Pro AI') {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: label, web_app: { url: telegramConfig.miniAppUrl } }]]
    }
  };
}

/** Inline keyboard for the /help message. */
function helpInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📖 FAQ', web_app: { url: `${telegramConfig.miniAppUrl}#faq` } }],
        [{ text: '💬 Contact Support', url: `https://t.me/${supportConfig.username}` }]
      ]
    }
  };
}

/** Inline keyboard offering every plan currently configured in data/settings.json. */
function subscribeInlineKeyboard() {
  const plans = Object.values(db.getSettings().plans);
  return {
    reply_markup: {
      inline_keyboard: plans.map((plan) => ([
        { text: `${plan.label} — ⭐️${plan.stars} (~$${plan.usd})`, callback_data: `subscribe:${plan.id}` }
      ]))
    }
  };
}

module.exports = { mainReplyKeyboard, openAppInlineKeyboard, helpInlineKeyboard, subscribeInlineKeyboard };
