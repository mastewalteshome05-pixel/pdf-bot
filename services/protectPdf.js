const fs = require('fs-extra');
const { execFile } = require('child_process');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Encrypt a PDF with a user password using qpdf (industry-standard, preserves content perfectly).
 * pdf-lib does not support encryption, so this shells out to the `qpdf` CLI.
 * Install: apt-get install qpdf  /  brew install qpdf
 * @param {string} filePath
 * @param {string} password
 */
function protectPdf(filePath, password) {
  return new Promise((resolve, reject) => {
    if (!password || password.length < 4) {
      return reject(new Error('Password must be at least 4 characters.'));
    }
    const outputPath = makeOutputPath('.pdf');
    const args = [
      '--encrypt', password, password, '256',
      '--',
      filePath,
      outputPath
    ];
    execFile('qpdf', args, async (err) => {
      if (err) {
        return reject(
          new Error(
            'PDF protection requires the "qpdf" tool to be installed on the server (apt-get install qpdf).'
          )
        );
      }
      resolve(outputPath);
    });
  });
}

module.exports = protectPdf;
