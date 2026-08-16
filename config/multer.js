const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const appConfig = require('./app');

fs.ensureDirSync(appConfig.paths.uploadsInput);

const ALLOWED_EXT = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, appConfig.paths.uploadsInput),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(new Error(`Unsupported file type: ${ext}`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: appConfig.maxFileSizeMb * 1024 * 1024,
    files: 20
  }
});

module.exports = { upload, ALLOWED_EXT };
