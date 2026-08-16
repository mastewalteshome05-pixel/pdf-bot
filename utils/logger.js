const fs = require('fs-extra');
const path = require('path');
const appConfig = require('../config/app');

fs.ensureDirSync(appConfig.paths.logs);

const accessLogPath = path.join(appConfig.paths.logs, 'access.log');
const errorLogPath = path.join(appConfig.paths.logs, 'error.log');

function timestamp() {
  return new Date().toISOString();
}

function writeLine(filePath, line) {
  fs.appendFile(filePath, line + '\n', (err) => {
    if (err) console.error('Logger write failed:', err.message);
  });
}

module.exports = {
  info(message, meta = {}) {
    const line = `[${timestamp()}] INFO  ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    console.log(line);
    writeLine(accessLogPath, line);
  },
  error(message, err) {
    const line = `[${timestamp()}] ERROR ${message} ${err && err.stack ? '\n' + err.stack : (err || '')}`;
    console.error(line);
    writeLine(errorLogPath, line);
  },
  warn(message, meta = {}) {
    const line = `[${timestamp()}] WARN  ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    console.warn(line);
    writeLine(accessLogPath, line);
  }
};
