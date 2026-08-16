const fs = require('fs-extra');
const Tesseract = require('tesseract.js');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Run OCR on an image file (JPG/PNG/etc.) and return the recognized text.
 * For scanned PDFs, convert pages to images first (see scanDocument.js / pdf-to-image step).
 * @param {string} imagePath
 * @param {{ lang?: string }} options
 */
async function ocrImage(imagePath, options = {}) {
  const lang = options.lang || 'eng';

  const { data } = await Tesseract.recognize(imagePath, lang, {
    logger: () => {} // silence per-tile progress logs; hook up to a progress callback if needed
  });

  const outputPath = makeOutputPath('.txt');
  await fs.writeFile(outputPath, data.text, 'utf-8');

  return { text: data.text, confidence: data.confidence, outputPath };
}

module.exports = ocrImage;
