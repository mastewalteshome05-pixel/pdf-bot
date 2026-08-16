const QRCode = require('qrcode');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Generate a QR code PNG for arbitrary text/URL content.
 * @param {string} content
 * @param {{ size?: number, darkColor?: string, lightColor?: string }} options
 */
async function generateQr(content, options = {}) {
  if (!content) throw new Error('QR content is required.');
  const { size = 400, darkColor = '#000000', lightColor = '#ffffff' } = options;

  const outputPath = makeOutputPath('.png');
  await QRCode.toFile(outputPath, content, {
    width: size,
    color: { dark: darkColor, light: lightColor },
    margin: 2
  });
  return outputPath;
}

module.exports = generateQr;
