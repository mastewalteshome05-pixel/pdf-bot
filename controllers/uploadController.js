const path = require('path');
const { success, fail } = require('../utils/response');
const { humanFileSize } = require('../utils/helpers');

/** Handles a single file upload and returns metadata the frontend can reuse for next steps. */
function uploadSingle(req, res) {
  if (!req.file) return fail(res, 'No file uploaded.', 400);
  return success(res, {
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: humanFileSize(req.file.size),
    mimetype: req.file.mimetype,
    path: req.file.path
  }, 'File uploaded successfully.');
}

/** Handles multiple file uploads (e.g. for Merge PDF / Image to PDF). */
function uploadMultiple(req, res) {
  if (!req.files || req.files.length === 0) return fail(res, 'No files uploaded.', 400);
  const files = req.files.map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    size: humanFileSize(f.size),
    mimetype: f.mimetype,
    path: f.path
  }));
  return success(res, { files }, `${files.length} file(s) uploaded successfully.`);
}

module.exports = { uploadSingle, uploadMultiple };
