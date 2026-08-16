const fs = require('fs-extra');
const { convertWithLibreOffice } = require('./officeConvertBase');
const { makeOutputPath } = require('../utils/helpers');

/** Convert an Excel spreadsheet (.xls/.xlsx) to PDF via LibreOffice. */
async function excelToPdf(filePath) {
  const buffer = await convertWithLibreOffice(filePath, 'pdf');
  const outputPath = makeOutputPath('.pdf');
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

module.exports = excelToPdf;
