const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Compress/resize a raster image while preserving its format.
 * @param {string} imagePath
 * @param {{ quality?: number, maxWidth?: number }} options
 */
async function compressImage(imagePath, options = {}) {
  const { quality = 75, maxWidth } = options;
  const ext = path.extname(imagePath).toLowerCase();

  let pipeline = sharp(imagePath).rotate();
  if (maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }

  let outExt = ext;
  if (['.jpg', '.jpeg'].includes(ext)) {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  } else if (ext === '.png') {
    pipeline = pipeline.png({ quality, compressionLevel: 9 });
  } else if (ext === '.webp') {
    pipeline = pipeline.webp({ quality });
  } else {
    // Normalize anything unusual (gif/bmp/tiff) to JPEG for reliable, strong compression.
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    outExt = '.jpg';
  }

  const outputPath = makeOutputPath(outExt);
  await pipeline.toFile(outputPath);
  return outputPath;
}

module.exports = compressImage;
