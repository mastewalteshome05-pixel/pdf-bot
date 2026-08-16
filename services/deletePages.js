const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra');
const { makeOutputPath, parsePageRange } = require('../utils/helpers');

/**
 * Delete the given pages from a PDF (1-indexed range string, e.g. "2,4-5").
 * @param {string} filePath
 * @param {string} pagesToDelete
 */
async function deletePages(filePath, pagesToDelete) {
  if (!pagesToDelete) {
    throw new Error('Specify which pages to delete, e.g. "2,4-5".');
  }

  const bytes = await fs.readFile(filePath);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = pdf.getPageCount();

  const deleteIndices = new Set(parsePageRange(pagesToDelete, totalPages));
  if (deleteIndices.size >= totalPages) {
    throw new Error('Cannot delete every page — the result must have at least one page.');
  }

  // Remove from highest index to lowest so indices stay valid as we go.
  const sortedDesc = Array.from(deleteIndices).sort((a, b) => b - a);
  sortedDesc.forEach((idx) => pdf.removePage(idx));

  const outputPath = makeOutputPath('.pdf');
  await fs.writeFile(outputPath, await pdf.save());
  return outputPath;
}

module.exports = deletePages;
