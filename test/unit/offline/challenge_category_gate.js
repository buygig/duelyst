const path = require('path');

require('app-module-path').addPath(path.join(__dirname, '../../../'));

const { expect } = require('chai');

const ChallengeCategoryGate = require('../../../app/common/challenge_category_gate');

describe('offline challenge category gates', () => {
  const previousOfflineMode = process.env.OFFLINE_MODE;

  afterEach(() => {
    if (previousOfflineMode == null) delete process.env.OFFLINE_MODE;
    else process.env.OFFLINE_MODE = previousOfflineMode;
  });

  it('unlocks challenge categories when offline onboarding and game counters are unavailable', () => {
    process.env.OFFLINE_MODE = 'true';

    expect(ChallengeCategoryGate.getLockState({
      isTutorialCategory: false,
      hasAttemptedTutorial: false,
      gameCount: 0,
      gameCountRequired: 20,
    })).to.deep.equal({
      enabled: true,
      needsTutorial: false,
      gamesNeeded: 0,
    });
  });

  it('preserves the tutorial requirement in connected mode', () => {
    process.env.OFFLINE_MODE = 'false';

    expect(ChallengeCategoryGate.getLockState({
      isTutorialCategory: false,
      hasAttemptedTutorial: false,
      gameCount: 20,
      gameCountRequired: 20,
    })).to.deep.equal({
      enabled: false,
      needsTutorial: true,
      gamesNeeded: 0,
    });
  });

  it('preserves match-count requirements in connected mode', () => {
    expect(ChallengeCategoryGate.getLockState({
      bypassProgressionGates: false,
      isTutorialCategory: false,
      hasAttemptedTutorial: true,
      gameCount: 2,
      gameCountRequired: 5,
    })).to.deep.equal({
      enabled: false,
      needsTutorial: false,
      gamesNeeded: 3,
    });
  });

  it('never makes the tutorial category depend on completing itself', () => {
    expect(ChallengeCategoryGate.getLockState({
      bypassProgressionGates: false,
      isTutorialCategory: true,
      hasAttemptedTutorial: false,
    })).to.deep.equal({
      enabled: true,
      needsTutorial: false,
      gamesNeeded: 0,
    });
  });

  it('keeps built-in training visible in an offline production build', () => {
    expect(ChallengeCategoryGate.shouldIncludeTutorialCategory({
      isProduction: true,
      offlineMode: true,
    })).to.equal(true);
  });

  it('preserves the connected production rule that hides the old tutorial category', () => {
    expect(ChallengeCategoryGate.shouldIncludeTutorialCategory({
      isProduction: true,
      offlineMode: false,
    })).to.equal(false);
  });
});
