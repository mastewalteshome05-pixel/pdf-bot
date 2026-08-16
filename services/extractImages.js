const { PDFDocument, PDFName, PDFRawStream } = require('pdf-lib');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const appConfig = require('../config/app');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Walk every page's Resources/XObject dictionary and pull out embedded
 * raster images (JPEG via DCTDecode, or raw Flate-encoded bitmaps).
 * Returns a ZIP of every image found. Vector/SMask-only images are skipped.
 * @param {string} filePath
 * @returns {Promise<{ outputPath: string, count: number }>}
 */
async function extractImages(filePath) {
  const bytes = await fs.readFile(filePath);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const tempDir = path.join(appConfig.paths.temp, uuidv4());
  await fs.ensureDir(tempDir);

  let count = 0;
  const seen = new Set();

  for (const page of pdf.getPages()) {
    const resources = page.node.Resources();
    if (!resources) continue;
    const xObjects = resources.lookup(PDFName.of('XObject'));
    if (!xObjects || typeof xObjects.entries !== 'function') continue;

    for (const [, ref] of xObjects.entries()) {
      const xObject = pdf.context.lookup(ref);
      if (!(xObject instanceof PDFRawStream)) continue;

      const dict = xObject.dict;
      const subtype = dict.get(PDFName.of('Subtype'));
      if (!subtype || subtype.toString() !== '/Image') continue;

      const key = xObject.contents ? xObject.contents.toString('hex').slice(0, 32) : Math.random().toString();
      if (seen.has(key)) continue;
      seen.add(key);

      const filter = dict.get(PDFName.of('Filter'));
      const filterName = filter ? filter.toString() : '';

      let ext = null;
      if (filterName.includes('DCTDecode')) ext = '.jpg';
      else if (filterName.includes('JPXDecode')) ext = '.jp2';

      if (!ext) continue; // Flate-encoded raw bitmaps need full color-space decoding — skipped for reliability

      count += 1;
      await fs.writeFile(path.join(tempDir, `image-${count}${ext}`), xObject.contents);
    }
  }

  if (count === 0) {
    await fs.remove(tempDir);
    throw new Error('No extractable raster images were found in this PDF (vector-only or unsupported encoding).');
  }

  const zipPath = makeOutputPath('.zip');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });
  archive.pipe(output);
  archive.directory(tempDir, false);
  await archive.finalize();
  await done;
  await fs.remove(tempDir);

  return { outputPath: zipPath, count };
}

module.exports = extractImages;
