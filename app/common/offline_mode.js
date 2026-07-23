const TOKEN = 'offline-local-v1';
const USER_ID = 'local-player';
const USERNAME = 'Local Player';

function getUsername() {
  try {
    const key = 'common.offline_player_name';
    const translated = require('i18next').t(key, { defaultValue: USERNAME });
    return translated && translated !== key ? translated : USERNAME;
  } catch (e) {
    return USERNAME;
  }
}

function isEnabled() {
  const value = process.env.OFFLINE_MODE;
  return value === '1' || String(value).toLowerCase() === 'true';
}

module.exports = {
  isEnabled,
  TOKEN,
  USER_ID,
  USERNAME,
  getUsername,
};
