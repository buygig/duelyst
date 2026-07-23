EVENTS = require 'app/common/event_types'
Logger = require 'app/common/logger'

class LocalStarterAIController

  constructor: (gameSession, options) ->
    options ?= {}

    @_gameSession = gameSession
    @_playerId = options.playerId or gameSession.getAiPlayerId()
    @_difficulty = if options.difficulty? then options.difficulty else gameSession.getAiDifficulty()
    @_ai = options.ai
    @_started = false
    @_timerId = null
    @_forceEndTurn = false

    @_actionDelayMs = if typeof options.actionDelayMs == "number" then Math.max(1, options.actionDelayMs) else 250
    @_setTimeout = options.setTimeout or ((callback, delay) -> setTimeout(callback, delay))
    @_clearTimeout = options.clearTimeout or ((timerId) -> clearTimeout(timerId))

    @_onSessionProgress = => @_scheduleNextAction()
    @_onInvalidAction = (event) =>
      action = event?.action
      if action? and !action.getIsImplicit() and action.getOwnerId() == @_playerId
        @_forceEndTurn = true
        @_scheduleNextAction()
    @_onTerminate = => @destroy()
    @_runScheduledAction = => @_runNextAction()

  getAI: () ->
    if !@_ai?
      # Loaded lazily to avoid an app/sdk -> controller -> StarterAI -> app/sdk
      # cycle while the SDK namespace is still being assembled.
      StarterAI = require 'packages/game-ai/starter_ai'
      @_ai = new StarterAI(@_gameSession, @_playerId, @_difficulty)
    return @_ai

  start: () ->
    if !@_gameSession?.getIsRunningAsAuthoritative?() or !@_gameSession.getIsRunningAsAuthoritative()
      throw new Error("LocalStarterAIController requires an authoritative GameSession.")

    return @ if @_started

    @getAI()
    @_started = true

    eventBus = @_gameSession.getEventBus()
    eventBus.on(EVENTS.step, @_onSessionProgress)
    eventBus.on(EVENTS.start_turn, @_onSessionProgress)
    eventBus.on(EVENTS.status, @_onSessionProgress)
    eventBus.on(EVENTS.invalid_action, @_onInvalidAction)
    eventBus.on(EVENTS.terminate, @_onTerminate)

    @_scheduleNextAction()
    return @

  destroy: () ->
    if @_started
      eventBus = @_gameSession.getEventBus()
      eventBus.off(EVENTS.step, @_onSessionProgress)
      eventBus.off(EVENTS.start_turn, @_onSessionProgress)
      eventBus.off(EVENTS.status, @_onSessionProgress)
      eventBus.off(EVENTS.invalid_action, @_onInvalidAction)
      eventBus.off(EVENTS.terminate, @_onTerminate)

    @_started = false
    @_forceEndTurn = false
    @_cancelScheduledAction()
    return @

  _cancelScheduledAction: () ->
    if @_timerId?
      @_clearTimeout(@_timerId)
      @_timerId = null

  _scheduleNextAction: () ->
    if @_started and !@_timerId?
      @_timerId = @_setTimeout(@_runScheduledAction, @_actionDelayMs)

  _runNextAction: () ->
    @_timerId = null
    return if !@_started

    gameSession = @_gameSession
    return if gameSession.isOver()
    return if gameSession.hasStepsInQueue() or gameSession.hasActionsInQueue()

    if gameSession.isNew()
      aiPlayer = gameSession.getPlayerById(@_playerId)
      if aiPlayer? and !aiPlayer.getHasStartingHand()
        action = @_getNextAction()
        @_executeAction(action) if action?
      return

    return if !gameSession.isActive() or gameSession.getCurrentPlayerId() != @_playerId

    if @_forceEndTurn
      @_forceEndTurn = false
      action = gameSession.actionEndTurn()
    else
      action = @_getNextAction()
      action ?= gameSession.actionEndTurn()

    @_executeAction(action)

  _getNextAction: () ->
    try
      return @getAI().nextAction()
    catch error
      Logger.module("AI").error("Local StarterAI failed to choose an action", error)
      return null

  _executeAction: (action) ->
    return if !action?

    if @_gameSession.submitExplicitAction?
      submitted = @_gameSession.submitExplicitAction(action)
      if submitted == false
        @_forceEndTurn = true
        @_scheduleNextAction()
    else
      @_gameSession.executeAction(action)

module.exports = LocalStarterAIController
