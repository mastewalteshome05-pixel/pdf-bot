const appConfig = require('../config/app');

const MEMBER_STATUSES = new Set(['creator', 'administrator', 'member']);

function normalizeChannel(channel) {
  if (channel === null || channel === undefined) return '';
  let value = String(channel).trim();
  if (!value) return '';

  value = value.replace(/^https?:\/\/(?:www\.)?t\.me\//i, '');
  value = value.split(/[?#/]/)[0].trim();
  if (!value) return '';
  if (/^-?\d+$/.test(value)) return value;
  return `@${value.replace(/^@+/, '')}`;
}

function normalizeChannels(channels = []) {
  return Array.from(new Set(
    (Array.isArray(channels) ? channels : [])
      .map(normalizeChannel)
      .filter(Boolean)
  ));
}

function isAdmin(telegramId) {
  return Boolean(telegramId) && appConfig.admins.includes(String(telegramId));
}

function isJoinedMember(member) {
  if (!member) return false;
  if (MEMBER_STATUSES.has(member.status)) return true;
  if (member.status === 'restricted') return member.is_member !== false;
  return false;
}

function joinUrl(channel) {
  const normalized = normalizeChannel(channel);
  if (!normalized) return '';
  if (/^-?\d+$/.test(normalized)) return '';
  return `https://t.me/${normalized.replace(/^@/, '')}`;
}

async function checkRequiredChannels() {
  return {
    enabled: false,
    bypassed: true,
    needsJoin: false,
    missingChannels: [],
    unavailableChannels: [],
    requiredChannels: []
  };
}

function getJoinLinks() {
  return [];
}

module.exports = {
  normalizeChannel,
  normalizeChannels,
  isAdmin,
  isJoinedMember,
  joinUrl,
  getJoinLinks,
  checkRequiredChannels
};
