const sharp = require('sharp');
const fs = require('fs-extra');
const { PDFDocument } = require('pdf-lib');
const { makeOutputPath } = require('../utils/helpers');

/**
 * "Scan" mode for a photographed document: auto-enhance (grayscale, normalize
 * contrast, sharpen) then wrap as a single-page PDF.
 *
 * Note: this does perspective/contrast enhancement only — full corner-detection
 * perspective correction (like real scanner apps) needs a computer-vision
 * library (e.g. OpenCV) and is out of scope here. For best results, ask the
 * user to photograph the page as flat/square as possible.
 *
 * @param {string} imagePath
 * @param {{ mode?: 'color'|'grayscale'|'bw' }} options
 */
async function scanDocument(imagePath, options = {}) {
  const { mode = 'grayscale' } = options;

  let pipeline = sharp(imagePath).rotate(); // auto-orient via EXIF
  pipeline = pipeline.normalize().sharpen();

  if (mode === 'grayscale') {
    pipeline = pipeline.grayscale();
  } else if (mode === 'bw') {
    pipeline = pipeline.grayscale().threshold(150);
  }

  const enhancedBuffer = await pipeline.jpeg({ quality: 92 }).toBuffer();
  const metadata = await sharp(enhancedBuffer).metadata();

  const pdf = await PDFDocument.create();
  const jpgImage = await pdf.embedJpg(enhancedBuffer);
  const page = pdf.addPage([metadata.width, metadata.height]);
  page.drawImage(jpgImage, { x: 0, y: 0, width: metadata.width, height: metadata.height });

  const outputPath = makeOutputPath('.pdf');
  await fs.writeFile(outputPath, await pdf.save());
  return outputPath;
}

module.exports = scanDocument;
