const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra');
const { execFile } = require('child_process');
const { makeOutputPath } = require('../utils/helpers');
const logger = require('../utils/logger');

const QUALITY_PRESETS = {
  low: '/screen',   // smallest file, lowest quality
  medium: '/ebook', // good balance (default)
  high: '/printer'  // larger file, higher quality
};

/** Real, high-ratio compression via Ghostscript (recompresses embedded images). */
function compressWithGhostscript(inputPath, outputPath, preset) {
  return new Promise((resolve, reject) => {
    const gsSetting = QUALITY_PRESETS[preset] || QUALITY_PRESETS.medium;
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=${gsSetting}`,
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${outputPath}`,
      inputPath
    ];
    execFile('gs', args, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/** Fallback compression using pdf-lib alone (structural cleanup only — no image recompression). */
async function compressWithPdfLib(inputPath, outputPath) {
  const bytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const outBytes = await pdf.save({ useObjectStreams: true });
  await fs.writeFile(outputPath, outBytes);
}

/**
 * Compress a PDF file.
 * @param {string} filePath
 * @param {{ quality?: 'low'|'medium'|'high' }} options
 * @returns {Promise<{ path: string, usedGhostscript: boolean }>}
 */
async function compressPdf(filePath, options = {}) {
  const outputPath = makeOutputPath('.pdf');
  try {
    await compressWithGhostscript(filePath, outputPath, options.quality);
    return { path: outputPath, usedGhostscript: true };
  } catch (err) {
    logger.warn('Ghostscript unavailable, falling back to pdf-lib compression', { error: err.message });
    await compressWithPdfLib(filePath, outputPath);
    return { path: outputPath, usedGhostscript: false };
  }
}

module.exports = compressPdf;
