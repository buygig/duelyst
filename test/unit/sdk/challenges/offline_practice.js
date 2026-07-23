const path = require('path');

require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');

const CONFIG = require('../../../../app/common/config');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const UsableDecks = require('../../../../packages/game-ai/decks/usable_decks');

Logger.enabled = false;

describe('OfflinePractice', () => {
  afterEach(() => {
    SDK.GameSession.reset();
  });

  it('creates a local authoritative non-sandbox session with an AI deck', () => {
    const playerDeck = UsableDecks.getAutomaticUsableDeck(SDK.Cards.Faction1.General, 1.0, 0);
    const challenge = new SDK.OfflinePractice({
      playerDeck,
      playerName: 'Local Player',
      aiGeneralId: SDK.Cards.Faction2.General,
      aiDifficulty: 0.5,
      aiNumRandomCards: 0,
    });
    const gameSession = SDK.GameSession.getInstance();
    gameSession.setUserId('local-player');

    challenge.setupSession(gameSession);

    expect(challenge).to.be.instanceof(SDK.Sandbox);
    expect(gameSession.getChallenge()).to.equal(challenge);
    expect(gameSession.getIsRunningAsAuthoritative()).to.equal(true);
    expect(gameSession.isChallenge()).to.equal(true);
    expect(gameSession.isSinglePlayer()).to.equal(false);
    expect(gameSession.isSandbox()).to.equal(false);
    expect(challenge.usesResetTurn).to.equal(false);
    expect(gameSession.getMyPlayerId()).to.equal('local-player');
    expect(gameSession.getAiPlayerId()).to.equal(CONFIG.AI_PLAYER_ID);
    expect(gameSession.getPlayer2Id()).to.equal(CONFIG.AI_PLAYER_ID);
    expect(gameSession.getAiDifficulty()).to.equal(0.5);
    expect(challenge.getOpponentAgent()).to.be.instanceof(SDK.LocalStarterAIController);
    expect(challenge.getOpponentAgent().getAI).to.be.a('function');
    expect(challenge.getOpponentAgent().getAI().getMyPlayerId()).to.equal(CONFIG.AI_PLAYER_ID);
    expect(gameSession.gameSetupData.players[0].deck).to.deep.equal(playerDeck);
    expect(gameSession.gameSetupData.players[1].deck[0].id).to.equal(SDK.Cards.Faction2.General);
    expect(gameSession.gameSetupData.players[1].deck.length).to.be.above(1);
  });

  it('defaults offline opponents to the complete full-strength AI', () => {
    const playerDeck = UsableDecks.getAutomaticUsableDeck(SDK.Cards.Faction1.General, 1.0, 0);
    const challenge = new SDK.OfflinePractice({
      playerDeck,
      playerName: 'Local Player',
      aiGeneralId: SDK.Cards.Faction2.General,
    });
    const gameSession = SDK.GameSession.getInstance();
    gameSession.setUserId('local-player');

    challenge.setupSession(gameSession);

    expect(SDK.OfflinePractice.DEFAULT_AI_DIFFICULTY).to.equal(1.0);
    expect(gameSession.getAiDifficulty()).to.equal(1.0);
    expect(gameSession.gameSetupData.players[1].deck).to.have.length(CONFIG.MAX_DECK_SIZE);
  });

  it('builds a complete default deck for every selectable AI faction', () => {
    const playerDeck = UsableDecks.getAutomaticUsableDeck(SDK.Cards.Faction1.General, 1.0, 0);
    const factionIds = [
      SDK.Factions.Faction1,
      SDK.Factions.Faction2,
      SDK.Factions.Faction3,
      SDK.Factions.Faction4,
      SDK.Factions.Faction5,
      SDK.Factions.Faction6,
    ];

    factionIds.forEach((factionId) => {
      const aiGeneralId = SDK.FactionFactory.generalIdForFactionByOrder(
        factionId,
        SDK.FactionFactory.GeneralOrder.Primary,
      );
      const challenge = new SDK.OfflinePractice({ playerDeck, aiGeneralId });

      expect(challenge.getOpponentPlayerDeckData(), `faction ${factionId}`).to.have.length(CONFIG.MAX_DECK_SIZE);
    });
  });

  it('is available through ChallengeFactory without entering the challenge list UI', () => {
    const challenge = SDK.ChallengeFactory.challengeForType(SDK.OfflinePractice.type);
    const tutorials = SDK.ChallengeFactory.getChallengesForCategoryType(SDK.ChallengeCategory.tutorial.type);

    expect(challenge).to.be.instanceof(SDK.OfflinePractice);
    expect(SDK.ChallengeFactory.getAllChallenges().some((item) => item instanceof SDK.OfflinePractice)).to.equal(true);
    expect(tutorials.length).to.be.above(0);
  });
});
