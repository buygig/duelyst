Challenge = require './challenge'
GameSetup = require './../gameSetup'
GameType = require 'app/sdk/gameType'
PlayModeFactory = require './../playModes/playModeFactory'
PlayModes = require './../playModes/playModesLookup'
i18next = require 'i18next'

class Sandbox extends Challenge

  @type: "Sandbox"
  type: "Sandbox"

  name: PlayModeFactory.playModeForIdentifier(PlayModes.Sandbox).name
  description: PlayModeFactory.playModeForIdentifier(PlayModes.Sandbox).description

  battleMapTemplateIndex: null # sandbox can use random battle maps

  player1Deck: null
  player2Deck: null
  skipMulligan: false
  customBoard: false

  setPlayer1DeckData: (player1Deck) ->
    @player1Deck = player1Deck

  getMyPlayerDeckData: () ->
    return @player1Deck

  setPlayer2DeckData: (player2Deck) ->
    @player2Deck = player2Deck

  getOpponentPlayerDeckData: () ->
    return @player2Deck

  setupSession:(gameSession)->
    return super(gameSession, {
      userId: gameSession.getUserId()
      name: i18next.t('common.offline_sandbox_player_one_name')
    }, {
      userId: gameSession.getUserId() + "test"
      name: i18next.t('common.offline_sandbox_player_two_name')
    })

  setupSessionModes: (gameSession) ->
    super(gameSession)
    gameSession.setGameType(GameType.Sandbox)

  setupOpponentAgent: () ->
    # no agent needed for sandbox

module.exports = Sandbox
