const OfflineMode = require('../common/offline_mode');
const Storage = require('../common/storage');

const STORAGE_KEY = 'offline-firebase-v1';
const PRIORITIES_STORAGE_KEY = 'offline-firebase-priorities-v1';
let listeners = [];
let pushCounter = 0;
let data;
let priorities;

function clone(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isContainer(value) {
  return isObject(value) || Array.isArray(value);
}

function pathsEqual(a, b) {
  return a.length === b.length && a.every((part, index) => part === b[index]);
}

function pathStartsWith(path, prefix) {
  if (path.length < prefix.length) return false;
  return prefix.every((part, index) => path[index] === part);
}

function pathId(path) {
  return JSON.stringify(path);
}

function normalisePath(url) {
  let value = String(url || '');
  value = value.replace(/^[a-z]+:\/\/[^/]+/i, '');
  value = value.replace(/^\/+|\/+$/g, '');
  if (!value) return [];
  return value.split('/').filter(Boolean).map(decodeURIComponent);
}

function getAt(root, path) {
  let value = root;
  for (let i = 0; i < path.length; i++) {
    if (value == null || typeof value !== 'object') return null;
    value = value[path[i]];
  }
  return value == null ? null : value;
}

function setAt(root, path, value) {
  if (path.length === 0) return value == null ? {} : value;
  let cursor = root;
  for (let i = 0; i < path.length - 1; i++) {
    if (!isObject(cursor[path[i]])) cursor[path[i]] = {};
    cursor = cursor[path[i]];
  }
  const key = path[path.length - 1];
  if (value == null) delete cursor[key];
  else cursor[key] = value;
  return root;
}

function resolveServerValues(value) {
  if (isObject(value) && value['.sv'] === 'timestamp') return Date.now();
  if (Array.isArray(value)) return value.map(resolveServerValues);
  if (isObject(value)) {
    const resolved = {};
    Object.keys(value).forEach((key) => {
      resolved[key] = resolveServerValues(value[key]);
    });
    return resolved;
  }
  return value;
}

function defaultData() {
  const factionProgression = {};
  for (let factionId = 1; factionId <= 6; factionId++) {
    factionProgression[factionId] = { stats: { level: 50, xp: 999999 } };
  }

  const root = {
    '.info': { connected: true },
    'system-status': {
      shop_enabled: false,
      version: process.env.VERSION || 'offline',
    },
    users: {},
    'user-ranking': {},
    'user-stats': {},
    'user-progression': {},
    'user-faction-progression': {},
    'user-inventory': {},
  };

  root.users[OfflineMode.USER_ID] = {
    id: OfflineMode.USER_ID,
    username: OfflineMode.getUsername(),
    created_at: Date.now(),
    presence: { status: 'online', username: OfflineMode.getUsername() },
  };
  root['user-ranking'][OfflineMode.USER_ID] = {
    current: { rank: 30 },
    top: { rank: 30, top_rank: 30 },
  };
  root['user-stats'][OfflineMode.USER_ID] = {};
  root['user-progression'][OfflineMode.USER_ID] = {
    'game-counter': { game_count: 0, win_count: 0, loss_count: 0 },
  };
  root['user-faction-progression'][OfflineMode.USER_ID] = factionProgression;
  root['user-inventory'][OfflineMode.USER_ID] = {
    wallet: { gold_amount: 0, spirit_amount: 0, premium_amount: 0 },
  };
  return root;
}

function loadData() {
  if (data) return data;
  try {
    data = Storage.get(STORAGE_KEY);
    priorities = Storage.get(PRIORITIES_STORAGE_KEY);
  } catch (e) {
    data = null;
    priorities = null;
  }
  if (!isObject(data)) data = defaultData();
  if (!isObject(priorities)) priorities = {};
  return data;
}

function loadPriorities() {
  loadData();
  return priorities;
}

function persist() {
  try {
    Storage.set(STORAGE_KEY, data);
    Storage.set(PRIORITIES_STORAGE_KEY, priorities);
  } catch (e) {
    // localStorage can be unavailable in private/test contexts; memory still works.
  }
}

function asyncCall(callback, ...args) {
  if (typeof callback !== 'function') return;
  setTimeout(() => { callback(...args); }, 0);
}

function getPriority(priorityMap, path) {
  const key = pathId(path);
  return Object.prototype.hasOwnProperty.call(priorityMap, key) ? clone(priorityMap[key]) : null;
}

function setPriorityInMap(priorityMap, path, priority) {
  const key = pathId(path);
  if (priority == null) delete priorityMap[key];
  else priorityMap[key] = clone(resolveServerValues(priority));
}

function clearPrioritiesBelow(priorityMap, path) {
  Object.keys(priorityMap).forEach((key) => {
    let storedPath;
    try {
      storedPath = JSON.parse(key);
    } catch (e) {
      delete priorityMap[key];
      return;
    }
    if (pathStartsWith(storedPath, path)) delete priorityMap[key];
  });
}

function sanitiseValue(value, path, priorityMap) {
  if (Array.isArray(value)) {
    return value.map((child, index) => sanitiseValue(child, path.concat(String(index)), priorityMap));
  }
  if (!isObject(value)) return value;

  const hasExplicitPriority = Object.prototype.hasOwnProperty.call(value, '.priority');
  const explicitPriority = hasExplicitPriority ? value['.priority'] : null;
  let output;

  if (Object.prototype.hasOwnProperty.call(value, '.value')) {
    output = sanitiseValue(value['.value'], path, priorityMap);
  } else {
    output = {};
    Object.keys(value).forEach((key) => {
      if (key === '.priority') return;
      const child = sanitiseValue(value[key], path.concat(key), priorityMap);
      if (child != null) output[key] = child;
    });
  }

  if (hasExplicitPriority) setPriorityInMap(priorityMap, path, explicitPriority);
  return output;
}

function prepareSetValue(value, path, priorityMap) {
  clearPrioritiesBelow(priorityMap, path);
  return sanitiseValue(resolveServerValues(clone(value)), path, priorityMap);
}

function integerKey(value) {
  if (!/^-?\d{1,10}$/.test(value)) return null;
  const number = Number(value);
  if (number < -2147483648 || number > 2147483647) return null;
  return number;
}

function compareKeys(a, b) {
  if (a === b) return 0;
  const integerA = integerKey(a);
  const integerB = integerKey(b);
  if (integerA != null && integerB != null) {
    if (integerA !== integerB) return integerA < integerB ? -1 : 1;
    return a.length < b.length ? -1 : 1;
  }
  if (integerA != null) return -1;
  if (integerB != null) return 1;
  return a < b ? -1 : 1;
}

function valueRank(value) {
  if (value == null) return 0;
  if (value === false) return 1;
  if (value === true) return 2;
  if (typeof value === 'number') return 3;
  if (typeof value === 'string') return 4;
  return 5;
}

function compareValues(a, b) {
  if (a === b) return 0;
  const rankA = valueRank(a);
  const rankB = valueRank(b);
  if (rankA !== rankB) return rankA < rankB ? -1 : 1;
  if (rankA === 3) return a < b ? -1 : 1;
  if (rankA === 4) return a < b ? -1 : 1;
  if (rankA === 5) {
    const jsonA = JSON.stringify(a);
    const jsonB = JSON.stringify(b);
    if (jsonA === jsonB) return 0;
    return jsonA < jsonB ? -1 : 1;
  }
  return 0;
}

function defaultQuery() {
  return {
    orderBy: 'priority',
    orderPath: null,
    explicitOrder: false,
    start: null,
    end: null,
    limit: null,
    limitDirection: null,
  };
}

function copyQuery(query) {
  const next = defaultQuery();
  if (!query) return next;
  Object.keys(next).forEach((key) => { next[key] = clone(query[key]); });
  return next;
}

function querySignature(query) {
  const normalised = copyQuery(query);
  delete normalised.explicitOrder;
  return JSON.stringify(normalised);
}

function hasQueryConstraint(query) {
  return !!(query && (query.explicitOrder || query.start || query.end || query.limit != null));
}

function childrenOf(value) {
  if (!isContainer(value)) return {};
  const children = {};
  Object.keys(value).forEach((key) => {
    if (value[key] != null) children[key] = value[key];
  });
  return children;
}

function orderValueFor(entry, query) {
  if (query.orderBy === 'key') return entry.key;
  if (query.orderBy === 'value') return entry.value;
  if (query.orderBy === 'child') return getAt(entry.value, query.orderPath || []);
  return entry.priority;
}

function compareEntries(a, b, query) {
  if (query.orderBy === 'key') return compareKeys(a.key, b.key);
  const compared = compareValues(a.orderValue, b.orderValue);
  return compared || compareKeys(a.key, b.key);
}

function compareEntryToBound(entry, bound, query) {
  if (query.orderBy === 'key') return compareKeys(entry.key, String(bound.value));
  const compared = compareValues(entry.orderValue, bound.value);
  if (compared || bound.key == null) return compared;
  return compareKeys(entry.key, String(bound.key));
}

function createQueryView(root, priorityMap, path, rawQuery) {
  const query = copyQuery(rawQuery);
  const rawValue = getAt(root, path);
  const children = childrenOf(rawValue);
  let entries = Object.keys(children).map((key) => {
    const entry = {
      key,
      value: clone(children[key]),
      priority: getPriority(priorityMap, path.concat(key)),
    };
    entry.orderValue = orderValueFor(entry, query);
    return entry;
  });

  entries.sort((a, b) => compareEntries(a, b, query));
  if (query.start) {
    entries = entries.filter((entry) => compareEntryToBound(entry, query.start, query) >= 0);
  }
  if (query.end) {
    entries = entries.filter((entry) => compareEntryToBound(entry, query.end, query) <= 0);
  }
  if (query.limit != null) {
    let direction = query.limitDirection;
    if (direction === 'legacy') direction = query.start && !query.end ? 'first' : 'last';
    entries = direction === 'first' ? entries.slice(0, query.limit) : entries.slice(-query.limit);
  }

  const keys = entries.map((entry) => entry.key);
  const byKey = {};
  const orderValues = {};
  const childPriorities = {};
  entries.forEach((entry) => {
    byKey[entry.key] = entry.value;
    orderValues[entry.key] = clone(entry.orderValue);
    childPriorities[entry.key] = clone(entry.priority);
  });

  let value;
  if (!isContainer(rawValue)) {
    value = clone(rawValue);
  } else if (!hasQueryConstraint(rawQuery)) {
    value = clone(rawValue);
  } else {
    value = keys.length ? {} : null;
    keys.forEach((key) => { value[key] = clone(byKey[key]); });
  }

  return {
    value,
    keys,
    byKey,
    orderValues,
    childPriorities,
    rootPriority: getPriority(priorityMap, path),
  };
}

function previousKey(keys, key) {
  const index = keys.indexOf(key);
  return index > 0 ? keys[index - 1] : null;
}

function valueViewSignature(view) {
  return JSON.stringify({
    value: view.value,
    keys: view.keys,
    priorities: view.childPriorities,
    rootPriority: view.rootPriority,
  });
}

function LocalSnapshot(ref, value, priority, priorityMap) {
  this._ref = ref.ref();
  this._value = clone(value);
  this._priority = clone(priority);
  this._priorities = clone(priorityMap || {});
}

LocalSnapshot.prototype.val = function () { return clone(this._value); };
LocalSnapshot.prototype.exists = function () { return this._value != null; };
LocalSnapshot.prototype.key = function () { return this._ref.key(); };
LocalSnapshot.prototype.name = LocalSnapshot.prototype.key;
LocalSnapshot.prototype.ref = function () { return this._ref.ref(); };
LocalSnapshot.prototype.numChildren = function () { return Object.keys(childrenOf(this._value)).length; };
LocalSnapshot.prototype.hasChild = function (path) {
  return getAt(this._value, normalisePath(path)) != null;
};
LocalSnapshot.prototype.child = function (path) {
  const childPath = normalisePath(path);
  const childRef = this._ref.child(path);
  return new LocalSnapshot(
    childRef,
    getAt(this._value, childPath),
    getPriority(this._priorities, childRef._path),
    this._priorities,
  );
};
LocalSnapshot.prototype.getPriority = function () { return clone(this._priority); };

function listenerIsActive(listener) {
  return listeners.indexOf(listener) !== -1;
}

function makeSnapshot(ref, value, priority, priorityMap) {
  return new LocalSnapshot(ref, value, priority, priorityMap);
}

function emitInitial(listener, root, priorityMap) {
  if (!listenerIsActive(listener)) return;
  const view = createQueryView(root, priorityMap, listener.ref._path, listener.ref._query);
  if (listener.event === 'value') {
    listener.callback.call(
      listener.context || null,
      makeSnapshot(listener.ref, view.value, view.rootPriority, priorityMap),
    );
    return;
  }
  if (listener.event === 'child_added') {
    view.keys.some((key) => {
      if (!listenerIsActive(listener)) return true;
      listener.callback.call(
        listener.context || null,
        makeSnapshot(listener.ref.child(key), view.byKey[key], view.childPriorities[key], priorityMap),
        previousKey(view.keys, key),
      );
      return false;
    });
  }
}

function scheduleListener(listener, snapshot, previous) {
  asyncCall(() => {
    if (!listenerIsActive(listener)) return;
    listener.callback.call(listener.context || null, snapshot, previous);
  });
}

function notify(oldRoot, oldPriorities, newRoot, newPriorities) {
  listeners.slice().forEach((listener) => {
    const oldView = createQueryView(oldRoot, oldPriorities, listener.ref._path, listener.ref._query);
    const newView = createQueryView(newRoot, newPriorities, listener.ref._path, listener.ref._query);

    if (listener.event === 'value') {
      if (valueViewSignature(oldView) !== valueViewSignature(newView)) {
        scheduleListener(
          listener,
          makeSnapshot(listener.ref, newView.value, newView.rootPriority, newPriorities),
        );
      }
      return;
    }

    if (listener.event === 'child_added') {
      newView.keys.forEach((key) => {
        if (oldView.keys.indexOf(key) !== -1) return;
        scheduleListener(
          listener,
          makeSnapshot(listener.ref.child(key), newView.byKey[key], newView.childPriorities[key], newPriorities),
          previousKey(newView.keys, key),
        );
      });
      return;
    }

    if (listener.event === 'child_removed') {
      oldView.keys.forEach((key) => {
        if (newView.keys.indexOf(key) !== -1) return;
        scheduleListener(
          listener,
          makeSnapshot(listener.ref.child(key), oldView.byKey[key], oldView.childPriorities[key], oldPriorities),
          null,
        );
      });
      return;
    }

    if (listener.event === 'child_changed') {
      newView.keys.forEach((key) => {
        if (oldView.keys.indexOf(key) === -1) return;
        if (JSON.stringify(oldView.byKey[key]) === JSON.stringify(newView.byKey[key])) return;
        scheduleListener(
          listener,
          makeSnapshot(listener.ref.child(key), newView.byKey[key], newView.childPriorities[key], newPriorities),
          previousKey(newView.keys, key),
        );
      });
      return;
    }

    if (listener.event === 'child_moved') {
      newView.keys.forEach((key) => {
        if (oldView.keys.indexOf(key) === -1) return;
        const orderChanged = compareValues(oldView.orderValues[key], newView.orderValues[key]) !== 0;
        const positionChanged = previousKey(oldView.keys, key) !== previousKey(newView.keys, key);
        if (!orderChanged || !positionChanged) return;
        scheduleListener(
          listener,
          makeSnapshot(listener.ref.child(key), newView.byKey[key], newView.childPriorities[key], newPriorities),
          previousKey(newView.keys, key),
        );
      });
    }
  });
}

function LocalFirebase(url, explicitPath, query) {
  if (!(this instanceof LocalFirebase)) return new LocalFirebase(url, explicitPath, query);
  this._path = explicitPath ? explicitPath.slice() : normalisePath(url);
  this._query = query ? copyQuery(query) : null;
}

LocalFirebase.ServerValue = { TIMESTAMP: { '.sv': 'timestamp' } };

LocalFirebase.prototype.child = function (path) {
  return new LocalFirebase(null, this._path.concat(normalisePath(path)));
};
LocalFirebase.prototype.parent = function () {
  return this._path.length ? new LocalFirebase(null, this._path.slice(0, -1)) : null;
};
LocalFirebase.prototype.root = function () { return new LocalFirebase(null, []); };
LocalFirebase.prototype.ref = function () { return new LocalFirebase(null, this._path); };
LocalFirebase.prototype.key = function () { return this._path.length ? this._path[this._path.length - 1] : null; };
LocalFirebase.prototype.name = LocalFirebase.prototype.key;
LocalFirebase.prototype.toString = function () { return `offline://duelyst/${this._path.join('/')}`; };

LocalFirebase.prototype.on = function (event, callback, cancelCallback, context) {
  let actualContext = context;
  if (actualContext == null && cancelCallback && typeof cancelCallback !== 'function') actualContext = cancelCallback;
  const listener = {
    ref: new LocalFirebase(null, this._path, this._query),
    signature: querySignature(this._query),
    event,
    callback,
    context: actualContext,
  };
  listeners.push(listener);
  const initialRoot = clone(loadData());
  const initialPriorities = clone(loadPriorities());
  asyncCall(() => { emitInitial(listener, initialRoot, initialPriorities); });
  return callback;
};

LocalFirebase.prototype.once = function (event, callback, cancelCallback, context) {
  let actualContext = context;
  if (actualContext == null && cancelCallback && typeof cancelCallback !== 'function') actualContext = cancelCallback;
  const ref = this;
  function onceCallback(snapshot, previous) {
    ref.off(event, onceCallback, actualContext);
    callback.call(actualContext || null, snapshot, previous);
  }
  this.on(event, onceCallback, cancelCallback, actualContext);
  return this;
};

LocalFirebase.prototype.off = function (event, callback, context) {
  const signature = querySignature(this._query);
  listeners = listeners.filter(function (listener) {
    if (!pathsEqual(listener.ref._path, this._path)) return true;
    if (listener.signature !== signature) return true;
    if (event && listener.event !== event) return true;
    if (callback && listener.callback !== callback) return true;
    if (context && listener.context !== context) return true;
    return false;
  }, this);
  return this;
};

LocalFirebase.prototype.set = function (value, callback) {
  const oldRoot = clone(loadData());
  const oldPriorities = clone(loadPriorities());
  const prepared = prepareSetValue(value, this._path, priorities);
  data = setAt(data, this._path, prepared);
  persist();
  notify(oldRoot, oldPriorities, clone(data), clone(priorities));
  asyncCall(callback, null);
  return this;
};

LocalFirebase.prototype.update = function (values, callback) {
  const oldRoot = clone(loadData());
  const oldPriorities = clone(loadPriorities());
  Object.keys(values || {}).forEach(function (key) {
    const relativePath = normalisePath(key);
    const targetPath = this._path.concat(relativePath);
    if (relativePath[relativePath.length - 1] === '.priority') {
      setPriorityInMap(priorities, targetPath.slice(0, -1), values[key]);
      return;
    }
    const prepared = prepareSetValue(values[key], targetPath, priorities);
    data = setAt(data, targetPath, prepared);
  }, this);
  persist();
  notify(oldRoot, oldPriorities, clone(data), clone(priorities));
  asyncCall(callback, null);
  return this;
};

LocalFirebase.prototype.remove = function (callback) { return this.set(null, callback); };
LocalFirebase.prototype.setWithPriority = function (value, priority, callback) {
  const oldRoot = clone(loadData());
  const oldPriorities = clone(loadPriorities());
  const prepared = prepareSetValue(value, this._path, priorities);
  setPriorityInMap(priorities, this._path, priority);
  data = setAt(data, this._path, prepared);
  persist();
  notify(oldRoot, oldPriorities, clone(data), clone(priorities));
  asyncCall(callback, null);
  return this;
};
LocalFirebase.prototype.setPriority = function (priority, callback) {
  const oldRoot = clone(loadData());
  const oldPriorities = clone(loadPriorities());
  setPriorityInMap(priorities, this._path, priority);
  persist();
  notify(oldRoot, oldPriorities, clone(data), clone(priorities));
  asyncCall(callback, null);
  return this;
};

LocalFirebase.prototype.push = function (value, callback) {
  pushCounter += 1;
  const key = `local-${Date.now().toString(36)}-${pushCounter.toString(36)}`;
  const child = this.ref().child(key);
  if (arguments.length) child.set(value, callback);
  return child;
};

LocalFirebase.prototype.transaction = function (updateFn, callback) {
  const current = clone(getAt(loadData(), this._path));
  const updated = updateFn(current);
  if (updated === undefined) {
    asyncCall(
      callback,
      null,
      false,
      new LocalSnapshot(this.ref(), current, getPriority(loadPriorities(), this._path), loadPriorities()),
    );
  } else {
    this.set(updated, (error) => {
      if (callback) {
        callback(
          error,
          !error,
          new LocalSnapshot(this.ref(), updated, getPriority(loadPriorities(), this._path), loadPriorities()),
        );
      }
    });
  }
  return this;
};

LocalFirebase.prototype.authWithCustomToken = function (token, callback) {
  const auth = {
    auth: { id: OfflineMode.USER_ID, username: OfflineMode.getUsername() },
    uid: OfflineMode.USER_ID,
    expires: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
  };
  asyncCall(callback, null, auth);
  return this;
};
LocalFirebase.prototype.unauth = function () { return this; };
LocalFirebase.prototype.getAuth = function () { return { uid: OfflineMode.USER_ID }; };

LocalFirebase.prototype.onDisconnect = function () {
  return {
    set(value, callback) { asyncCall(callback, null); },
    update(value, callback) { asyncCall(callback, null); },
    remove(callback) { asyncCall(callback, null); },
    cancel(callback) { asyncCall(callback, null); },
  };
};

function queryWithOrder(ref, orderBy, orderPath) {
  const query = copyQuery(ref._query);
  if (query.explicitOrder) throw new Error('Query: You cannot combine multiple orderBy calls');
  query.orderBy = orderBy;
  query.orderPath = orderPath || null;
  query.explicitOrder = true;
  return new LocalFirebase(null, ref._path, query);
}

LocalFirebase.prototype.orderByChild = function (path) {
  return queryWithOrder(this, 'child', normalisePath(path));
};
LocalFirebase.prototype.orderByKey = function () { return queryWithOrder(this, 'key'); };
LocalFirebase.prototype.orderByPriority = function () { return queryWithOrder(this, 'priority'); };
LocalFirebase.prototype.orderByValue = function () { return queryWithOrder(this, 'value'); };

LocalFirebase.prototype.startAt = function (value, key) {
  const query = copyQuery(this._query);
  if (query.start) throw new Error('Query: startAt() or equalTo() was already called');
  query.start = { value: arguments.length ? clone(value) : null, key: key == null ? null : String(key) };
  return new LocalFirebase(null, this._path, query);
};
LocalFirebase.prototype.endAt = function (value, key) {
  const query = copyQuery(this._query);
  if (query.end) throw new Error('Query: endAt() or equalTo() was already called');
  query.end = { value: arguments.length ? clone(value) : null, key: key == null ? null : String(key) };
  return new LocalFirebase(null, this._path, query);
};
LocalFirebase.prototype.equalTo = function (value, key) {
  const query = copyQuery(this._query);
  if (query.start || query.end) throw new Error('Query: equalTo() cannot be combined with existing bounds');
  const bound = { value: clone(value), key: key == null ? null : String(key) };
  query.start = clone(bound);
  query.end = clone(bound);
  return new LocalFirebase(null, this._path, query);
};

function queryWithLimit(ref, count, direction) {
  if (!Number.isInteger(count) || count <= 0) throw new Error('Query limit must be a positive integer');
  const query = copyQuery(ref._query);
  if (query.limit != null) throw new Error('Query limit was already set');
  query.limit = count;
  query.limitDirection = direction;
  return new LocalFirebase(null, ref._path, query);
}

LocalFirebase.prototype.limit = function (count) { return queryWithLimit(this, count, 'legacy'); };
LocalFirebase.prototype.limitToFirst = function (count) { return queryWithLimit(this, count, 'first'); };
LocalFirebase.prototype.limitToLast = function (count) { return queryWithLimit(this, count, 'last'); };

LocalFirebase.goOffline = function () {};
LocalFirebase.goOnline = function () {};
LocalFirebase.enableLogging = function () {};
LocalFirebase._resetForTests = function (nextData) {
  priorities = {};
  data = prepareSetValue(nextData == null ? defaultData() : nextData, [], priorities);
  if (!isObject(data)) data = {};
  listeners = [];
  persist();
};

module.exports = LocalFirebase;
