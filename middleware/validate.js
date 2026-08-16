const { fail } = require('../utils/response');

/** Ensures a file (or files) was actually attached to the request. */
function requireFile(req, res, next) {
  if (!req.file && (!req.files || req.files.length === 0)) {
    return fail(res, 'No file uploaded.', 400);
  }
  next();
}

function requireFiles(minCount = 2) {
  return (req, res, next) => {
    if (!req.files || req.files.length < minCount) {
      return fail(res, `At least ${minCount} files are required.`, 400);
    }
    next();
  };
}

/** Generic body-field presence check: validateBody(['email','password']) */
function validateBody(fields = []) {
  return (req, res, next) => {
    const missing = fields.filter((f) => req.body[f] === undefined || req.body[f] === '');
    if (missing.length) {
      return fail(res, `Missing required field(s): ${missing.join(', ')}`, 422);
    }
    next();
  };
}

module.exports = { requireFile, requireFiles, validateBody };
