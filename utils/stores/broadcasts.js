const crypto = require('crypto');
const { createStore } = require('../jsonStore');

const store = createStore('broadcasts.json', []);

function recordBroadcast(entry) {
  const broadcasts = store.read();
  const record = {
    broadcastId: `BRC${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    date: new Date().toISOString(),
    ...entry
  };
  broadcasts.unshift(record);
  store.write(broadcasts);
  return record;
}

function listBroadcasts() {
  return store.read();
}

module.exports = { recordBroadcast, listBroadcasts };
