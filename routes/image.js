const express = require('express');
const router = express.Router();
const uploadMw = require('../middleware/upload');
const { requireFile } = require('../middleware/validate');
const { identify } = require('../middleware/auth');
const { requireChannelMembership } = require('../middleware/channelCheck');
const { requirePremium } = require('../middleware/premiumCheck');
const { dailyOperationLimiter } = require('../middleware/rateLimiter');
const imageController = require('../controllers/imageController');

router.use(identify);
router.use(requireChannelMembership);
router.use(dailyOperationLimiter);

router.post('/compress', uploadMw.single('file'), requireFile, imageController.compress);
router.post('/remove-background', requirePremium, uploadMw.single('file'), requireFile, imageController.removeBg);
router.post('/qr/generate', imageController.qrGenerate); // no file needed — takes { content } in body

module.exports = router;
