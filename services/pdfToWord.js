const fs = require('fs-extra');
const { convertWithLibreOffice } = require('./officeConvertBase');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Convert a PDF to an editable Word document (.docx) via LibreOffice.
 * Quality depends on the PDF's structure — scanned PDFs will convert as images,
 * not editable text (run OCR first for those).
 * @param {string} filePath
 */
async function pdfToWord(filePath) {
  const buffer = await convertWithLibreOffice(filePath, 'docx');
  const outputPath = makeOutputPath('.docx');
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

module.exports = pdfToWord;
