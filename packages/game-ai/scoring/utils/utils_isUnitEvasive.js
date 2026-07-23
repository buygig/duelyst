const BOUNTY = require('packages/game-ai/scoring/bounty');
const ModifierRanged = require('app/sdk/modifiers/modifierRanged');
const ModifierBlastAttack = require('app/sdk/modifiers/modifierBlastAttack');
const ModifierEphemeral = require('app/sdk/modifiers/modifierEphemeral');
const ModifierForcefieldAbsorb = require('app/sdk/modifiers/modifierForcefieldAbsorb');
const isUnitBuffer = require('packages/game-ai/scoring/utils/utils_isUnitBuffer');

/**
 * Returns whether a unit is evasive.
 * @param {Unit} unit
 * @returns {Boolean}
 */
const isUnitEvasive = function (unit) {
  return (unit.hasModifierClass(ModifierRanged)
    || unit.hasModifierClass(ModifierBlastAttack)
    // Look into improving isUnitBuffer function.
    || (isUnitBuffer(unit) && unit.getHP() < BOUNTY.BUFFER_HP_EVASIVE_THRESHOLD && !unit.hasModifierClass(ModifierForcefieldAbsorb))
    || (unit.getIsGeneral() && unit.getHP() < BOUNTY.GENERAL_HP_EVASIVE_THRESHOLD))
    && !unit.hasModifierClass(ModifierEphemeral);
};

module.exports = isUnitEvasive;
