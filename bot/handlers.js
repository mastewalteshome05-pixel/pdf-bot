const keyboards = require('./keyboards');
const logger = require('../utils/logger');

/**
 * Handles free-text and document messages sent directly to the bot
 * (outside of the Mini App). Keeps things simple: nudge the user into
 * the Mini App, which is where all the real tool UI lives.
 */
function register(bot) {
  bot.on('message', (msg) => {
    if (!msg.text && !msg.document) return; // ignore stickers/etc.
    if (msg.text && msg.text.startsWith('/')) return; // handled by commands.js

    if (msg.document) {
      return bot.sendMessage(
        msg.chat.id,
        `📎 Got your file: *${msg.document.file_name}*

Open the Mini App to choose what to do with it.`,
        { parse_mode: 'Markdown', ...keyboards.openAppInlineKeyboard() }
      );
    }

    // Reply-keyboard buttons mirror slash commands, but arrive as plain text —
    // commands.js's onText regexes won't match these labels, so handle them here.
    if (msg.text === '❓ Help' || msg.text === '💎 Premium') return;

    bot.sendMessage(
      msg.chat.id,
      `Tap below to open PDF Pro AI and get started 👇`,
      keyboards.openAppInlineKeyboard()
    );
  });

}

module.exports = { register };
