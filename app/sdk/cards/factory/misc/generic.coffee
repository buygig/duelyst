# do not add this file to a package
# it is specifically parsed by the package generation script

_ = require 'underscore'
moment = require 'moment'
i18next = require 'i18next'
if i18next.t() is undefined
  i18next.t = (text) ->
    return text

Logger = require 'app/common/logger'

CONFIG = require('app/common/config')
RSX = require('app/data/resources')

Card = require 'app/sdk/cards/card'
Cards = require 'app/sdk/cards/cardsLookupComplete'
CardType = require 'app/sdk/cards/cardType'
Factions = require 'app/sdk/cards/factionsLookup'
FactionFactory = require 'app/sdk/cards/factionFactory'
Races = require 'app/sdk/cards/racesLookup'
Rarity = require 'app/sdk/cards/rarityLookup'

Spell = require 'app/sdk/spells/spell'
SpellFilterType = require 'app/sdk/spells/spellFilterType'
SpellDamage = require 'app/sdk/spells/spellDamage'
SpellApplyModifiers = require 'app/sdk/spells/spellApplyModifiers'
SpellKillTarget = require 'app/sdk/spells/spellKillTarget'
SpellFollowupTeleport = require 'app/sdk/spells/spellFollowupTeleport'
SpellFollowupTeleportToMe = require 'app/sdk/spells/spellFollowupTeleportToMe'
SpellFollowupTeleportMyGeneral = require 'app/sdk/spells/spellFollowupTeleportMyGeneral'
SpellSilence = require 'app/sdk/spells/spellSilence'
SpellSpawnEntity = require 'app/sdk/spells/spellSpawnEntity'
SpellCloneTargetEntity = require 'app/sdk/spells/spellCloneTargetEntity'
SpellCloneSourceEntity = require 'app/sdk/spells/spellCloneSourceEntity'
SpellKillTargetWithModifierRanged = require 'app/sdk/spells/spellKillTargetWithModifierRanged'
SpellDunecasterFollowup = require 'app/sdk/spells/spellDunecasterFollowup'
SpellFollowupSwapPositions = require 'app/sdk/spells/spellFollowupSwapPositions'
SpellFollowupDamage = require 'app/sdk/spells/spellFollowupDamage'
SpellFollowupHeal = require 'app/sdk/spells/spellFollowupHeal'
SpellMindControlByAttackValue = require 'app/sdk/spells/spellMindControlByAttackValue'
SpellFollowupRandomTeleport = require 'app/sdk/spells/spellFollowupRandomTeleport'
SpellFollowupKeeper = require 'app/sdk/spells/spellFollowupKeeper'
SpellFollowupHollowGroveKeeper = require 'app/sdk/spells/spellFollowupHollowGroveKeeper'
SpellFollowupKillTargetByAttack = require 'app/sdk/spells/spellFollowupKillTargetByAttack'
SpellCloneSourceEntityNearbyGeneral = require 'app/sdk/spells/spellCloneSourceEntityNearbyGeneral'
SpellDoubleAttackAndHealth = require 'app/sdk/spells/spellDoubleAttackAndHealth'
SpellHatchAnEgg = require 'app/sdk/spells/spellHatchAnEgg'
SpellFollowupActivateBattlePet = require 'app/sdk/spells/spellFollowupActivateBattlePet'
SpellSpawnEntityAndApplyPlayerModifiers = require 'app/sdk/spells/spellSpawnEntityAndApplyPlayerModifiers'
SpellFollowupTeleportMyGeneralBehindEnemy = require 'app/sdk/spells/spellFollowupTeleportMyGeneralBehindEnemy'
SpellFollowupTeleportInFrontOfAnyGeneral = require 'app/sdk/spells/spellFollowupTeleportInFrontOfAnyGeneral'
SpellSpawnNeutralEntity = require 'app/sdk/spells/spellSpawnNeutralEntity'
SpellFollowupFight = require 'app/sdk/spells/spellFollowupFight'
SpellOverwatch = require 'app/sdk/spells/spellOverwatch'
SpellBounceToActionBarSpawnEntity = require 'app/sdk/spells/spellBounceToActionBarSpawnEntity'
SpellFollowupTeleportToFriendlyCreep = require 'app/sdk/spells/spellFollowupTeleportToFriendlyCreep'
SpellFollowupTeleportNearMyGeneral = require 'app/sdk/spells/spellFollowupTeleportNearMyGeneral'
SpellBounceToActionbar = require 'app/sdk/spells/spellBounceToActionbar'
SpellDuplicator = require 'app/sdk/spells/spellDuplicator'
SpellApplyPlayerModifiers = require 'app/sdk/spells/spellApplyPlayerModifiers'
SpellFollowupSpawnEntityFromDeck = require 'app/sdk/spells/spellFollowupSpawnEntityFromDeck'
SpellDamageOrHeal = require 'app/sdk/spells/spellDamageOrHeal'

