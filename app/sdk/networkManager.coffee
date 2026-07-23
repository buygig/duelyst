EventBus = require 'app/common/eventbus'

# Offline-only transport boundary.
#
# The authoritative local GameSession still calls broadcastGameEvent for
# transient cursor/selection effects, so the SDK keeps a small compatible
# transport object. Network connection methods fail explicitly instead of
# silently attempting Socket.IO connections.
class NetworkManager
  instance = null

  class _OfflineNetworkManager
    connected: false
    disconnected: true
    gameId: null
    playerId: null
    spectatorId: null
    isOpponentConnected: false
    socket: null
    socketManager: null
    _eventBus: null
    spectators: null

    constructor: () ->
      @_eventBus = EventBus.create()
      @spectators = new Backbone.Collection()

    getEventBus: () ->
      return @_eventBus

    connect: () ->
      throw new Error("Network games are unavailable in the offline build.")

    reconnect: () ->
      throw new Error("Network games are unavailable in the offline build.")

    joinGameRoom: () ->
      throw new Error("Network games are unavailable in the offline build.")

    joinGameSpectatorRoom: () ->
      throw new Error("Spectating is unavailable in the offline build.")

    disconnect: () ->
      @connected = false
      @disconnected = true
      @gameId = null
      @playerId = null
      @spectatorId = null
      @isOpponentConnected = false
      @socket = null
      @socketManager = null
      @spectators.reset()
      return

    broadcastGameEvent: () ->
      return false

  @getInstance: () ->
    instance ?= new _OfflineNetworkManager()

module.exports = NetworkManager
