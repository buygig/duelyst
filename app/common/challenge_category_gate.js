const OfflineMode = require('./offline_mode');

function getLockState(options) {
  const gateOptions = options || {};
  const bypassProgressionGates = gateOptions.bypassProgressionGates == null
    ? OfflineMode.isEnabled()
    : gateOptions.bypassProgressionGates;

  // Offline profiles deliberately skip the retired onboarding flow and do not
  // have an online match counter, so those prerequisites can never be met.
  if (bypassProgressionGates) {
    return {
      enabled: true,
      needsTutorial: false,
      gamesNeeded: 0,
    };
  }

  const needsTutorial = !gateOptions.isTutorialCategory && !gateOptions.hasAttemptedTutorial;
  const gameCount = Math.max(0, Number(gateOptions.gameCount) || 0);
  const gameCountRequired = Math.max(0, Number(gateOptions.gameCountRequired) || 0);
  const gamesNeeded = Math.max(0, gameCountRequired - gameCount);

  return {
    enabled: !needsTutorial && gamesNeeded === 0,
    needsTutorial,
    gamesNeeded,
  };
}

function shouldIncludeTutorialCategory(options) {
  const gateOptions = options || {};
  const offlineMode = gateOptions.offlineMode == null
    ? OfflineMode.isEnabled()
    : gateOptions.offlineMode;

  return !gateOptions.isProduction || offlineMode;
}

module.exports = {
  getLockState,
  shouldIncludeTutorialCategory,
};
