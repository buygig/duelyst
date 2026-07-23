const OfflineMode = require('./offline_mode');
const Firebase = OfflineMode.isEnabled()
  ? require('../offline/local_firebase')
  : require('firebase');

if (typeof window !== 'undefined') window.Firebase = Firebase;

module.exports = Firebase;
