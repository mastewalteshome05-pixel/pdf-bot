const { createStore } = require('../jsonStore');

const DEFAULTS = {
  forceJoin: false,
  requiredChannels: []
};

const store = createStore('channels.json', DEFAULTS);

function getChannels() {
  const current = store.read();
  return { ...DEFAULTS, ...current, forceJoin: false, requiredChannels: [] };
}

function setChannels() {
  const merged = { ...DEFAULTS };
  store.write(merged);
  return merged;
}

module.exports = { getChannels, setChannels };
