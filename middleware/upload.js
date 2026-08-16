const { upload } = require('../config/multer');
const { fail } = require('../utils/response');

/** Wraps a multer middleware so errors go through our JSON error format instead of crashing. */
function wrap(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return fail(res, 'File too large.', 413);
        }
        return fail(res, err.message || 'Upload failed.', 400);
      }
      next();
    });
  };
}

module.exports = {
  single: (field = 'file') => wrap(upload.single(field)),
  multiple: (field = 'files', max = 20) => wrap(upload.array(field, max))
};
