const Firebase = require('../offline/local_firebase');

if (typeof window !== 'undefined') window.Firebase = Firebase;

module.exports = Firebase;
