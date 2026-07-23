const path = require('path');

require('app-module-path').addPath(path.join(__dirname, '../../../'));

const assert = require('power-assert');
const underscore = require('underscore');
const Backbone = require('backbone');
const LocalFirebase = require('../../../app/offline/local_firebase');

function wait(milliseconds) {
  return new Promise((resolve) => { setTimeout(resolve, milliseconds); });
}

function setValue(ref, value) {
  return new Promise((resolve, reject) => {
    ref.set(value, (error) => { if (error) reject(error); else resolve(); });
  });
}

function setWithPriority(ref, value, priority) {
  return new Promise((resolve, reject) => {
    ref.setWithPriority(value, priority, (error) => { if (error) reject(error); else resolve(); });
  });
}

function readValue(ref) {
  return new Promise((resolve) => { ref.once('value', resolve); });
}

describe('offline local Firebase', () => {
  const previousOfflineMode = process.env.OFFLINE_MODE;
  const previousBackbone = global.Backbone;
  const previousFirebase = global.Firebase;
  const previousUnderscore = global._;
  const previousWindow = global.window;
  const originalBackboneSync = Backbone.sync;
  const originalBackboneOldSync = Backbone.oldSync;
  const originalBackboneFirebase = Backbone.Firebase;
  const originalDuelystFirebase = Backbone.DuelystFirebase;
  let DuelystFirebase;

  before(() => {
    process.env.OFFLINE_MODE = 'true';
    global._ = underscore;
    global.Backbone = Backbone;
    global.Firebase = LocalFirebase;
    global.window = { _: underscore, Backbone, Firebase: LocalFirebase };
    require('backfire');
    DuelystFirebase = require('../../../app/ui/extensions/duelyst_firebase');
  });

  after(() => {
    Backbone.sync = originalBackboneSync;
    if (originalBackboneOldSync == null) delete Backbone.oldSync;
    else Backbone.oldSync = originalBackboneOldSync;
    if (originalBackboneFirebase == null) delete Backbone.Firebase;
    else Backbone.Firebase = originalBackboneFirebase;
    if (originalDuelystFirebase == null) delete Backbone.DuelystFirebase;
    else Backbone.DuelystFirebase = originalDuelystFirebase;
    global.Backbone = previousBackbone;
    global.Firebase = previousFirebase;
    global._ = previousUnderscore;
    global.window = previousWindow;
    if (previousOfflineMode == null) delete process.env.OFFLINE_MODE;
    else process.env.OFFLINE_MODE = previousOfflineMode;
    delete require.cache[require.resolve('backfire')];
    delete require.cache[require.resolve('../../../app/ui/extensions/duelyst_firebase')];
  });

  beforeEach(() => {
    LocalFirebase._resetForTests({});
  });

  it('fills a filtered BackFire collection before resolving readiness', async () => {
    LocalFirebase._resetForTests({
      scores: {
        a: { score: 1 },
        b: { score: 2 },
        c: { score: 3 },
      },
    });
    const query = new LocalFirebase('https://unused.invalid/scores')
      .orderByChild('score').startAt(2).limitToFirst(1);
    const collection = new DuelystFirebase.Collection(null, { firebase: query });

    await collection.onSyncOrReady();

    assert.equal(collection.isSynced, true);
    assert.deepEqual(collection.pluck('id'), ['b']);

    const missingModel = new DuelystFirebase.Model(null, {
      firebase: new LocalFirebase('https://unused.invalid/missing'),
    });
    await missingModel.onSyncOrReady();
    assert.equal(missingModel.isSynced, true);
  });

  it('stores priorities outside values and orders child events by priority', async () => {
    const queue = new LocalFirebase('https://unused.invalid/queue');
    await setWithPriority(queue.child('later'), { label: 'later' }, 20);
    await setValue(queue.child('first'), { label: 'first', '.priority': 10 });

    const firstSnapshot = await readValue(queue.child('first'));
    assert.deepEqual(firstSnapshot.val(), { label: 'first' });
    assert.equal(firstSnapshot.getPriority(), 10);

    const keys = [];
    queue.on('child_added', (snapshot, previousKey) => {
      keys.push([snapshot.key(), previousKey]);
    });
    await wait(10);
    assert.deepEqual(keys, [['first', null], ['later', 'first']]);
  });

  it('keeps listeners isolated between queries on the same path', async () => {
    LocalFirebase._resetForTests({ scores: { a: { score: 1 } } });
    const scores = new LocalFirebase('https://unused.invalid/scores');
    const lowerQuery = scores.orderByChild('score').startAt(1);
    const higherQuery = scores.orderByChild('score').startAt(3);
    const lowerEvents = [];
    const higherEvents = [];
    const onLower = (snapshot) => lowerEvents.push(snapshot.key());
    const onHigher = (snapshot) => higherEvents.push(snapshot.key());
    lowerQuery.on('child_added', onLower);
    higherQuery.on('child_added', onHigher);
    await wait(10);
    lowerEvents.length = 0;
    higherEvents.length = 0;

    lowerQuery.off('child_added', onLower);
    await setValue(scores.child('new'), { score: 4 });
    await wait(10);

    assert.deepEqual(lowerEvents, []);
    assert.deepEqual(higherEvents, ['new']);
  });

  it('emits removed and added events when a limited query window changes', async () => {
    LocalFirebase._resetForTests({
      scores: {
        a: { score: 1 },
        b: { score: 2 },
        c: { score: 3 },
      },
    });
    const scores = new LocalFirebase('https://unused.invalid/scores');
    const query = scores.orderByChild('score').limitToFirst(2);
    const added = [];
    const removed = [];
    query.on('child_added', (snapshot, previousKey) => added.push([snapshot.key(), previousKey]));
    query.on('child_removed', (snapshot) => removed.push(snapshot.key()));
    await wait(10);
    added.length = 0;

    await setValue(scores.child('c'), { score: 0 });
    await wait(10);

    assert.deepEqual(removed, ['b']);
    assert.deepEqual(added, [['c', null]]);
  });
});
