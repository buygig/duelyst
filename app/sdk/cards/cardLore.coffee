Cards = require './cardsLookupComplete'
i18next = require 'i18next'
EnglishLore = require './locales/en'
ChineseLore = require './locales/zh-cn'

localizedFields = ['name', 'description', 'text']

mergeLoreContent = (metadata, content) ->
  lore = Object.assign({}, metadata)
  for field in localizedFields
    lore[field] = content[field] if content?[field]?
  return lore

isSimplifiedChinese = () ->
  language = String(i18next.language or i18next.lng or '').toLowerCase()
  return language == 'zh' or language == 'zh-cn' or language.indexOf('zh-cn-') == 0

class CardLore

  @loreByCardId: {}
  @localeKeyByCardId: {}
  @_cachedAllLoreIdentifiers: null

  @loreForIdentifier: (identifier) ->
    metadata = @loreByCardId[identifier]
    return unless metadata?

    localeKey = @localeKeyByCardId[identifier]
    lore = mergeLoreContent(metadata, EnglishLore[localeKey])
    if isSimplifiedChinese() and ChineseLore[localeKey]?
      lore = mergeLoreContent(lore, ChineseLore[localeKey])
    return lore

  @getAllLore: () ->
    if !@_cachedAllLoreIdentifiers?
      @_cachedAllLoreIdentifiers = Object.keys(@loreByCardId)
    return (@loreForIdentifier(identifier) for identifier in @_cachedAllLoreIdentifiers)

registerLore = (identifier, localeKey) ->
  CardLore.loreByCardId[identifier] = {
    id: identifier
    enabled: true
  }
  CardLore.localeKeyByCardId[identifier] = localeKey

registerLore Cards.Faction4.ReaperNineMoons, 'Faction4.ReaperNineMoons'
registerLore Cards.Faction5.EarthWalker, 'Faction5.EarthWalker'
registerLore Cards.Faction5.Grimrock, 'Faction5.Grimrock'
registerLore Cards.Faction5.Kolossus, 'Faction5.Kolossus'
registerLore Cards.Faction5.PrimordialGazer, 'Faction5.PrimordialGazer'
registerLore Cards.Neutral.BloodshardGolem, 'Neutral.BloodshardGolem'
registerLore Cards.Neutral.BrightmossGolem, 'Neutral.BrightmossGolem'
registerLore Cards.Neutral.Crossbones, 'Neutral.Crossbones'
registerLore Cards.Neutral.CrimsonOculus, 'Neutral.CrimsonOculus'
registerLore Cards.Neutral.GolemMetallurgist, 'Neutral.GolemMetallurgist'
registerLore Cards.Neutral.GolemVanquisher, 'Neutral.GolemVanquisher'
registerLore Cards.Neutral.HailstoneGolem, 'Neutral.HailstoneGolem'
registerLore Cards.Neutral.Mogwai, 'Neutral.Mogwai'
registerLore Cards.Neutral.SkyrockGolem, 'Neutral.SkyrockGolem'
registerLore Cards.Neutral.StormmetalGolem, 'Neutral.StormmetalGolem'
registerLore Cards.Spell.AerialRift, 'Spell.AerialRift'
registerLore Cards.Spell.BoundedLifeforce, 'Spell.BoundedLifeforce'
registerLore Cards.Spell.BreathOfTheUnborn, 'Spell.BreathOfTheUnborn'
registerLore Cards.Spell.CosmicFlesh, 'Spell.CosmicFlesh'
registerLore Cards.Spell.DarkSeed, 'Spell.DarkSeed'
registerLore Cards.Spell.FlashReincarnation, 'Spell.FlashReincarnation'
registerLore Cards.Spell.GhostLightning, 'Spell.GhostLightning'
registerLore Cards.Spell.LastingJudgement, 'Spell.LastingJudgement'
registerLore Cards.Spell.Martyrdom, 'Spell.Martyrdom'
registerLore Cards.Spell.MistWalking, 'Spell.MistWalking'
registerLore Cards.Spell.SiphonEnergy, 'Spell.SiphonEnergy'
registerLore Cards.Spell.SundropElixir, 'Spell.SundropElixir'
registerLore Cards.Spell.TrueStrike, 'Spell.TrueStrike'
registerLore Cards.Faction1.SunSister, 'Faction1.SunSister'
registerLore Cards.Faction2.LightningSister, 'Faction2.LightningSister'
registerLore Cards.Faction3.SandSister, 'Faction3.SandSister'
registerLore Cards.Faction4.ShadowSister, 'Faction4.ShadowSister'
registerLore Cards.Faction5.EarthSister, 'Faction5.EarthSister'
registerLore Cards.Faction6.WindSister, 'Faction6.WindSister'
registerLore Cards.Neutral.SwornSister, 'Neutral.SwornSister'
registerLore Cards.Faction3.General, 'Faction3.General'
registerLore Cards.Spell.Blindscorch, 'Spell.Blindscorch'
registerLore Cards.Spell.ScionsFirstWish, 'Spell.ScionsFirstWish'
registerLore Cards.Faction3.Pyromancer, 'Faction3.Pyromancer'
registerLore Cards.Faction3.AltGeneral, 'Faction3.AltGeneral'
registerLore Cards.Spell.ScionsSecondWish, 'Spell.ScionsSecondWish'
registerLore Cards.Artifact.StaffOfYKir, 'Artifact.StaffOfYKir'
registerLore Cards.Spell.EntropicDecay, 'Spell.EntropicDecay'
registerLore Cards.Faction1.General, 'Faction1.General'
registerLore Cards.Spell.BeamShock, 'Spell.BeamShock'
registerLore Cards.Artifact.SunstoneBracers, 'Artifact.SunstoneBracers'
registerLore Cards.Spell.WarSurge, 'Spell.WarSurge'
registerLore Cards.Faction2.AltGeneral, 'Faction2.AltGeneral'
registerLore Cards.Spell.PhoenixFire, 'Spell.PhoenixFire'

module.exports = CardLore
