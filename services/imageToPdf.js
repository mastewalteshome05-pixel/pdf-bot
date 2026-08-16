const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Combine an ordered array of image file paths into a single multi-page PDF.
 * Each image becomes a page sized to the image's own dimensions.
 * @param {string[]} imagePaths
 */
async function imageToPdf(imagePaths) {
  if (!imagePaths || imagePaths.length === 0) {
    throw new Error('At least one image is required.');
  }

  const pdf = await PDFDocument.create();

  for (const imgPath of imagePaths) {
    // Normalize everything to JPEG so pdf-lib can embed it consistently,
    // regardless of the original format (png/webp/gif/bmp/tiff/etc).
    const buffer = await sharp(imgPath).rotate().jpeg({ quality: 95 }).toBuffer();
    const metadata = await sharp(buffer).metadata();

    const embedded = await pdf.embedJpg(buffer);
    const page = pdf.addPage([metadata.width, metadata.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: metadata.width, height: metadata.height });
  }

  const outputPath = makeOutputPath('.pdf');
  await fs.writeFile(outputPath, await pdf.save());
  return outputPath;
}

module.exports = imageToPdf;
