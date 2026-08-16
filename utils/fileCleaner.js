const fs = require('fs-extra');
const path = require('path');
const appConfig = require('../config/app');
const logger = require('./logger');

const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

async function cleanDir(dir) {
  try {
    const entries = await fs.readdir(dir);
    const now = Date.now();
    for (const entry of entries) {
      if (entry === '.gitkeep') continue;
      const fullPath = path.join(dir, entry);
      const stat = await fs.stat(fullPath).catch(() => null);
      if (stat && now - stat.mtimeMs > MAX_AGE_MS) {
        await fs.remove(fullPath);
        logger.info('Cleaned stale file', { file: fullPath });
      }
    }
  } catch (err) {
    logger.error(`fileCleaner: failed cleaning ${dir}`, err);
  }
}

function startCleanupSchedule() {
  const run = () => {
    cleanDir(appConfig.paths.uploadsInput);
    cleanDir(appConfig.paths.uploadsOutput);
    cleanDir(appConfig.paths.temp);
  };
  run();
  setInterval(run, 30 * 60 * 1000); // every 30 min
}

module.exports = { startCleanupSchedule, cleanDir };
