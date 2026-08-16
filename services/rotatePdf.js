const { PDFDocument, degrees } = require('pdf-lib');
const fs = require('fs-extra');
const { makeOutputPath, parsePageRange } = require('../utils/helpers');

/**
 * Rotate pages of a PDF by a given angle (90, 180, 270).
 * @param {string} filePath
 * @param {{ angle: number, pages?: string }} options - pages: e.g. "1,3-5" or omitted for all
 */
async function rotatePdf(filePath, { angle = 90, pages } = {}) {
  const validAngles = [90, 180, 270, -90, -180, -270];
  if (!validAngles.includes(angle)) {
    throw new Error('Rotation angle must be one of 90, 180, 270.');
  }

  const bytes = await fs.readFile(filePath);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = pdf.getPageCount();
  const targetIndices = parsePageRange(pages, totalPages);

  targetIndices.forEach((i) => {
    const page = pdf.getPage(i);
    const current = page.getRotation().angle;
    page.setRotation(degrees(current + angle));
  });

  const outputPath = makeOutputPath('.pdf');
  await fs.writeFile(outputPath, await pdf.save());
  return outputPath;
}

module.exports = rotatePdf;
