const { execFile } = require('child_process');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Decrypt/unlock a password-protected PDF, given the correct password.
 * Uses qpdf CLI (see protectPdf.js for install notes).
 * @param {string} filePath
 * @param {string} password - the current password on the file
 */
function unlockPdf(filePath, password) {
  return new Promise((resolve, reject) => {
    if (!password) {
      return reject(new Error('The current password is required to unlock this PDF.'));
    }
    const outputPath = makeOutputPath('.pdf');
    const args = [`--password=${password}`, '--decrypt', filePath, outputPath];

    execFile('qpdf', args, async (err) => {
      if (err) {
        if (err.message && err.message.toLowerCase().includes('invalid password')) {
          return reject(new Error('Incorrect password.'));
        }
        return reject(
          new Error(
            'PDF unlocking requires the "qpdf" tool to be installed on the server (apt-get install qpdf).'
          )
        );
      }
      resolve(outputPath);
    });
  });
}

module.exports = unlockPdf;
