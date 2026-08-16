const express = require('express');
const router = express.Router();
const uploadMw = require('../middleware/upload');
const { upload } = require('../config/multer');
const { requireFile, requireFiles, validateBody } = require('../middleware/validate');
const { identify } = require('../middleware/auth');
const { requireChannelMembership } = require('../middleware/channelCheck');
const { requirePremium, requirePro } = require('../middleware/premiumCheck');
const { dailyOperationLimiter } = require('../middleware/rateLimiter');
const pdfController = require('../controllers/pdfController');

router.use(identify);
router.use(requireChannelMembership);
router.use(dailyOperationLimiter);

router.post('/merge', uploadMw.multiple('files', 20), requireFiles(2), pdfController.merge);
router.post('/split', uploadMw.single('file'), requireFile, pdfController.split);
router.post('/compress', uploadMw.single('file'), requireFile, pdfController.compress);
router.post('/rotate', uploadMw.single('file'), requireFile, pdfController.rotate);
router.post('/delete-pages', uploadMw.single('file'), requireFile, validateBody(['pages']), pdfController.removePages);

router.post(
  '/watermark',
  upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'image', maxCount: 1 }]),
  pdfController.watermark
);

router.post('/protect', uploadMw.single('file'), requireFile, validateBody(['password']), pdfController.protect);
router.post('/unlock', uploadMw.single('file'), requireFile, validateBody(['password']), pdfController.unlock);

router.post('/pdf-to-word', requirePremium, uploadMw.single('file'), requireFile, pdfController.toWord);
router.post('/word-to-pdf', requirePremium, uploadMw.single('file'), requireFile, pdfController.wordTo);
router.post('/excel-to-pdf', requirePremium, uploadMw.single('file'), requireFile, pdfController.excelTo);
router.post('/ppt-to-pdf', requirePremium, uploadMw.single('file'), requireFile, pdfController.pptTo);
router.post('/images-to-pdf', uploadMw.multiple('files', 30), requireFiles(1), pdfController.fromImages);

router.post('/extract-text', uploadMw.single('file'), requireFile, pdfController.textExtract);
router.post('/extract-images', uploadMw.single('file'), requireFile, pdfController.imagesExtract);

router.post(
  '/signature',
  upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'signature', maxCount: 1 }]),
  pdfController.signature
);

router.post('/scan', uploadMw.single('file'), requireFile, pdfController.scan);
router.post('/ocr', requirePro, uploadMw.single('file'), requireFile, pdfController.ocr);

module.exports = router;
