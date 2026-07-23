debug = require('debug')('session')
{EventEmitter} = require 'events'
Promise = require 'bluebird'
Storage = require 'app/common/storage'
OfflineMode = require 'app/common/offline_mode'

class Session extends EventEmitter

  constructor: (options = {}) ->
    @url = options.url || 'offline://local'
    @fbUrl = options.fbUrl || 'offline://local'
    @fbRef = null
    @token = null
    @expires = null
    @userId = null
    @username = null
    @analyticsData = null
    @justRegistered = null
    @_cachedPremiumBalance = null
    return

  _restoreOfflineSession: (silent = false) ->
    debug('restoreOfflineSession')
    @fbRef = null
    @token = OfflineMode.TOKEN
    @expires = null
    @userId = OfflineMode.USER_ID
    @username = OfflineMode.getUsername()
    @analyticsData = {}
    @saveToStorage()

    data = {token: @token, userId: @userId, analyticsData: @analyticsData}
    if !silent
      @emit 'login', data
    return data

  initPremiumPurchase: () ->
    return Promise.resolve('')

  login: (username, password, silent = false) ->
    debug('login: offline')
    return Promise.resolve(@_restoreOfflineSession(silent))

  logout: () ->
    debug('logout')
    @fbRef = null
    @token = null
    @expires = null
    @userId = null
    @username = null
    @analyticsData = null
    @clearStorage()
    @emit 'logout'

  register: (opts = {}) ->
    @justRegistered = true
    @emit 'registered'
    return Promise.resolve({
      username: opts.username || OfflineMode.getUsername()
      password: opts.password || ''
    })

  isUsernameAvailable: (username) ->
    return Promise.resolve(true)

  changeUsername: (newUsername) ->
    @username = newUsername || OfflineMode.getUsername()
    return Promise.resolve({username: @username})

  changePassword: (currentPassword, newPassword) ->
    return Promise.resolve(true)

  changePortrait: (portraitId) ->
    if !portraitId?
      return Promise.reject(new Error('Invalid portrait!'))
    return Promise.resolve({portrait_id: portraitId})

  changeBattlemap: (battlemapId) ->
    return Promise.resolve({battle_map_id: battlemapId})

  isAuthenticated: (token) ->
    @_restoreOfflineSession()
    return Promise.resolve(true)

  refreshToken: (silent = false) ->
    @_restoreOfflineSession(silent)
    return Promise.resolve(true)

  getIsFirstSessionOfDay: () ->
    return false

  saveToStorage: () ->
    if @token
      Storage.set('token', @token)

  clearStorage: () ->
    Storage.remove('token')

module.exports = new Session()

module.exports.create = (options) ->
  return new Session(options)
