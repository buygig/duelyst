/* global Backbone */

const OfflineMode = require('../common/offline_mode');
const Storage = require('../common/storage');

const DECKS_KEY = 'offline-decks-v1';
const CHALLENGES_KEY = 'offline-challenges-v1';
let installed = false;
let deckCounter = 0;
let deckData;
let challengeData;

function clone(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function loadDecks() {
  if (Array.isArray(deckData)) return clone(deckData);
  try {
    deckData = Storage.get(DECKS_KEY);
  } catch (e) {
    deckData = null;
  }
  if (!Array.isArray(deckData)) deckData = [];
  deckData = deckData.filter((deck) => deck && typeof deck === 'object');
  return clone(deckData);
}

function saveDecks(decks) {
  deckData = clone(decks);
  try {
    Storage.set(DECKS_KEY, deckData);
  } catch (e) {
    // Keep the current session playable when persistent storage is unavailable.
  }
}

function loadChallenges() {
  if (Array.isArray(challengeData)) return clone(challengeData);
  try {
    challengeData = Storage.get(CHALLENGES_KEY);
  } catch (e) {
    challengeData = null;
  }
  if (!Array.isArray(challengeData)) challengeData = [];
  challengeData = challengeData.filter((challenge) => challenge && typeof challenge === 'object');
  return clone(challengeData);
}

function saveChallenges(challenges) {
  challengeData = clone(challenges);
  try {
    Storage.set(CHALLENGES_KEY, challengeData);
  } catch (e) {
    // Keep challenge progression in memory-compatible defaults when storage is unavailable.
  }
}

function parseRequestData(settings) {
  const requestData = settings && settings.data;
  if (typeof requestData === 'string') {
    try {
      return JSON.parse(requestData);
    } catch (e) {
      return {};
    }
  }
  return requestData && typeof requestData === 'object' ? requestData : {};
}

function decodeUrlPart(value) {
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return value;
  }
}

