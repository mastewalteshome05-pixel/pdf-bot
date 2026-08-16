const { success, fail } = require('../utils/response');
const db = require('../utils/db');
const { getBot } = require('../bot/bot');
const appConfig = require('../config/app');

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** GET /api/payment/plans — public pricing, shown in the Mini App premium view. */
const getPlans = asyncRoute(async (req, res) => {
  return success(res, { plans: Object.values(db.getSettings().plans) });
});

/** GET /api/payment/status — the calling user's current subscription state. */
const getStatus = asyncRoute(async (req, res) => {
  const user = req.user || db.getUser(req.telegramId);
  return success(res, {
    premium: db.isPremiumActive(user),
    premiumUntil: (user && user.premiumUntil) || null,
    plan: (user && user.plan) || null
  });
});

/**
 * POST /api/payment/invoice — creates a Telegram Stars invoice link for the
 * given plan. The Mini App opens this link with Telegram.WebApp.openInvoice(),
 * which brings up Telegram's native payment sheet backed by the user's
 * Telegram Wallet / Stars balance. No card details or external processor
 * ever touch this server — Telegram settles the charge and reports back via
 * the bot's pre_checkout_query / successful_payment updates (see bot/payments.js).
 */

/** GET /api/payment/usdt-info — public wallet info shown in the Mini App. */
const getUsdtInfo = asyncRoute(async (req, res) => {
  return success(res, {
    walletAddress: appConfig.usdt.walletAddress,
    network: appConfig.usdt.network
  });
});

const createInvoice = asyncRoute(async (req, res) => {
  const telegramId = req.telegramId;

  const { plan } = req.body;
  const planConfig = db.getSettings().plans[plan];
  if (!planConfig) return fail(res, 'Unknown plan.', 422);

  const bot = getBot();
  if (!bot) return fail(res, 'Payments are temporarily unavailable — the bot is not configured.', 503);

  try {
    const invoiceLink = await bot.createInvoiceLink(
      `PDF Pro AI — ${planConfig.label} Premium`,
      `Unlimited daily operations, priority OCR, larger uploads, no watermarks — billed ${planConfig.label.toLowerCase()}.`,
      JSON.stringify({ telegramId: String(telegramId), plan: planConfig.id }), // payload, echoed back on payment
      '', // provider_token — left empty for Telegram Stars (XTR)
      'XTR',
      [{ label: `${planConfig.label} Premium`, amount: planConfig.stars }]
    );
    return success(res, { invoiceLink, stars: planConfig.stars, plan: planConfig.id, method: 'stars' }, 'Invoice created.');
  } catch (err) {
    return fail(res, `Could not create invoice: ${err.message}`, 502);
  }
});

/** POST /api/payment/usdt-request — creates a pending manual payment request. */
const requestUsdtPayment = asyncRoute(async (req, res) => {
  const telegramId = req.telegramId;
  const { plan, txHash, senderAddress } = req.body;
  const planConfig = db.getSettings().plans[plan];
  if (!planConfig) return fail(res, 'Unknown plan.', 422);

  const payment = db.recordPayment({
    telegramId: String(telegramId),
    plan: planConfig.id,
    amount: planConfig.usd,
    currency: 'USDT',
    method: 'usdt',
    status: 'pending',
    txHash: String(txHash || ''),
    senderAddress: String(senderAddress || ''),
    walletAddress: appConfig.usdt.walletAddress,
    network: appConfig.usdt.network
  });

  return success(
    res,
    {
      payment,
      walletAddress: appConfig.usdt.walletAddress,
      network: appConfig.usdt.network,
      plan: planConfig
    },
    'USDT request submitted. Admin will verify it.'
  );
});

module.exports = { getPlans, getStatus, getUsdtInfo, createInvoice, requestUsdtPayment };