PlayerModifierMechazorBuildProgress = require 'app/sdk/playerModifiers/playerModifierMechazorBuildProgress'
PlayerModifierMechazorSummoned = require 'app/sdk/playerModifiers/playerModifierMechazorSummoned'

GameSessionModifierFestiveSpirit = require 'app/sdk/gameSessionModifiers/gameSessionModifierFestiveSpirit'

class CardFactory_Generic

  ###*
   * Returns a card that matches the identifier.
   * @param {Number|String} identifier
   * @param {GameSession} gameSession
   * @returns {Card}
   ###
  @cardForIdentifier: (identifier,gameSession) ->
    card = null

    if (identifier == Cards.Spell.MindControlByAttackValue)
      card = new SpellMindControlByAttackValue(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.Enslave
      card.name = i18next.t("cards.runtime_misc_generic_mind_control_by_attack_value_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_mind_control_by_attack_value_desc"))
      card.manaCost = 0
      card.setFXResource(["FX.Cards.Spell.MindControlByAttackValue"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidpulse.audio
      )

    if (identifier == Cards.Spell.Repulsion)
      card = new Spell(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.Repulsion
      card.name = i18next.t("cards.runtime_misc_generic_repulsion_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_repulsion_desc"))
      card.manaCost = 0
      card.targetType = CardType.Unit
      card.setFollowups([{
        id: Cards.Spell.FollowupTeleport
      }])
      card.setFXResource(["FX.Cards.Spell.Repulsion"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidpulse.audio
      )

    if (identifier == Cards.Spell.FollowupTeleport)
      card = new SpellFollowupTeleport(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupTeleport
      card.name = i18next.t("cards.runtime_misc_generic_followup_teleport_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_teleport_desc"))
      card.setFollowupConditions([SpellFollowupTeleport.followupConditionTargetToTeleport])
      card.setFXResource(["FX.Cards.Spell.FollowupTeleport"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_naturalselection.audio
      )

    if (identifier == Cards.Spell.FollowupTeleportEnemyToMe)
      card = new SpellFollowupTeleportToMe(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupTeleportEnemyToMe
      card.name = i18next.t("cards.runtime_misc_generic_followup_teleport_enemy_to_me_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_teleport_enemy_to_me_desc"))
      card.setFollowupConditions([SpellFollowupTeleportToMe.followupConditionCanTeleportToMe])
      card.spellFilterType = SpellFilterType.EnemyDirect
      card.setFXResource(["FX.Cards.Spell.FollowupTeleportEnemyToMe"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_martyrdom.audio
      )

    if (identifier == Cards.Spell.FollowupTeleportMyGeneral)
      card = new SpellFollowupTeleportMyGeneral(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupTeleportMyGeneral
      card.name = i18next.t("cards.runtime_misc_generic_followup_teleport_my_general_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_teleport_my_general_desc"))
      card.setFXResource(["FX.Cards.Spell.FollowupTeleportMyGeneral"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_martyrdom.audio
      )

    if (identifier == Cards.Spell.KillTarget)
      card = new SpellKillTarget(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.KillTarget
      card.name = i18next.t("cards.runtime_misc_generic_kill_target_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_kill_target_desc"))
      card.setFXResource(["FX.Cards.Spell.KillTarget"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_daemoniclure.audio
      )

    if (identifier == Cards.Spell.KillTargetWithRanged)
      card = new SpellKillTargetWithModifierRanged(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.KillTarget
      card.name = i18next.t("cards.runtime_misc_generic_kill_target_with_ranged_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_kill_target_with_ranged_desc"))
      card.setFXResource(["FX.Cards.Spell.KillTargetWithRanged"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidwalk.audio
      )

    if (identifier == Cards.Spell.SpawnEntity)
      card = new SpellSpawnEntity(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.SpawnEntity
      card.name = i18next.t("cards.runtime_misc_generic_spawn_entity_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_spawn_entity_desc"))
      card.manaCost = 0
      card.setFXResource(["FX.Factions.Neutral.UnitSpawnFX","FX.Cards.Spell.SpawnEntity"])
      card.setBaseSoundResource(
        apply : RSX.sfx_f6_ancientgrove_attack_impact.audio
      )

    if (identifier == Cards.Spell.SpawnNeutralEntity)
      card = new SpellSpawnNeutralEntity(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.SpawnNeutralEntity
      card.name = i18next.t("cards.runtime_misc_generic_spawn_neutral_entity_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_spawn_neutral_entity_desc"))
      card.manaCost = 0
      card.setFXResource(["FX.Factions.Neutral.UnitSpawnFX","FX.Cards.Spell.SpawnNeutralEntity"])
      card.setBaseSoundResource(
        apply : RSX.sfx_f6_ancientgrove_attack_impact.audio
      )

    if (identifier == Cards.Spell.DeployMechaz0r)
      card = new SpellSpawnEntityAndApplyPlayerModifiers(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.DeployMechaz0r
      card.name = i18next.t("cards.runtime_misc_generic_deploy_mechaz0r_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_deploy_mechaz0r_desc"))
      card.applyToOwnGeneral = true
      card.targetModifiersContextObjects = [PlayerModifierMechazorSummoned.createContextObject()]
      card.manaCost = 0
      card.cardDataOrIndexToSpawn = {id: Cards.Neutral.Mechaz0r}
      card.setFollowupConditions([PlayerModifierMechazorBuildProgress.followupConditionIsMechazorComplete])
      card.setFXResource(["FX.Factions.Neutral.SpawnSpecialFX","FX.Cards.Spell.DeployMechaz0r"])
      card.setBaseSoundResource(
        apply : RSX.sfx_neutral_jaxtruesight_attack_swing.audio
      )

    if (identifier == Cards.Spell.CloneTargetEntity)
      card = new SpellCloneTargetEntity(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.CloneTargetEntity
      card.name = i18next.t("cards.runtime_misc_generic_clone_target_entity_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_clone_target_entity_desc"))
      card.manaCost = 0
      card.setFXResource(["FX.Factions.Neutral.UnitSpawnFX","FX.Cards.Spell.CloneTargetEntity"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidwalk.audio
      )

    if (identifier == Cards.Spell.CloneSourceEntity)
      card = new SpellCloneSourceEntity(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.CloneSourceEntity
      card.name = i18next.t("cards.runtime_misc_generic_clone_source_entity_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_clone_source_entity_desc"))
      card.manaCost = 0
      card.setFXResource(["FX.Factions.Neutral.UnitSpawnFX","FX.Cards.Spell.CloneSourceEntity"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidwalk.audio
      )

    if (identifier == Cards.Spell.CloneSourceEntity2X)
      card = new SpellCloneSourceEntity(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.CloneSourceEntity2X
      card.name = i18next.t("cards.runtime_misc_generic_clone_source_entity_2_x_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_clone_source_entity_2_x_desc"))
      card.manaCost = 0
      card.setFollowups([{
        id: Cards.Spell.CloneSourceEntity
      }])
      card.setFXResource(["FX.Factions.Neutral.UnitSpawnFX","FX.Cards.Spell.CloneSourceEntity2X"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidwalk.audio
      )

    if (identifier == Cards.Spell.CloneSourceEntity3X)
      card = new SpellCloneSourceEntity(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.CloneSourceEntity3X
      card.name = i18next.t("cards.runtime_misc_generic_clone_source_entity_3_x_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_clone_source_entity_3_x_desc"))
      card.manaCost = 0
      card.setFollowups([{
        id: Cards.Spell.CloneSourceEntity2X
      }])
      card.setFXResource(["FX.Factions.Neutral.UnitSpawnFX","FX.Cards.Spell.CloneSourceEntity3X"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidwalk.audio
      )

    if (identifier == Cards.Spell.CloneSourceEntity4X)
      card = new SpellCloneSourceEntity(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.CloneSourceEntity4X
      card.name = i18next.t("cards.runtime_misc_generic_clone_source_entity_4_x_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_clone_source_entity_4_x_desc"))
      card.manaCost = 0
      card.setFollowups([{
        id: Cards.Spell.CloneSourceEntity3X
      }])
      card.setFXResource(["FX.Factions.Neutral.UnitSpawnFX","FX.Cards.Spell.CloneSourceEntity3X"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidwalk.audio
      )

    if (identifier == Cards.Spell.CloneSourceEntityNearbyGeneral)
      card = new SpellCloneSourceEntityNearbyGeneral(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.CloneSourceEntityNearbyGeneral
      card.name = i18next.t("cards.runtime_misc_generic_clone_source_entity_nearby_general_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_clone_source_entity_nearby_general_desc"))
      card.manaCost = 0
      card.setFXResource(["FX.Factions.Neutral.UnitSpawnFX","FX.Cards.Spell.CloneSourceEntity"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidwalk.audio
      )

    if (identifier == Cards.Spell.CloneSourceEntityNearbyGeneral2X)
      card = new SpellCloneSourceEntityNearbyGeneral(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.CloneSourceEntityNearbyGeneral2X
      card.name = i18next.t("cards.runtime_misc_generic_clone_source_entity_nearby_general_2_x_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_clone_source_entity_nearby_general_2_x_desc"))
      card.manaCost = 0
      card.setFollowups([{
        id: Cards.Spell.CloneSourceEntityNearbyGeneral
      }])
      card.setFXResource(["FX.Factions.Neutral.UnitSpawnFX","FX.Cards.Spell.CloneSourceEntity2X"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidwalk.audio
      )

    if (identifier == Cards.Spell.SpellDamage)
      card = new SpellDamage(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.SpellDamage
      card.name = i18next.t("cards.runtime_misc_generic_spell_damage_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_spell_damage_desc"))
      card.spellFilterType = SpellFilterType.NeutralDirect
      card.setFXResource(["FX.Cards.Spell.SpellDamage"])
      card.setBaseSoundResource(
        apply : RSX.sfx_f5_general_attack_swing.audio
      )

    if (identifier == Cards.Spell.FollowupDamage)
      card = new SpellFollowupDamage(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupDamage
      card.name = i18next.t("cards.runtime_misc_generic_followup_damage_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_damage_desc"))
      card.spellFilterType = SpellFilterType.NeutralDirect
      card.setFXResource(["FX.Cards.Spell.FollowupDamage"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_immolation_a.audio
      )

    if (identifier == Cards.Spell.FollowupHeal)
      card = new SpellFollowupHeal(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupHeal
      card.name = i18next.t("cards.runtime_misc_generic_followup_heal_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_heal_desc"))
      card.spellFilterType = SpellFilterType.NeutralDirect
      card.setFXResource(["FX.Cards.Spell.FollowupHeal"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_tranquility.audio
      )

    if (identifier == Cards.Spell.ApplyModifiers)
      card = new SpellApplyModifiers(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.ApplyModifiers
      card.name = i18next.t("cards.runtime_misc_generic_apply_modifiers_name")
      card.setFXResource(["FX.Cards.Spell.ApplyModifiers"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_tranquility.audio
      )

    if (identifier == Cards.Spell.DunecasterFollowup)
      card = new SpellDunecasterFollowup(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.DunecasterFollowup
      card.name = i18next.t("cards.runtime_misc_generic_dunecaster_followup_name")
      card.setFXResource(["FX.Cards.Spell.ApplyModifiers"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_tranquility.audio
      )

    if (identifier == Cards.Spell.Dispel)
      card = new SpellSilence(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.Dispel
      card.name = i18next.t("cards.runtime_misc_generic_dispel_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_dispel_desc"))
      card.manaCost = 0
      card.spellFilterType = SpellFilterType.None
      card.setFXResource(["FX.Cards.Spell.Dispel"])
      card.setBaseSoundResource(
        apply : RSX.sfx_neutral_crossbones_attack_swing.audio
      )

    if (identifier == Cards.Spell.FollowupSwapPositions)
      card = new SpellFollowupSwapPositions(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.Juxtaposition
      card.name = i18next.t("cards.runtime_misc_generic_followup_swap_positions_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_swap_positions_desc"))
      card.spellFilterType = SpellFilterType.NeutralDirect
      card.manaCost = 0
      card.setFXResource(["FX.Cards.Spell.Juxtaposition"])
      card.setBaseSoundResource(
        apply : RSX.sfx_neutral_crossbones_attack_swing.audio
      )

    if (identifier == Cards.Spell.FollowupRandomTeleport)
      card = new SpellFollowupRandomTeleport(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupRandomTeleport
      card.name = i18next.t("cards.runtime_misc_generic_followup_random_teleport_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_random_teleport_desc"))
      card.setFXResource(["FX.Cards.Spell.FollowupRandomTeleport"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_naturalselection.audio
      )

    if (identifier == Cards.Spell.FollowupKeeper)
      card = new SpellFollowupKeeper(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollwupKeeper
      card.name = i18next.t("cards.runtime_misc_generic_followup_keeper_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_keeper_desc"))
      card.manaCost = 0
      card.setFXResource(["FX.Factions.Neutral.UnitSpawnFX","FX.Cards.Spell.FollowupKeeper"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidwalk.audio
      )

    if (identifier == Cards.Spell.FollowupHollowGroveKeeper)
      card = new SpellFollowupHollowGroveKeeper(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.KillTarget
      card.name = i18next.t("cards.runtime_misc_generic_followup_hollow_grove_keeper_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_hollow_grove_keeper_desc"))
      card.setFXResource(["FX.Cards.Spell.FollowupHollowGroveKeeper"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidwalk.audio
      )

    if (identifier == Cards.Spell.FollowupKillTargetByAttack)
      card = new SpellFollowupKillTargetByAttack(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupKillTargetByAttack
      card.name = i18next.t("cards.runtime_misc_generic_followup_kill_target_by_attack_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_kill_target_by_attack_desc"))
      card.manaCost = 0
      card.setFXResource(["FX.Factions.Neutral.UnitSpawnFX","FX.Cards.Spell.FollowupKillTargetByAttack"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_voidwalk.audio
      )

    if (identifier == Cards.Spell.DoubleAttackAndHealth)
      card = new SpellDoubleAttackAndHealth(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.DoubleAttackAndHealth
      card.name = i18next.t("cards.runtime_misc_generic_double_attack_and_health_name")
      card.setFXResource(["FX.Cards.Spell.ApplyModifiers"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_tranquility.audio
      )

    if (identifier == Cards.Spell.HatchAnEgg)
      card = new SpellHatchAnEgg(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.HatchAnEgg
      card.name = i18next.t("cards.runtime_misc_generic_hatch_an_egg_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_hatch_an_egg_desc"))
      card.manaCost = 0
      card.setFXResource(["FX.Cards.Spell.HatchAnEgg"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_boneswarm.audio
      )
      card.setBaseAnimResource(
        idle : RSX.iconEggMorphIdle.name
        active : RSX.iconEggMorphActive.name
      )

    if (identifier == Cards.Spell.FollowupActivateBattlepet)
      card = new SpellFollowupActivateBattlePet(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupActivateBattlepet
      card.name = i18next.t("cards.runtime_misc_generic_followup_activate_battlepet_name")
      card.setFXResource(["FX.Cards.Spell.ApplyModifiers"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_tranquility.audio
      )

    if (identifier == Cards.Spell.FollowupTeleportMyGeneralBehindEnemy)
      card = new SpellFollowupTeleportMyGeneralBehindEnemy(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupTeleportMyGeneralBehindEnemy
      card.name = i18next.t("cards.runtime_misc_generic_followup_teleport_my_general_behind_enemy_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_teleport_my_general_behind_enemy_desc"))
      card.setFXResource(["FX.Cards.Spell.FollowupTeleportMyGeneralBehindEnemy"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_naturalselection.audio
      )

    if (identifier == Cards.Spell.FollowupTeleportInFrontOfAnyGeneral)
      card = new SpellFollowupTeleportInFrontOfAnyGeneral(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupTeleportInFrontOfAnyGeneral
      card.name = i18next.t("cards.runtime_misc_generic_followup_teleport_in_front_of_any_general_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_teleport_in_front_of_any_general_desc"))
      card.setFXResource(["FX.Cards.Spell.FollowupTeleportInFrontOfAnyGeneral"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_naturalselection.audio
      )

    if (identifier == Cards.Spell.FollowupFight)
      card = new SpellFollowupFight(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupFight
      card.name = i18next.t("cards.runtime_misc_generic_followup_fight_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_fight_desc"))
      card.setFXResource(["FX.Cards.Spell.FollowupFight"])
      card.setBaseSoundResource(
        apply : RSX.sfx_singe2.audio
      )

    ###
    if (identifier == Cards.Spell.Overwatch)
      card = new SpellOverwatch(gameSession)
      card.setIsHiddenInCollection(true)
      card.setFXResource(["FX.Cards.Spell.Overwatch"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_forcebarrier.audio
      )
      card.setBaseAnimResource(
        idle : RSX.iconAurynNexusIdle.name
        active : RSX.iconAurynNexusActive.name
      )
    ###

    if (identifier == Cards.Spell.BounceMinionSpawnEntity)
      card = new SpellBounceToActionBarSpawnEntity(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.BounceMinionSpawnEntity
      card.name = i18next.t("cards.runtime_misc_generic_bounce_minion_spawn_entity_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_bounce_minion_spawn_entity_desc"))
      card.manaCost = 0
      card.spellFilterType = SpellFilterType.NeutralDirect
      card.setFXResource(["FX.Cards.Spell.BounceMinionSpawnEntity"])
      card.setBaseAnimResource(
        idle: RSX.iconHailstonePrisonIdle.name
        active: RSX.iconHailstonePrisonActive.name
      )
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_icepillar.audio
      )

    if (identifier == Cards.Spell.FollowupTeleportToFriendlyCreep)
      card = new SpellFollowupTeleportToFriendlyCreep(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupTeleportToFriendlyShadowCreep
      card.name = i18next.t("cards.runtime_misc_generic_followup_teleport_to_friendly_creep_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_teleport_to_friendly_creep_desc"))
      card.setFollowupConditions([SpellFollowupTeleport.followupConditionTargetToTeleport])
      card.setFXResource(["FX.Cards.Spell.FollowupTeleport"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_naturalselection.audio
      )

    if (identifier == Cards.Spell.FollowupTeleportNearMyGeneral)
      card = new SpellFollowupTeleportNearMyGeneral(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupTeleportNearMyGeneral
      card.name = i18next.t("cards.runtime_misc_generic_followup_teleport_near_my_general_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_followup_teleport_near_my_general_desc"))
      card.setFollowupConditions([SpellFollowupTeleport.followupConditionTargetToTeleport])
      card.setFXResource(["FX.Cards.Spell.FollowupTeleport"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_naturalselection.audio
      )

    if (identifier == Cards.Spell.SpellDuplicator)
      card = new SpellDuplicator(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.SpellDuplicator
      card.name = i18next.t("cards.runtime_misc_generic_spell_duplicator_name")
      card.manaCost = 0
      card.setFXResource(["FX.Cards.Spell.ApplyModifiers"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_tranquility.audio
      )

    if (identifier == Cards.Spell.FestiveSpirit)
      card = new SpellApplyPlayerModifiers(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FestiveSpirit
      card.name = i18next.t("cards.runtime_misc_generic_festive_spirit_name")
      card.setDescription(i18next.t("cards.runtime_misc_generic_festive_spirit_desc"))
      card.applyToOwnGeneral = true
      card.setTargetModifiersContextObjects([GameSessionModifierFestiveSpirit.createContextObject()])
      card.setFXResource(["FX.Cards.Spell.FestiveSpirit"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_naturalselection.audio
      )

    if (identifier == Cards.Spell.FollowupSpawnEntityFromDeck)
      card = new SpellFollowupSpawnEntityFromDeck(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.FollowupSpawnEntityFromDeck
      card.spellFilterType = SpellFilterType.SpawnSource
      card.name = i18next.t("cards.runtime_misc_generic_followup_spawn_entity_from_deck_name")
      card.manaCost = 0
      card.setFXResource(["FX.Cards.Spell.ApplyModifiers"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_tranquility.audio
      )

    if (identifier == Cards.Spell.SpellDamageOrHeal)
      card = new SpellDamageOrHeal(gameSession)
      card.factionId = Factions.Neutral
      card.setIsHiddenInCollection(true)
      card.id = Cards.Spell.SpellDamageOrHeal
      card.name = i18next.t("cards.runtime_misc_generic_spell_damage_or_heal_name")
      card.manaCost = 0
      card.setFXResource(["FX.Cards.Spell.ApplyModifiers"])
      card.setBaseSoundResource(
        apply : RSX.sfx_spell_tranquility.audio
      )

    return card

module.exports = CardFactory_Generic
