const path = require('path');

require('app-module-path').addPath(path.join(__dirname, '../../../'));

const assert = require('power-assert');
const Module = require('module');
const underscore = require('underscore');
const Backbone = require('backbone');
const Storage = require('../../../app/common/storage');

function createDeferred() {
  let state = 'pending';
  let settledArgs;
  const doneCallbacks = [];
  const failCallbacks = [];
  const alwaysCallbacks = [];

  function addCallback(callbacks, callback, expectedState) {
    if (typeof callback !== 'function') return promise;
    if (state === expectedState) callback(...settledArgs);
    else if (state === 'pending') callbacks.push(callback);
    return promise;
  }

  function settle(nextState, callbacks, args) {
    if (state !== 'pending') return deferred;
    state = nextState;
    settledArgs = args;
    callbacks.slice().forEach((callback) => callback(...args));
    alwaysCallbacks.slice().forEach((callback) => callback(...args));
    return deferred;
  }

  const promise = {
    done(callback) { return addCallback(doneCallbacks, callback, 'resolved'); },
    fail(callback) { return addCallback(failCallbacks, callback, 'rejected'); },
    always(callback) {
      if (state === 'pending') alwaysCallbacks.push(callback);
      else if (typeof callback === 'function') callback(...settledArgs);
      return promise;
    },
    then(onResolved, onRejected) {
      promise.done(onResolved);
      promise.fail(onRejected);
      return promise;
    },
    state() { return state; },
  };

  const deferred = {
    resolve(...args) { return settle('resolved', doneCallbacks, args); },
    reject(...args) { return settle('rejected', failCallbacks, args); },
    promise() { return promise; },
  };
  return deferred;
}

function createJqueryStub(onNetworkAttempt) {
  return {
    Deferred: createDeferred,
    extend(...args) {
      return Object.assign(...args);
    },
    ajax: onNetworkAttempt,
  };
}

function waitForRequest(request) {
  return new Promise((resolve, reject) => {
    request.done((response) => resolve(response));
    request.fail((xhr, status, error) => reject(error || new Error(status)));
  });
}

