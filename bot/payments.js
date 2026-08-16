const db = require('../utils/db');
const logger = require('../utils/logger');

/**
 * Telegram Stars (currency code "XTR") is Telegram's own in-app currency —
 * users buy Stars once (via Telegram's built-in wallet/App Store/Play
 * billing) and spend them inside any bot without re-entering payment
 * details. That makes it the natural fit for "pay from your Telegram
 * wallet" subscriptions, and it needs no external payment provider token.
 *
 * Flow:
 *  1. /subscribe (or the 💎 Premium button) shows a plan-choice keyboard.
 *  2. Tapping a plan sends a Stars invoice via bot.sendInvoice.
 *  3. Telegram asks us to confirm right before charging: pre_checkout_query.
 *  4. On success, Telegram sends a message with a successful_payment object.
 *     That's the only trustworthy signal — we grant premium *there*, never
 *     optimistically before Telegram confirms the charge went through.
 *
 * Pricing comes from data/settings.json (db.getSettings().plans), not a
 * static config file, so an admin can change prices without redeploying.
 */
function register(bot) {
  bot.on('callback_query', async (query) => {
    const data = query.data || '';
    if (!data.startsWith('subscribe:')) return;

    const planId = data.split(':')[1];
    const plan = db.getSettings().plans[planId];
    if (!plan) return bot.answerCallbackQuery(query.id, { text: 'Unknown plan.' });

    try {
      await bot.sendInvoice(
        query.message.chat.id,
        `PDF Pro AI — ${plan.label} Premium`,
        `Unlimited daily operations, priority OCR, larger uploads, no watermarks — billed ${plan.label.toLowerCase()}.`,
        JSON.stringify({ telegramId: String(query.from.id), plan: plan.id }),
        '', // provider_token — empty for Telegram Stars
        'XTR',
        [{ label: `${plan.label} Premium`, amount: plan.stars }]
      );
      await bot.answerCallbackQuery(query.id);
    } catch (err) {
      logger.error('Failed to send Stars invoice', err);
      await bot.answerCallbackQuery(query.id, { text: 'Could not start checkout. Try again shortly.' });
    }
  });

  // Telegram fires this right before charging the user's Stars balance —
  // we have ~10s to approve or the payment is cancelled automatically.
  bot.on('pre_checkout_query', async (query) => {
    try {
      const payload = JSON.parse(query.invoice_payload || '{}');
      const plan = db.getSettings().plans[payload.plan];
      if (!plan || String(payload.telegramId) !== String(query.from.id)) {
        return bot.answerPreCheckoutQuery(query.id, false, { error_message: 'Invalid order, please try again.' });
      }
      return bot.answerPreCheckoutQuery(query.id, true);
    } catch (err) {
      logger.error('pre_checkout_query failed', err);
      return bot.answerPreCheckoutQuery(query.id, false, { error_message: 'Something went wrong, please try again.' });
    }
  });

  // The only point at which Stars have actually left the user's wallet.
  bot.on('message', (msg) => {
    if (!msg.successful_payment) return;

    const sp = msg.successful_payment;
    let payload = {};
    try { payload = JSON.parse(sp.invoice_payload || '{}'); } catch { /* ignore */ }

    const plan = db.getSettings().plans[payload.plan];
    if (!plan) {
      logger.error('successful_payment with unrecognized plan payload', sp);
      return;
    }

    const telegramId = String(payload.telegramId || msg.from.id);
    const user = db.grantPremium(telegramId, plan.days, plan.id);
    db.recordPayment({
      telegramId,
      plan: plan.id,
      amount: sp.total_amount,
      currency: sp.currency,
      status: 'paid',
      telegramChargeId: sp.telegram_payment_charge_id,
      providerChargeId: sp.provider_payment_charge_id || null
    });

    logger.info('Premium granted via Telegram Stars', { telegramId, plan: plan.id, stars: sp.total_amount });

    bot.sendMessage(
      msg.chat.id,
      `✅ *Payment received!*\n\n💎 You're now Premium until *${new Date(user.premiumUntil).toDateString()}*.\n\nEnjoy unlimited operations — thanks for supporting PDF Pro AI!`,
      { parse_mode: 'Markdown' }
    );
  });
}

module.exports = { register };
