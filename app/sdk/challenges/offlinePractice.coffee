CONFIG = require 'app/common/config'
Challenge = require './challenge'
Sandbox = require './sandbox'
GameType = require 'app/sdk/gameType'
i18next = require 'i18next'

class OfflinePractice extends Sandbox

  @type: "OfflinePractice"
  @DEFAULT_AI_DIFFICULTY: 1.0
  @DEFAULT_AI_NUM_RANDOM_CARDS: 0
  type: "OfflinePractice"

  name: i18next.t('common.offline_practice_name')
  description: i18next.t('common.offline_practice_description')
  usesResetTurn: false

  constructor: (options) ->
    super()

    options ?= {}
    playerDeck = if options.playerDeck? then options.playerDeck else options.player1Deck
    @setPlayer1DeckData(playerDeck)

    @aiPlayerId = options.aiPlayerId or CONFIG.AI_PLAYER_ID
    @aiName = options.aiName or i18next.t('common.offline_ai_name')
    @aiGeneralId = options.aiGeneralId
    @aiDeckId = options.aiDeckId
    @aiDifficulty = if typeof options.aiDifficulty == "number" then Math.max(0.0, Math.min(1.0, options.aiDifficulty)) else OfflinePractice.DEFAULT_AI_DIFFICULTY
    @aiNumRandomCards = if typeof options.aiNumRandomCards == "number" then Math.max(0, Math.floor(options.aiNumRandomCards)) else OfflinePractice.DEFAULT_AI_NUM_RANDOM_CARDS
    @playerName = options.playerName or i18next.t('common.offline_player_name')

    if options.battleMapTemplateIndex?
      @battleMapTemplateIndex = options.battleMapTemplateIndex

  setPlayerDeckData: (playerDeck) ->
    @setPlayer1DeckData(playerDeck)

  setAiGeneralId: (aiGeneralId) ->
    @aiGeneralId = aiGeneralId
    @player2Deck = null

  setAiDeckId: (aiDeckId) ->
    @aiDeckId = aiDeckId
    @player2Deck = null

  setAiDifficulty: (aiDifficulty) ->
    @aiDifficulty = Math.max(0.0, Math.min(1.0, aiDifficulty))
    @player2Deck = null

  setAiNumRandomCards: (aiNumRandomCards) ->
    @aiNumRandomCards = Math.max(0, Math.floor(aiNumRandomCards))
    @player2Deck = null

  getOpponentPlayerDeckData: () ->
    if !@player2Deck?
      aiGeneralId = @aiGeneralId
      if !aiGeneralId? and @player1Deck? and @player1Deck.length > 0
        aiGeneralId = @player1Deck[0].id

      if !aiGeneralId?
        throw new Error("OfflinePractice requires an AI general or a player deck with a general.")

      # Loaded lazily so app/sdk can export OfflinePractice without creating a
      # circular SDK -> usable_decks -> SDK dependency during module bootstrap.
      UsableDecks = require 'packages/game-ai/decks/usable_decks'
      if @aiDeckId?
        @player2Deck = UsableDecks.getUsableDeckForIdentifier(aiGeneralId, @aiDeckId)
      else
        @player2Deck = UsableDecks.getAutomaticUsableDeck(aiGeneralId, @aiDifficulty, @aiNumRandomCards)

    return @player2Deck

  setupSession: (gameSession) ->
    if !@player1Deck? or @player1Deck.length == 0
      throw new Error("OfflinePractice requires a player deck.")

    aiDeck = @getOpponentPlayerDeckData()
    gameSession.setAiPlayerId(@aiPlayerId)
    gameSession.setAiDifficulty(@aiDifficulty)
    gameSession = Challenge::setupSession.call(@, gameSession, {
      userId: gameSession.getUserId()
      name: @playerName
      deck: @player1Deck
    }, {
      userId: @aiPlayerId
      name: @aiName
      deck: aiDeck
    })

    return gameSession

  setupOpponentAgent: (gameSession) ->
    LocalStarterAIController = require 'app/sdk/ai/localStarterAIController'
    @_opponentAgent = new LocalStarterAIController(gameSession, {
      playerId: @aiPlayerId
      difficulty: @aiDifficulty
    })

  setupSessionModes: (gameSession) ->
    # Keep Sandbox's local authoritative setup and normal GameLayout behavior,
    # but identify the match as a local challenge. SinglePlayer is a network
    # game type and would make post-game code expect a Firebase game model.
    super(gameSession)
    gameSession.setGameType(GameType.Challenge)

module.exports = OfflinePractice
