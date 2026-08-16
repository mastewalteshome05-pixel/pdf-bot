const fs = require('fs-extra');
const path = require('path');
const { success, fail } = require('../utils/response');
const { toDownloadUrl, humanFileSize } = require('../utils/helpers');
const logger = require('../utils/logger');

const mergePdf = require('../services/mergePdf');
const splitPdf = require('../services/splitPdf');
const compressPdf = require('../services/compressPdf');
const rotatePdf = require('../services/rotatePdf');
const deletePages = require('../services/deletePages');
const watermarkPdf = require('../services/watermarkPdf');
const protectPdf = require('../services/protectPdf');
const unlockPdf = require('../services/unlockPdf');
const pdfToWord = require('../services/pdfToWord');
const wordToPdf = require('../services/wordToPdf');
const excelToPdf = require('../services/excelToPdf');
const pptToPdf = require('../services/pptToPdf');
const imageToPdf = require('../services/imageToPdf');
const extractText = require('../services/extractText');
const extractImages = require('../services/extractImages');
const addSignature = require('../services/addSignature');
const scanDocument = require('../services/scanDocument');
const ocrImage = require('../services/ocr');

/** Wraps a handler so any thrown/rejected error reaches the errorHandler middleware. */
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Cleans up uploaded input files after a job finishes (success or failure), fire-and-forget. */
function cleanupInputs(files) {
  (files || []).forEach((f) => fs.remove(f).catch(() => {}));
}

async function respondWithFile(res, outputPath, message) {
  const stat = await fs.stat(outputPath);
  return success(res, {
    downloadUrl: toDownloadUrl(outputPath),
    filename: path.basename(outputPath),
    size: humanFileSize(stat.size)
  }, message);
}

const merge = asyncRoute(async (req, res) => {
  const filePaths = req.files.map((f) => f.path);
  const outputPath = await mergePdf(filePaths);
  cleanupInputs(filePaths);
  return respondWithFile(res, outputPath, 'PDFs merged successfully.');
});

const split = asyncRoute(async (req, res) => {
  const { mode, ranges } = req.body;
  const outputPath = await splitPdf(req.file.path, { mode, ranges });
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'PDF split successfully.');
});

const compress = asyncRoute(async (req, res) => {
  const { quality } = req.body;
  const result = await compressPdf(req.file.path, { quality });
  cleanupInputs([req.file.path]);
  return respondWithFile(
    res,
    result.path,
    result.usedGhostscript ? 'PDF compressed successfully.' : 'PDF optimized (install Ghostscript for stronger compression).'
  );
});

const rotate = asyncRoute(async (req, res) => {
  const angle = parseInt(req.body.angle, 10) || 90;
  const outputPath = await rotatePdf(req.file.path, { angle, pages: req.body.pages });
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'PDF rotated successfully.');
});

const removePages = asyncRoute(async (req, res) => {
  const outputPath = await deletePages(req.file.path, req.body.pages);
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'Pages deleted successfully.');
});

const watermark = asyncRoute(async (req, res) => {
  const { text, opacity, fontSize } = req.body;
  const imagePath = req.files && req.files.image ? req.files.image[0].path : undefined;
  const pdfFile = req.files && req.files.pdf ? req.files.pdf[0].path : req.file.path;
  const outputPath = await watermarkPdf(pdfFile, {
    text,
    imagePath,
    opacity: opacity ? parseFloat(opacity) : undefined,
    fontSize: fontSize ? parseInt(fontSize, 10) : undefined
  });
  cleanupInputs([pdfFile, imagePath]);
  return respondWithFile(res, outputPath, 'Watermark added successfully.');
});

const protect = asyncRoute(async (req, res) => {
  const outputPath = await protectPdf(req.file.path, req.body.password);
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'PDF protected successfully.');
});

const unlock = asyncRoute(async (req, res) => {
  const outputPath = await unlockPdf(req.file.path, req.body.password);
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'PDF unlocked successfully.');
});

const toWord = asyncRoute(async (req, res) => {
  const outputPath = await pdfToWord(req.file.path);
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'Converted to Word successfully.');
});

const wordTo = asyncRoute(async (req, res) => {
  const outputPath = await wordToPdf(req.file.path);
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'Converted to PDF successfully.');
});

const excelTo = asyncRoute(async (req, res) => {
  const outputPath = await excelToPdf(req.file.path);
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'Converted to PDF successfully.');
});

const pptTo = asyncRoute(async (req, res) => {
  const outputPath = await pptToPdf(req.file.path);
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'Converted to PDF successfully.');
});

const fromImages = asyncRoute(async (req, res) => {
  const filePaths = req.files.map((f) => f.path);
  const outputPath = await imageToPdf(filePaths);
  cleanupInputs(filePaths);
  return respondWithFile(res, outputPath, 'Images converted to PDF successfully.');
});

const textExtract = asyncRoute(async (req, res) => {
  const result = await extractText(req.file.path);
  cleanupInputs([req.file.path]);
  return success(res, {
    downloadUrl: toDownloadUrl(result.outputPath),
    filename: path.basename(result.outputPath),
    pages: result.pages,
    preview: result.text.slice(0, 2000)
  }, 'Text extracted successfully.');
});

const imagesExtract = asyncRoute(async (req, res) => {
  const result = await extractImages(req.file.path);
  cleanupInputs([req.file.path]);
  return success(res, {
    downloadUrl: toDownloadUrl(result.outputPath),
    filename: path.basename(result.outputPath),
    count: result.count
  }, `${result.count} image(s) extracted successfully.`);
});

const signature = asyncRoute(async (req, res) => {
  const pdfFile = req.files.pdf[0].path;
  const sigFile = req.files.signature[0].path;
  const { page, x, y, width, height } = req.body;
  const outputPath = await addSignature(pdfFile, sigFile, {
    page: page ? parseInt(page, 10) : undefined,
    x: x ? parseFloat(x) : undefined,
    y: y ? parseFloat(y) : undefined,
    width: width ? parseFloat(width) : undefined,
    height: height ? parseFloat(height) : undefined
  });
  cleanupInputs([pdfFile, sigFile]);
  return respondWithFile(res, outputPath, 'Signature added successfully.');
});

const scan = asyncRoute(async (req, res) => {
  const outputPath = await scanDocument(req.file.path, { mode: req.body.mode });
  cleanupInputs([req.file.path]);
  return respondWithFile(res, outputPath, 'Document scanned successfully.');
});

const ocr = asyncRoute(async (req, res) => {
  const result = await ocrImage(req.file.path, { lang: req.body.lang });
  cleanupInputs([req.file.path]);
  return success(res, {
    downloadUrl: toDownloadUrl(result.outputPath),
    filename: path.basename(result.outputPath),
    confidence: result.confidence,
    preview: result.text.slice(0, 2000)
  }, 'OCR completed successfully.');
});

module.exports = {
  merge, split, compress, rotate, removePages, watermark, protect, unlock,
  toWord, wordTo, excelTo, pptTo, fromImages, textExtract, imagesExtract,
  signature, scan, ocr
};
