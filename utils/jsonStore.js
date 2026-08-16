const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Opens (creating if needed) a JSON file under /data as a tiny store.
 * Each of the six domain stores (users, payments, subscriptions, settings,
 * channels, usage) wraps one of these instead of sharing one big db.json —
 * keeps each concern in its own file, on disk, exactly as named.
 */
function createStore(filename, defaultValue) {
  const filePath = path.join(DATA_DIR, filename);
  fs.ensureFileSync(filePath);
  if (fs.readFileSync(filePath, 'utf-8').trim() === '') {
    fs.writeJsonSync(filePath, defaultValue, { spaces: 2 });
  }

  return {
    read() {
      try {
        return fs.readJsonSync(filePath);
      } catch {
        return defaultValue;
      }
    },
    write(data) {
      fs.writeJsonSync(filePath, data, { spaces: 2 });
    }
  };
}

module.exports = { createStore };
