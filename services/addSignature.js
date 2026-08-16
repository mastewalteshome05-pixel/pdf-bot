const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra');
const path = require('path');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Place a signature image (PNG/JPG, typically with transparent background)
 * onto a chosen page of a PDF at given normalized coordinates.
 * @param {string} pdfPath
 * @param {string} signatureImagePath
 * @param {{ page?: number, x?: number, y?: number, width?: number, height?: number }} options
 *   x, y, width, height are fractions of the page size (0..1), page is 1-indexed.
 */
async function addSignature(pdfPath, signatureImagePath, options = {}) {
  const { page: pageNum = 1, x = 0.65, y = 0.08, width = 0.25, height = 0.1 } = options;

  const pdfBytes = await fs.readFile(pdfPath);
  const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const totalPages = pdf.getPageCount();
  const targetIndex = Math.min(Math.max(pageNum - 1, 0), totalPages - 1);
  const page = pdf.getPage(targetIndex);
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const ext = path.extname(signatureImagePath).toLowerCase();
  const imgBytes = await fs.readFile(signatureImagePath);
  const image = ext === '.png' ? await pdf.embedPng(imgBytes) : await pdf.embedJpg(imgBytes);

  page.drawImage(image, {
    x: x * pageWidth,
    y: y * pageHeight,
    width: width * pageWidth,
    height: height * pageHeight
  });

  const outputPath = makeOutputPath('.pdf');
  await fs.writeFile(outputPath, await pdf.save());
  return outputPath;
}

module.exports = addSignature;
