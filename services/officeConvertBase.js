const fs = require('fs-extra');
const libre = require('libreoffice-convert');
const util = require('util');
const appConfig = require('../config/app');

libre.convertAsync = util.promisify(libre.convert);

/**
 * Convert a file to a target format using LibreOffice headless mode.
 * REQUIRES LibreOffice to be installed on the host machine:
 *   Ubuntu/Debian: sudo apt-get install libreoffice
 *   Docker: use an image with libreoffice, or apt-get install it in your Dockerfile
 * This one binary + this one wrapper powers: PDF→Word, Word→PDF, Excel→PDF, PowerPoint→PDF.
 *
 * @param {string} inputPath
 * @param {string} targetExt - e.g. 'pdf', 'docx'
 * @returns {Promise<Buffer>}
 */
async function convertWithLibreOffice(inputPath, targetExt) {
  const inputBuffer = await fs.readFile(inputPath);
  try {
    const outputBuffer = await libre.convertAsync(inputBuffer, targetExt, undefined);
    return outputBuffer;
  } catch (err) {
    throw new Error(
      `Conversion failed — this feature requires LibreOffice installed on the server ` +
      `(binary: "${appConfig.libreOfficeBin}"). Original error: ${err.message}`
    );
  }
}

module.exports = { convertWithLibreOffice };
