const version = require('../version.json').version;

function readCommandLineEnvironment() {
  const args = typeof process !== 'undefined' && Array.isArray(process.argv)
    ? process.argv.slice(2)
    : [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--env' && args[index + 1]) return args[index + 1];
    if (arg.startsWith('--env=')) return arg.slice('--env='.length);
  }

  return (typeof process !== 'undefined' && process.env && process.env.NODE_ENV)
    || 'development';
}

const values = {
  env: readCommandLineEnvironment(),
  offlineMode: true,
  api: 'offline://local',
  firebase: {
    url: 'offline://local',
  },
  allCardsAvailable: true,
  datGuiEditorEnabled: false,
  aiToolsEnabled: false,
  recordClientLogs: false,
  inviteCodesActive: false,
  recaptcha: {
    enabled: false,
    siteKey: '',
  },
  bugsnag: {
    web_key: '',
    desktop_key: '',
  },
};

function readPath(path) {
  return String(path).split('.').reduce(
    (current, key) => (current == null ? undefined : current[key]),
    values,
  );
}

function writePath(path, value) {
  const keys = String(path).split('.');
  const finalKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (current[key] == null || typeof current[key] !== 'object') current[key] = {};
    return current[key];
  }, values);
  target[finalKey] = value;
}

const config = {
  get: readPath,
  set: writePath,
  version,
  isProduction() {
    return values.env === 'production' || values.env === 'staging';
  },
  isStaging() {
    return values.env === 'staging';
  },
  isDevelopment() {
    return !this.isProduction();
  },
};

if (typeof process !== 'undefined' && process.env) {
  process.env.ALL_CARDS_AVAILABLE = 'true';
  process.env.AI_TOOLS_ENABLED = 'false';
}

console.log(`CONFIG: version:${version}`);
console.log(`CONFIG: env:${values.env}`);
console.log('CONFIG: mode:offline');

module.exports = config;