function updateChallenge(url, settings) {
  const match = /\/api\/me\/challenges\/gated\/([^/?#]+)\/(last_attempted_at|completed_at)(?:[/?#]|$)/
    .exec(url);
  if (!match) return null;

  const challengeId = decodeUrlPart(match[1]);
  const field = match[2];
  const payload = parseRequestData(settings);
  const timestamp = payload[field] == null ? Date.now() : payload[field];
  let challenges = loadChallenges();
  const challenge = challenges.filter((item) => String(item.challenge_id) === challengeId)[0] || { challenge_id: challengeId };

  challenge[field] = timestamp;
  if (field === 'completed_at') {
    if (challenge.last_attempted_at == null) challenge.last_attempted_at = timestamp;
    if (!Array.isArray(challenge.reward_ids)) challenge.reward_ids = [];
  }

  challenges = challenges.filter((item) => String(item.challenge_id) !== challengeId);
  challenges.push(challenge);
  saveChallenges(challenges);
  return { challenge: clone(challenge) };
}

function urlFor(model) {
  let url = model && model.url;
  if (typeof url === 'function') url = url.call(model);
  if (!url && model && model.collection) {
    url = model.collection.url;
    if (typeof url === 'function') url = url.call(model.collection);
  }
  return String(url || '');
}

function isCollection(model) {
  return typeof Backbone !== 'undefined' && model instanceof Backbone.Collection;
}

function isDeckUrl(url) {
  return /\/api\/me\/decks(?:\/[^/?#]+)?(?:[?#].*)?$/.test(url);
}

function deckResponse(method, model) {
  let decks = loadDecks();
  let id = model && model.id != null ? String(model.id) : null;

  if (method === 'read') {
    if (isCollection(model)) return decks;
    return clone(decks.filter((deck) => String(deck.id) === id)[0] || {});
  }

  if (method === 'delete') {
    saveDecks(decks.filter((deck) => String(deck.id) !== id));
    return clone(model.toJSON());
  }

  const attrs = clone(model.toJSON());
  const now = Date.now();
  if (method === 'create' || attrs.id == null) {
    deckCounter += 1;
    attrs.id = `local-deck-${now.toString(36)}-${deckCounter.toString(36)}`;
    attrs.created_at = attrs.created_at || now;
  }
  attrs.updated_at = now;
  id = String(attrs.id);
  decks = decks.filter((deck) => String(deck.id) !== id);
  decks.push(attrs);
  saveDecks(decks);
  return attrs;
}

function readResponse(model, url) {
  if (/\/api\/me\/challenges\/gated\/?(?:[?#].*)?$/.test(url)) {
    return loadChallenges();
  }
  if (/\/api\/me\/new_player_progression(?:[/?#]|$)/.test(url)) {
    return [{ module_name: 'core', stage: 'Skipped' }];
  }
  if (/\/api\/me\/shop\/products(?:[/?#]|$)/.test(url)) {
    return { earned_specials: {}, products: [] };
  }
  if (/\/api\/me\/shop\/premium_pack_products(?:[/?#]|$)/.test(url)) {
    return { products: [] };
  }
  return isCollection(model) ? [] : {};
}

function responseFor(method, model) {
  const url = urlFor(model);
  if (isDeckUrl(url)) return deckResponse(method, model);
  if (method === 'read') return readResponse(model, url);
  return model && typeof model.toJSON === 'function' ? clone(model.toJSON()) : {};
}

function makeRequest(responseFactory, options, status) {
  const deferred = $.Deferred();
  const request = deferred.promise();
  let settled = false;
  request.readyState = 1;
  request.status = status == null ? 200 : status;
  request.statusText = '';
  request.abort = function () {
    if (settled) return request;
    settled = true;
    request.readyState = 0;
    request.status = 0;
    request.statusText = 'abort';
    if (options && typeof options.error === 'function') options.error(request, 'abort', 'abort');
    deferred.reject(request, 'abort', 'abort');
    if (options && typeof options.complete === 'function') options.complete(request, 'abort');
    return request;
  };
  request.success = request.done;
  request.error = request.fail;
  request.complete = request.always;

  setTimeout(() => {
    if (settled) return;
    let response;
    try {
      response = typeof responseFactory === 'function' ? responseFactory() : responseFactory;
    } catch (error) {
      settled = true;
      request.readyState = 4;
      request.status = 500;
      request.statusText = 'error';
      request.responseJSON = { message: error.message };
      if (options && typeof options.error === 'function') options.error(request, 'error', error);
      deferred.reject(request, 'error', error);
      if (options && typeof options.complete === 'function') options.complete(request, 'error');
      return;
    }

    settled = true;
    request.readyState = 4;
    request.statusText = 'success';
    request.responseJSON = response;
    if (options && typeof options.success === 'function') options.success(response, 'success', request);
    deferred.resolve(response, 'success', request);
    if (options && typeof options.complete === 'function') options.complete(request, 'success');
  }, 0);
  return request;
}

function localSync(method, model, options) {
  const syncOptions = options || {};
  const request = makeRequest(() => responseFor(method, model), syncOptions, 200);
  syncOptions.xhr = request;
  if (model && typeof model.trigger === 'function') {
    model.trigger('request', model, request, syncOptions);
  }
  return request;
}

function ajaxResponse(url, settings) {
  const challengeResponse = updateChallenge(url, settings);
  if (challengeResponse) return challengeResponse;
  if (/\/api\/me\/challenges\/gated\/?(?:[?#].*)?$/.test(url)) return loadChallenges();
  if (/\/api\/me\/new_player_progression(?:[/?#]|$)/.test(url)) {
    return [{ module_name: 'core', stage: 'Skipped' }];
  }
  if (/\/api\/me\/rewards\/twitch_rewards\/unread(?:[/?#]|$)/.test(url)) return [];
  if (/\/api\/me\/shop\/sales(?:[/?#]|$)/.test(url)) return [];
  return {};
}

function install() {
  if (!OfflineMode.isEnabled() || installed) return;
  installed = true;

  // BackFire delegates all non-Firebase models to Backbone.oldSync.
  Backbone.oldSync = localSync;

  $.ajax = function (urlOrSettings, maybeSettings) {
    let settings;
    if (typeof urlOrSettings === 'string') {
      settings = $.extend({}, maybeSettings || {}, { url: urlOrSettings });
    } else {
      settings = $.extend({}, urlOrSettings || {});
    }
    return makeRequest(() => ajaxResponse(String(settings.url || ''), settings), settings, 200);
  };
}

function resetForTests() {
  deckCounter = 0;
  deckData = null;
  challengeData = null;
  Storage.remove(DECKS_KEY);
  Storage.remove(CHALLENGES_KEY);
}

module.exports = {
  install,
  _localSyncForTests: localSync,
  _ajaxResponseForTests: ajaxResponse,
  _responseForTests: responseFor,
  _resetForTests: resetForTests,
};
