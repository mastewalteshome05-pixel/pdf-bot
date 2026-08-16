const { createStore } = require('../jsonStore');

const store = createStore('users.json', []);

function getUser(telegramId) {
  if (!telegramId) return null;
  return store.read().find((u) => String(u.telegramId) === String(telegramId)) || null;
}

/** Creates the user on first sight (join), otherwise merges the patch in. */
function upsertUser(telegramId, patch) {
  const users = store.read();
  const idx = users.findIndex((u) => String(u.telegramId) === String(telegramId));

  if (idx === -1) {
    const user = {
      telegramId: String(telegramId),
      username: '',
      firstName: '',
      lastName: '',
      languageCode: 'en',
      joinDate: new Date().toISOString(),
      status: 'active', // active | banned
      isAdmin: false,
      settings: {},
      ...patch
    };
    users.push(user);
    store.write(users);
    return user;
  }

  users[idx] = { ...users[idx], ...patch, telegramId: String(telegramId) };
  store.write(users);
  return users[idx];
}

function listUsers() {
  return store.read();
}

function setStatus(telegramId, status) {
  return upsertUser(telegramId, { status });
}

module.exports = { getUser, upsertUser, listUsers, setStatus };
