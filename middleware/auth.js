const jwt = require('jsonwebtoken');
const appConfig = require('../config/app');
const db = require('../utils/db');
const { fail } = require('../utils/response');

function extractToken(req) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/**
 * Figures out who's calling, if anyone.
 *
 * The ONLY trustworthy source of identity is the JWT minted by
 * POST /api/user/login — and that endpoint only ever issues one after
 * verifying Telegram's HMAC-signed `initData` (see userController.login).
 * So a valid token here means Telegram genuinely vouched for this user.
 *
 * The client also sends an `X-Telegram-Id` header for convenience/logging,
 * but it is NEVER used for identity or authorization — anyone can set it
 * to any value from devtools, so trusting it would let a user impersonate
 * someone else (e.g. claim to be Premium, or claim another user's account).
 *
 * Does not block the request — sets req.telegramId / req.isAdmin / req.user
 * when a valid token is present, and leaves them null otherwise so routes
 * that allow anonymous/guest access (free-tier tools, IP-based limits)
 * keep working. Routes that require a real identity should use
 * `authenticate` or `requireAdmin` below instead.
 */
function identify(req, res, next) {
  req.telegramId = null;
  req.isAdmin = false;
  req.user = null;

  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, appConfig.jwtSecret);
    req.telegramId = String(payload.id);
    req.isAdmin = Boolean(payload.isAdmin);
    req.user = db.getUser(req.telegramId);
  } catch {
    // Expired/invalid/tampered token — treat the request as anonymous
    // rather than erroring; `authenticate` is what enforces a hard requirement.
  }
  next();
}

/** Rejects the request unless identify() found a valid, logged-in session. */
function authenticate(req, res, next) {
  identify(req, res, () => {
    if (!req.telegramId) {
      return fail(res, 'Please log in from inside the Telegram Mini App.', 401);
    }
    next();
  });
}

/** Rejects unless the caller is logged in AND listed in ADMIN_TELEGRAM_IDS. */
function requireAdmin(req, res, next) {
  authenticate(req, res, () => {
    if (!req.isAdmin) return fail(res, 'Admin access required.', 403);
    next();
  });
}

module.exports = { identify, authenticate, requireAdmin };
