const fs = require('fs-extra');
const { convertWithLibreOffice } = require('./officeConvertBase');
const { makeOutputPath } = require('../utils/helpers');

/** Convert a PowerPoint deck (.ppt/.pptx) to PDF via LibreOffice. */
async function pptToPdf(filePath) {
  const buffer = await convertWithLibreOffice(filePath, 'pdf');
  const outputPath = makeOutputPath('.pdf');
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

module.exports = pptToPdf;
