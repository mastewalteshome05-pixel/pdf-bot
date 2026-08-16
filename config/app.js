/**
 * Central app configuration — reads from .env with safe defaults.
 */
require('dotenv').config();
const path = require('path');

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',

  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50,
  freeDailyOperations: parseInt(process.env.FREE_DAILY_OPERATIONS, 10) || 10,

  rateLimit: {
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW_MIN, 10) || 15) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
  },

  admins: Array.from(new Set([
    ...(process.env.ADMIN_TELEGRAM_IDS || '').split(',').map((id) => id.trim()).filter(Boolean),
    ...(process.env.OWNER_TELEGRAM_ID ? [String(process.env.OWNER_TELEGRAM_ID).trim()] : [])
  ].filter(Boolean))),

  removeBgApiKey: process.env.REMOVE_BG_API_KEY || '',
  libreOfficeBin: process.env.LIBREOFFICE_BIN || 'soffice',

  // Telegram channel users must join before using any tool. Leave blank to
  // disable the check. Must include the @ (e.g. "@PDFPROAI") and the bot
  // must be an ADMIN of that channel, or Telegram won't let it look up
  // member status for other users.
  requiredChannel: process.env.REQUIRED_CHANNEL_USERNAME || '',

  // Plans, sold via Telegram Stars (Telegram's native in-app currency/wallet
  // — no external payment provider or bank account needed). Free tier is
  // just "no active subscription" — capped by freeDailyOperations above.
  premium: {
    monthly: {
      id: 'monthly',
      label: 'Monthly',
      usd: parseFloat(process.env.MONTHLY_USD) || 4.99,
      stars: parseInt(process.env.MONTHLY_STARS, 10) || 325,
      days: 30
    },
    yearly: {
      id: 'yearly',
      label: 'Yearly',
      usd: parseFloat(process.env.YEARLY_USD) || 29.99,
      stars: parseInt(process.env.YEARLY_STARS, 10) || 1800,
      days: 365
    },
    pro: {
      id: 'pro',
      label: 'Pro (Lifetime)',
      usd: parseFloat(process.env.PRO_USD) || 39,
      stars: parseInt(process.env.PRO_STARS, 10) || 2500,
      days: 36500
    }
  },
  usdt: {
    walletAddress: process.env.USDT_WALLET_ADDRESS || 'YOUR_USDT_WALLET_ADDRESS',
    network: process.env.USDT_NETWORK || 'TRC20'
  },

  paths: {
    root: path.join(__dirname, '..'),
    uploadsInput: path.join(__dirname, '..', 'uploads', 'input'),
    uploadsOutput: path.join(__dirname, '..', 'uploads', 'output'),
    temp: path.join(__dirname, '..', 'temp'),
    logs: path.join(__dirname, '..', 'logs'),
    public: path.join(__dirname, '..', 'public')
  }
};
