const express = require('express');
const router = express.Router();
const uploadMw = require('../middleware/upload');
const { requireFile } = require('../middleware/validate');
const uploadController = require('../controllers/uploadController');

// Generic single/multi upload endpoints — handy for a client-side preview step
// before the user picks which tool to run.
router.post('/single', uploadMw.single('file'), requireFile, uploadController.uploadSingle);
router.post('/multiple', uploadMw.multiple('files', 20), uploadController.uploadMultiple);

module.exports = router;
