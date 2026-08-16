const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const appConfig = require('../config/app');
const { fail } = require('../utils/response');

// Serves a previously generated output file by its filename.
// Filenames are server-generated UUIDs (see utils/helpers.makeOutputPath), so
// there's no path traversal risk as long as we strip any path separators.
router.get('/download/:filename', async (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(appConfig.paths.uploadsOutput, filename);

  const exists = await fs.pathExists(filePath);
  if (!exists) return fail(res, 'File not found or has expired.', 404);

  res.download(filePath, filename);
});

module.exports = router;
