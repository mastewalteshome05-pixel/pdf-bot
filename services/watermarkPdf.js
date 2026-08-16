const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const fs = require('fs-extra');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Stamp a diagonal text watermark on every page of a PDF.
 * @param {string} filePath
 * @param {{ text: string, opacity?: number, fontSize?: number, color?: string }} options
 */
async function watermarkPdf(filePath, options = {}) {
  const { text = 'CONFIDENTIAL', opacity = 0.3, fontSize = 48 } = options;
  if (!text || !text.trim()) {
    throw new Error('Watermark text is required.');
  }

  const bytes = await fs.readFile(filePath);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  pdf.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(45)
    });
  });

  const outputPath = makeOutputPath('.pdf');
  await fs.writeFile(outputPath, await pdf.save());
  return outputPath;
}

module.exports = watermarkPdf;
