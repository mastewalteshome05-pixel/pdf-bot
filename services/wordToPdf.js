const fs = require('fs-extra');
const { convertWithLibreOffice } = require('./officeConvertBase');
const { makeOutputPath } = require('../utils/helpers');

/** Convert a Word document (.doc/.docx) to PDF via LibreOffice. */
async function wordToPdf(filePath) {
  const buffer = await convertWithLibreOffice(filePath, 'pdf');
  const outputPath = makeOutputPath('.pdf');
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

module.exports = wordToPdf;
