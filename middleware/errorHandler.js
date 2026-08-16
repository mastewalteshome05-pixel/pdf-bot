const logger = require('../utils/logger');
const { fail } = require('../utils/response');

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} → ${err.message}`, err);

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error. Please try again.'
      : err.message;

  return fail(res, message, statusCode);
}

function notFound(req, res) {
  return fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = { errorHandler, notFound };
