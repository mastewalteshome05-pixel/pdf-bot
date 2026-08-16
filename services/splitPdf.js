const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra');
const archiver = require('archiver');
const { makeOutputPath, parsePageRange } = require('../utils/helpers');

/**
 * Split a PDF. If `ranges` is provided (e.g. "1-3,5"), produces ONE pdf with just those pages.
 * If `mode` is 'each', produces a ZIP with every page as its own PDF file.
 * @param {string} filePath
 * @param {{ mode?: 'range'|'each', ranges?: string }} options
 * @returns {Promise<string>} output file path (.pdf or .zip)
 */
async function splitPdf(filePath, options = {}) {
  const bytes = await fs.readFile(filePath);
  const srcPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = srcPdf.getPageCount();

  if (options.mode === 'each') {
    const zipPath = makeOutputPath('.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    const finished = new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
    });
    archive.pipe(output);

    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(srcPdf, [i]);
      newPdf.addPage(copiedPage);
      const pageBytes = await newPdf.save();
      archive.append(Buffer.from(pageBytes), { name: `page-${i + 1}.pdf` });
    }

    await archive.finalize();
    await finished;
    return zipPath;
  }

  // Default: extract a specific page range into one PDF
  const pageIndices = parsePageRange(options.ranges, totalPages);
  if (pageIndices.length === 0) {
    throw new Error('No valid pages selected for the given range.');
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
  copiedPages.forEach((p) => newPdf.addPage(p));

  const outputPath = makeOutputPath('.pdf');
  await fs.writeFile(outputPath, await newPdf.save());
  return outputPath;
}

module.exports = splitPdf;
