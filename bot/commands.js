const keyboards = require('./keyboards');
const db = require('../utils/db');
const appConfig = require('../config/app');
const { getBotUsername } = require('./botIdentity');

/**
 * The one place a referral is actually credited. Safe to call on every
 * /start and every verification pass — db.verifyReferral() is idempotent.
 */
function notifyReferralVerification(bot, telegramId) {
  const result = db.verifyReferral(telegramId);
  if (!result) return;

  const referrer = db.getReferralProfile(result.referrerId);
  let text = `🎉 *New referral!* Someone you invited joined PDF Pro AI.

` +
    `+${result.creditsAwarded} free credits (total: ${referrer.freeCredits})
` +
    `Referrals: ${referrer.referralCount}`;

  if (result.milestone10) text += `

🏅 Milestone: 10 referrals — bonus credits added!`;
  if (result.milestone100) text += `

🏆 Milestone: 100 referrals — big bonus credits added!`;
  if (result.milestonePremium) text += `

💎 30 referrals reached — 30 days of Premium added to your account, free!`;

  bot.sendMessage(result.referrerId, text, { parse_mode: 'Markdown' }).catch(() => {});
}

function register(bot) {
  bot.onText(/^\/start(?:\s+(\S+))?/, async (msg, match) => {
    const telegramId = String(msg.from.id);
    const displayName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') ||
      msg.from.username || `User ${telegramId}`;
    const referralPayload = match && match[1];

    const isNewUser = !db.getUser(telegramId);
    db.upsertUser(telegramId, {
      firstName: msg.from.first_name,
      lastName: msg.from.last_name || '',
      username: msg.from.username || '',
      languageCode: msg.from.language_code || 'en',
      isAdmin: appConfig.admins.includes(telegramId)
    });
    db.ensureReferralProfile(telegramId);

    if (isNewUser && referralPayload && referralPayload.startsWith('ref_')) {
      db.attachReferrer(telegramId, referralPayload.slice(4));
    }

    const { maintenanceMode, maintenanceMessage } = db.getSettings();
    if (maintenanceMode && !appConfig.admins.includes(telegramId)) {
      return bot.sendMessage(msg.chat.id, `🛠 ${maintenanceMessage}`);
    }

    notifyReferralVerification(bot, telegramId);

    bot.sendMessage(
      msg.chat.id,
      `👋 Welcome ${displayName}!

` +
      `You now have access to *PDF Pro AI*.

` +
      `Merge, split, compress, convert, sign, scan and OCR your documents — right inside Telegram.

` +
      `Tap the button below to get started 👇`,
      { parse_mode: 'Markdown', ...keyboards.mainReplyKeyboard() }
    );
  });

  const sendHelp = (msg) => bot.sendMessage(
    msg.chat.id,
    `*PDF Pro AI — Help*

` +
    `• Merge, Split, Compress, Rotate, Delete Pages
` +
    `• PDF ⇄ Word / Excel / PowerPoint
` +
    `• Image → PDF, Extract Text/Images, OCR
` +
    `• Protect / Unlock, Watermark, Signature, Scan
` +
    `• QR Generator / Scanner, Image Compressor, Background Remover

` +
    `Open the app and pick a tool — everything runs in a few taps.`,
    { parse_mode: 'Markdown', ...keyboards.helpInlineKeyboard() }
  );

  const sendPremium = (msg) => {
    const plans = Object.values(db.getSettings().plans);
    const lines = plans.map((p) => `⭐️ ${p.label} — ${p.stars} Stars (~$${p.usd})`).join('\n');
    bot.sendMessage(
      msg.chat.id,
      `💎 *Go Premium*\n\n` +
      `Unlimited daily operations, priority OCR, larger uploads, and no watermarked previews.\n\n` +
      `${lines}\n\n` +
      `Pay instantly with your Telegram Wallet — no card needed. Pick a plan below 👇`,
      { parse_mode: 'Markdown', ...keyboards.subscribeInlineKeyboard() }
    );
  };

  bot.onText(/^\/help/, sendHelp);
  bot.onText(/^\/premium/, sendPremium);
  bot.onText(/^\/subscribe/, sendPremium);

  bot.onText(/^\/(invite|referral)/, async (msg) => {
    const telegramId = String(msg.from.id);
    const profile = db.ensureReferralProfile(telegramId);
    const username = getBotUsername() || (await bot.getMe().catch(() => null))?.username;
    const link = username ? `https://t.me/${username}?start=ref_${profile.referralCode}` : null;

    bot.sendMessage(
      msg.chat.id,
      `👥 *Invite friends, earn credits*\n\n` +
      `+5 free credits per friend who joins\n` +
      `10 referrals → bonus credits\n` +
      `30 referrals → 30 days of Premium, free\n` +
      `100 referrals → big bonus credits\n\n` +
      `Your stats: *${profile.referralCount}* referrals · *${profile.freeCredits}* credits\n\n` +
      (link ? `Your link:
${link}` : `Your code: \`${profile.referralCode}\``),
      { parse_mode: 'Markdown' }
    );
  });

  bot.on('message', (msg) => {
    if (msg.text === '❓ Help') sendHelp(msg);
    if (msg.text === '💎 Premium') sendPremium(msg);
  });

  bot.onText(/^\/admin/, (msg) => {
    const isAdmin = appConfig.admins.includes(String(msg.from.id));
    if (!isAdmin) {
      return bot.sendMessage(msg.chat.id, '⛔ You are not authorized to use this command.');
    }
    const stats = db.getStats();
    bot.sendMessage(
      msg.chat.id,
      `🛠 *Admin Overview*\n\n` +
      `Users: ${stats.totalUsers}\n` +
      `Premium users: ${stats.premiumUsers}\n` +
      `Operations today: ${stats.operationsToday}`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/^\/whoami/, async (msg) => {
    const telegramId = String(msg.from.id);
    const isAdmin = appConfig.admins.includes(telegramId);

    bot.sendMessage(
      msg.chat.id,
      `🆔 Your Telegram ID: \`${telegramId}\`\n` +
      `👑 Recognized as admin: ${isAdmin ? 'Yes ✅' : 'No'}\n` +
      `Channel gate: disabled\n\n` +
      (isAdmin
        ? ''
        : `If this account should be an admin, set \`ADMIN_TELEGRAM_IDS=${telegramId}\` (or \`OWNER_TELEGRAM_ID=${telegramId}\`) in your environment and redeploy — copy the ID exactly, no quotes or extra spaces.`),
      { parse_mode: 'Markdown' }
    );
  });
}

module.exports = { register, notifyReferralVerification };
