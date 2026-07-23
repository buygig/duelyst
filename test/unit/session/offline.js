const path = require('path');

require('app-module-path').addPath(path.join(__dirname, '../../../'));
require('coffeescript/register');

const assert = require('power-assert');
const OfflineMode = require('../../../app/common/offline_mode');
const Storage = require('../../../app/common/storage');
const Session = require('../../../app/common/session2.coffee');

describe('offline session', () => {
  let previousOfflineMode;
  let session;

  beforeEach(() => {
    previousOfflineMode = process.env.OFFLINE_MODE;
    process.env.OFFLINE_MODE = 'true';
    Storage.remove('token');
    session = Session.create({
      url: 'offline://network-must-not-be-used',
      fbUrl: 'offline://firebase-must-not-be-used',
    });
  });

  afterEach(() => {
    session.removeAllListeners();
    Storage.remove('token');
    if (previousOfflineMode == null) {
      delete process.env.OFFLINE_MODE;
    } else {
      process.env.OFFLINE_MODE = previousOfflineMode;
    }
  });

  it('recognizes the supported flag values and exposes stable identity constants', () => {
    assert.equal(OfflineMode.isEnabled(), true);
    process.env.OFFLINE_MODE = '1';
    assert.equal(OfflineMode.isEnabled(), true);
    process.env.OFFLINE_MODE = 'false';
    assert.equal(OfflineMode.isEnabled(), false);
    assert.equal(OfflineMode.TOKEN, 'offline-local-v1');
    assert.equal(OfflineMode.USER_ID, 'local-player');
    assert.equal(OfflineMode.USERNAME, 'Local Player');
  });

  it('creates and persists the local player when authenticating without a token', async () => {
    let loginData;
    session.once('login', (data) => { loginData = data; });
    session._authFirebase = () => { throw new Error('Firebase must not be used offline'); };

    const authenticated = await session.isAuthenticated(null);

    assert.equal(authenticated, true);
    assert.equal(session.token, OfflineMode.TOKEN);
    assert.equal(session.userId, OfflineMode.USER_ID);
    assert.equal(session.username, OfflineMode.USERNAME);
    assert.equal(Storage.get('token'), OfflineMode.TOKEN);
    assert.deepEqual(loginData, {
      token: OfflineMode.TOKEN,
      userId: OfflineMode.USER_ID,
      analyticsData: {},
    });
  });

  it('reuses the local identity for login and token refresh, then logs out locally', async () => {
    const loginData = await session.login('ignored', 'ignored');
    assert.equal(loginData.token, OfflineMode.TOKEN);
    assert.equal(loginData.userId, OfflineMode.USER_ID);

    session.token = null;
    session.userId = null;
    const refreshed = await session.refreshToken(true);
    assert.equal(refreshed, true);
    assert.equal(session.token, OfflineMode.TOKEN);
    assert.equal(session.userId, OfflineMode.USER_ID);

    let loggedOut = false;
    session.once('logout', () => { loggedOut = true; });
    session.logout();
    assert.equal(loggedOut, true);
    assert.equal(session.fbRef, null);
    assert.equal(session.token, null);
    assert.equal(session.userId, null);
    assert.equal(session.username, null);
  });
});
