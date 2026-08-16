const fs = require('fs-extra');
const path = require('path');
const { success } = require('../utils/response');
const { toDownloadUrl, humanFileSize } = require('../utils/helpers');

const compressImage = require('../services/imageCompressor');
const removeBackground = require('../services/backgroundRemover');
const generateQr = require('../services/qrGenerator');

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function cleanupInputs(files) {
  (files || []).forEach((f) => f && fs.remove(f).catch(() => {}));
}

async function respondWithFile(res, outputPath, message) {
  const stat = await fs.stat(outputPath);
  return success(res, {
    downloadUrl: toDownloadUrl(outputPath),
    filename: path.basename(outputPath),
    size: humanFileSize(stat.size)
  }, message);
}

const compress = asyncRoute(async (req, res) => {
  const { quality, maxWidth } = req.body;
  const outputPath = await compressImage(req.file.path, {
    quality: quality ? parseInt(quality, 10) : undefined,
    maxWidth: maxWidth ? parseInt(maxWidth, 10) : undefined
  });
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'Image compressed successfully.');
});

const removeBg = asyncRoute(async (req, res) => {
  const outputPath = await removeBackground(req.file.path);
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'Background removed successfully.');
});

const qrGenerate = asyncRoute(async (req, res) => {
  const { content, size, darkColor, lightColor } = req.body;
  const outputPath = await generateQr(content, {
    size: size ? parseInt(size, 10) : undefined,
    darkColor,
    lightColor
  });
  return respondWithFile(res, outputPath, 'QR code generated successfully.');
});

module.exports = { compress, removeBg, qrGenerate };
