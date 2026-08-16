const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Merge an ordered array of PDF file paths into a single PDF.
 * @param {string[]} filePaths
 * @returns {Promise<string>} output file path
 */
async function mergePdf(filePaths) {
  if (!filePaths || filePaths.length < 2) {
    throw new Error('At least 2 PDF files are required to merge.');
  }

  const mergedPdf = await PDFDocument.create();

  for (const filePath of filePaths) {
    const bytes = await fs.readFile(filePath);
    const srcPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  const outputPath = makeOutputPath('.pdf');
  const outBytes = await mergedPdf.save();
  await fs.writeFile(outputPath, outBytes);
  return outputPath;
}

module.exports = mergePdf;
