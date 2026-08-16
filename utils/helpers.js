const path = require('path');
const { v4: uuidv4 } = require('uuid');
const appConfig = require('../config/app');

/** Build a unique output file path preserving the desired extension. */
function makeOutputPath(ext) {
  const clean = ext.startsWith('.') ? ext : `.${ext}`;
  return path.join(appConfig.paths.uploadsOutput, `${uuidv4()}${clean}`);
}

/** Convert bytes to a human readable string. */
function humanFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

/** Parse a page range string like "1,3,5-8" into a zero-indexed array of page numbers. */
function parsePageRange(rangeStr, totalPages) {
  if (!rangeStr || rangeStr.trim() === '' || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const pages = new Set();
  rangeStr.split(',').forEach((part) => {
    part = part.trim();
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10));
      for (let p = start; p <= end; p++) {
        if (p >= 1 && p <= totalPages) pages.add(p - 1);
      }
    } else {
      const p = parseInt(part, 10);
      if (p >= 1 && p <= totalPages) pages.add(p - 1);
    }
  });
  return Array.from(pages).sort((a, b) => a - b);
}

/** Build the public download URL for a file stored in uploads/output. */
function toDownloadUrl(filePath) {
  const filename = path.basename(filePath);
  return `/api/files/download/${filename}`;
}

module.exports = { makeOutputPath, humanFileSize, parsePageRange, toDownloadUrl };
