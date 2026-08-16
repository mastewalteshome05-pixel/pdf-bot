const fs = require('fs-extra');
const path = require('path');
// Legacy build = the Node-compatible entry point (no DOM/worker assumptions).
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { makeOutputPath } = require('../utils/helpers');

// Ships inside the pdfjs-dist package itself — pointing at it avoids network
// fetches for standard font metrics and the "must be specified" warning/failure.
const STANDARD_FONT_DATA_URL = path.join(
  path.dirname(require.resolve('pdfjs-dist/package.json')),
  'standard_fonts'
) + path.sep;

/**
 * Extract plain text from a PDF and save it as a .txt file.
 *
 * Uses pdfjs-dist directly rather than the popular `pdf-parse` package:
 * pdf-parse bundles a pinned, years-old pdf.js build that (a) can't read
 * PDFs saved with cross-reference *object streams* — which is pdf-lib's
 * default output, so it reliably chokes on files produced by our own
 * Merge/Split/Rotate/etc — and (b) mutates its input buffer while
 * parsing, which breaks any retry-with-fallback logic built around it.
 * pdfjs-dist has neither problem.
 *
 * @param {string} filePath
 * @returns {Promise<{ text: string, outputPath: string, pages: number }>}
 */
async function extractText(filePath) {
  const dataBuffer = await fs.readFile(filePath);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(dataBuffer),
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    isEvalSupported: false
  });
  const doc = await loadingTask.promise;

  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n\n';
  }
  await doc.destroy();

  const outputPath = makeOutputPath('.txt');
  await fs.writeFile(outputPath, text, 'utf-8');

  return { text, outputPath, pages: doc.numPages };
}

module.exports = extractText;