describe('offline local API', () => {
  const previousOfflineMode = process.env.OFFLINE_MODE;
  const previousBackbone = global.Backbone;
  const previousDollar = global.$;
  const previousUnderscore = global._;
  const previousWindow = global.window;
  const originalBackboneSync = Backbone.sync;
  const originalBackboneOldSync = Backbone.oldSync;
  const originalBackboneDollar = Backbone.$;
  const originalBackboneFirebase = Backbone.Firebase;
  const originalBackboneDuelyst = Backbone.Duelyst;
  let networkAttempts = 0;
  let LocalApi;
  let DuelystBackbone;

  before(() => {
    process.env.OFFLINE_MODE = 'true';
    global._ = underscore;
    global.Backbone = Backbone;
    global.window = { _: underscore, Backbone };
    global.$ = createJqueryStub(() => {
      networkAttempts += 1;
      throw new Error('A real network adapter was called');
    });
    Backbone.$ = global.$;

    require('backfire');
    DuelystBackbone = require('../../../app/ui/extensions/duelyst_backbone');
    LocalApi = require('../../../app/offline/local_api');
    LocalApi.install();
  });

  beforeEach(() => {
    networkAttempts = 0;
    LocalApi._resetForTests();
  });

  after(() => {
    Backbone.sync = originalBackboneSync;
    if (originalBackboneOldSync == null) delete Backbone.oldSync;
    else Backbone.oldSync = originalBackboneOldSync;
    Backbone.$ = originalBackboneDollar;
    if (originalBackboneFirebase == null) delete Backbone.Firebase;
    else Backbone.Firebase = originalBackboneFirebase;
    if (originalBackboneDuelyst == null) delete Backbone.Duelyst;
    else Backbone.Duelyst = originalBackboneDuelyst;
    global.Backbone = previousBackbone;
    global.$ = previousDollar;
    global._ = previousUnderscore;
    global.window = previousWindow;
    if (previousOfflineMode == null) delete process.env.OFFLINE_MODE;
    else process.env.OFFLINE_MODE = previousOfflineMode;
    delete require.cache[require.resolve('backfire')];
    delete require.cache[require.resolve('../../../app/common/firebase')];
    delete require.cache[require.resolve('../../../app/offline/local_api')];
    delete require.cache[require.resolve('../../../app/ui/extensions/duelyst_backbone')];
  });

  it('selects the local Firebase implementation without loading the live SDK', () => {
    const firebaseModulePath = require.resolve('../../../app/common/firebase');
    const originalLoad = Module._load;
    let loadedLiveFirebase = false;
    delete require.cache[firebaseModulePath];
    Module._load = (request, ...args) => {
      if (request === 'firebase') {
        loadedLiveFirebase = true;
        throw new Error('Live Firebase must not load in offline mode');
      }
      return originalLoad(request, ...args);
    };

    let selectedFirebase;
    try {
      selectedFirebase = require('../../../app/common/firebase');
    } finally {
      Module._load = originalLoad;
    }

    assert.equal(loadedLiveFirebase, false);
    assert.equal(selectedFirebase, require('../../../app/offline/local_firebase'));
  });

  it('supports deck CRUD through jqXHR-compatible Deferred requests', async () => {
    const LocalDeck = Backbone.Model.extend({
      urlRoot: '/api/me/decks',
    });
    const LocalDecks = DuelystBackbone.Collection.extend({
      model: LocalDeck,
      url: '/api/me/decks',
    });
    const decks = new LocalDecks();
    const initialFetch = decks.fetch();
    assert.equal(typeof initialFetch.done, 'function');
    assert.equal(typeof initialFetch.fail, 'function');
    await decks.onSyncOrReady();
    assert.equal(decks.isSynced, true);
    assert.equal(decks.length, 0);

    const deck = new LocalDeck({ name: 'Local One', cards: [{ id: 1 }, { id: 2 }] });
    decks.add(deck);
    let requestEvent = false;
    deck.once('request', (model, xhr) => {
      requestEvent = model === deck && typeof xhr.fail === 'function';
    });
    const createRequest = deck.save();
    assert.equal(typeof createRequest.fail, 'function');
    await waitForRequest(createRequest);
    assert.equal(requestEvent, true);
    assert(/^local-deck-/.test(deck.id));
    assert(deck.get('created_at') > 0);
    assert(deck.get('updated_at') > 0);
    assert.deepEqual(Storage.get('offline-decks-v1')[0].cards, [{ id: 1 }, { id: 2 }]);

    const reloaded = new LocalDeck({ id: deck.id });
    await waitForRequest(reloaded.fetch());
    assert.equal(reloaded.get('name'), 'Local One');
    assert.deepEqual(reloaded.get('cards'), [{ id: 1 }, { id: 2 }]);

    reloaded.set('name', 'Local Two');
    await waitForRequest(reloaded.save());
    const refreshedDecks = new LocalDecks();
    await waitForRequest(refreshedDecks.fetch());
    assert.equal(refreshedDecks.length, 1);
    assert.equal(refreshedDecks.at(0).get('name'), 'Local Two');

    await waitForRequest(reloaded.destroy());
    const afterDelete = new LocalDecks();
    await waitForRequest(afterDelete.fetch());
    assert.equal(afterDelete.length, 0);
    assert.equal(networkAttempts, 0);
  });

  it('persists gated challenge attempts and completions with response.challenge', async () => {
    const attemptedAt = 10101;
    const completedAt = 20202;
    const attempted = await waitForRequest(global.$.ajax({
      url: '/api/me/challenges/gated/tutorial-1/last_attempted_at',
      type: 'PUT',
      data: JSON.stringify({ last_attempted_at: attemptedAt }),
    }));
    assert.deepEqual(attempted, {
      challenge: { challenge_id: 'tutorial-1', last_attempted_at: attemptedAt },
    });

    const completed = await waitForRequest(global.$.ajax({
      url: '/api/me/challenges/gated/tutorial-1/completed_at',
      type: 'PUT',
      data: JSON.stringify({ completed_at: completedAt }),
    }));
    assert.equal(completed.challenge.challenge_id, 'tutorial-1');
    assert.equal(completed.challenge.last_attempted_at, attemptedAt);
    assert.equal(completed.challenge.completed_at, completedAt);
    assert.deepEqual(completed.challenge.reward_ids, []);
    assert.equal(Storage.get('offline-challenges-v1')[0].challenge_id, 'tutorial-1');

    const Challenge = Backbone.Model.extend({ idAttribute: 'challenge_id' });
    const Challenges = DuelystBackbone.Collection.extend({
      model: Challenge,
      url: '/api/me/challenges/gated',
    });
    const challenges = new Challenges();
    await waitForRequest(challenges.fetch());
    await challenges.onSyncOrReady();
    assert.equal(challenges.isSynced, true);
    assert.equal(challenges.length, 1);
    assert.equal(challenges.get('tutorial-1').get('completed_at'), completedAt);
    assert.equal(networkAttempts, 0);
  });

  it('intercepts unknown ajax URLs and preserves abort/fail semantics', async () => {
    const request = global.$.ajax('https://network.invalid/not-an-api-route');
    let failedWithAbort = false;
    request.fail((xhr, status) => { failedWithAbort = xhr === request && status === 'abort'; });
    request.abort();
    await new Promise((resolve) => { setTimeout(resolve, 5); });
    assert.equal(failedWithAbort, true);
    assert.equal(request.status, 0);
    assert.equal(networkAttempts, 0);
  });

  it('rejects unknown ajax routes with an explicit unsupported error', async () => {
    const request = global.$.ajax({
      url: '/api/me/shop/products',
      type: 'GET',
    });
    const rejection = await new Promise((resolve) => {
      request.fail((xhr, status, error) => resolve({ xhr, status, error }));
    });

    assert.equal(rejection.xhr, request);
    assert.equal(rejection.status, 'unsupported');
    assert.equal(request.status, 501);
    assert.equal(request.statusText, 'unsupported');
    assert.equal(request.responseJSON.code, 'OFFLINE_UNSUPPORTED_ROUTE');
    assert.equal(rejection.error.name, 'OfflineUnsupportedRouteError');
    assert.equal(rejection.error.code, 'OFFLINE_UNSUPPORTED_ROUTE');
    assert(/Unsupported offline GET route: \/api\/me\/shop\/products/.test(rejection.error.message));
    assert.equal(networkAttempts, 0);
  });

  it('rejects unknown Backbone reads instead of returning empty placeholder data', async () => {
    const UnknownCollection = DuelystBackbone.Collection.extend({
      url: '/api/me/unknown-state',
    });

    let error;
    try {
      await waitForRequest(new UnknownCollection().fetch());
    } catch (requestError) {
      error = requestError;
    }

    assert(error);
    assert.equal(error.name, 'OfflineUnsupportedRouteError');
    assert.equal(error.code, 'OFFLINE_UNSUPPORTED_ROUTE');
    assert(/Unsupported offline READ route: \/api\/me\/unknown-state/.test(error.message));
    assert.equal(networkAttempts, 0);
  });
});
