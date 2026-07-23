# do not add this file to any resource package
# it is handled by special processing
RSX = require('app/data/resources')
i18next = require 'i18next'
CodexEnChapters = require './locales/en'
CodexChapters = require './codexChapterLookup'
CodexZhCnChapters = require './locales/zh-cn'

mergeChapterContent = (metadata, content) ->
  chapter = Object.assign({}, metadata)
  for field in ['name', 'description', 'text']
    chapter[field] = content[field] if content?[field]?
  return chapter

sortedChapterIdentifiers = (chapters) ->
  return Object.keys(chapters).sort (left, right) -> Number(left) - Number(right)

class Codex

  @chapters: {}

  @chapterForIdentifier: (identifier) ->
    chapterMetadata = @chapters[identifier]
    if chapterMetadata
      chapter = mergeChapterContent(chapterMetadata, CodexEnChapters[String(identifier)])
      language = String(i18next.language or i18next.lng or '').toLowerCase()
      localizedChapter = CodexZhCnChapters[String(identifier)]
      if (language == 'zh' or language == 'zh-cn' or language.indexOf('zh-cn-') == 0) and localizedChapter?
        return mergeChapterContent(chapter, localizedChapter)
      return chapter
    else
      console.error "Codex.chapterForIdentifier - Unknown lore identifier: #{identifier}".red

  @getAllChapters: () ->
    chapters = []

    chapterIdentifiers = sortedChapterIdentifiers(Codex.chapters)
    for chapterIdentifier in chapterIdentifiers
      chapter = @chapterForIdentifier(chapterIdentifier)
      if chapter? then chapters.push(chapter)

    return chapters

  ###*
  # Returns the chapter ids that should be given for a player UPON reaching the provided game count
  # @public
  # @param  {ints}    gameCount     Game count the player has reached
  # @return  {Array(int)}    identifiers of chapters a player should be given (from CodexChapterLookup)
  ###
  @chapterIdsAwardedForGameCount: (gameCount) ->
    awardedChapterIds = []

    if not gameCount?
      gameCount = 0

    chapterIdentifiers = sortedChapterIdentifiers(Codex.chapters)
    for chapterIdentifier in chapterIdentifiers
      chapter = @chapterForIdentifier(chapterIdentifier)
      if chapter? && chapter.gamesRequiredToUnlock == gameCount && chapter.enabled
        awardedChapterIds.push(chapterIdentifier)

    return awardedChapterIds

  ###*
  # Returns the chapter ids that should be owned by a player with the provided game count
  # @public
  # @param  {ints}    gameCount     Game count the player has reached
  # @return  {Array(int)}    identifiers of chapters a player should own (from CodexChapterLookup)
  ###
  @chapterIdsOwnedByGameCount: (gameCount) ->
    ownedChapterIds = []

    if not gameCount?
      gameCount = 0

    chapterIdentifiers = sortedChapterIdentifiers(Codex.chapters)
    for chapterIdentifier in chapterIdentifiers
      chapter = @chapterForIdentifier(chapterIdentifier)
      if chapter? && chapter.gamesRequiredToUnlock <= gameCount && chapter.enabled
        ownedChapterIds.push(chapterIdentifier)

    return ownedChapterIds

# setup chapters data
c = Codex.chapters

c[CodexChapters.Chapter1] = {
  id: CodexChapters.Chapter1,
  img: RSX.chapter1_preview.img,
  background: RSX.chapter1_background.img,
  #audio: RSX.chapter1_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 0
}

c[CodexChapters.Chapter2] = {
  id: CodexChapters.Chapter2,
  img: RSX.chapter2_preview.img,
  background: RSX.chapter2_background.img,
  #audio: RSX.chapter2_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 0
}

c[CodexChapters.Chapter3] = {
  id: CodexChapters.Chapter3,
  img: RSX.chapter3_preview.img,
  background: RSX.chapter3_background.img,
  #audio: RSX.chapter3_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 0
}

c[CodexChapters.Chapter4] = {
  id: CodexChapters.Chapter4,
  img: RSX.chapter4_preview.img,
  background: RSX.chapter4_background.img,
  #audio: RSX.chapter4_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 0
}

c[CodexChapters.Chapter5] = {
  id: CodexChapters.Chapter5,
  img: RSX.chapter5_preview.img,
  background: RSX.chapter5_background.img,
  #audio: RSX.chapter5_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 0
}

c[CodexChapters.Chapter6] = {
  id: CodexChapters.Chapter6,
  img: RSX.chapter6_preview.img,
  background: RSX.chapter6_background.img,
  #audio: RSX.chapter6_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 1
}

c[CodexChapters.Chapter7] = {
  id: CodexChapters.Chapter7,
  img: RSX.chapter7_preview.img,
  background: RSX.chapter7_background.img,
  #audio: RSX.chapter7_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 2
}

c[CodexChapters.Chapter8] = {
  id: CodexChapters.Chapter8,
  img: RSX.chapter8_preview.img,
  background: RSX.chapter8_background.img,
  #audio: RSX.chapter8_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 3
}

c[CodexChapters.Chapter9] = {
  id: CodexChapters.Chapter9,
  img: RSX.chapter9_preview.img,
  background: RSX.chapter9_background.img,
  #audio: RSX.chapter9_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 4
}

c[CodexChapters.Chapter10] = {
  id: CodexChapters.Chapter10,
  img: RSX.chapter10_preview.img,
  background: RSX.chapter10_background.img,
  #audio: RSX.chapter10_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 5
}

c[CodexChapters.Chapter11] = {
  id: CodexChapters.Chapter11,
  img: RSX.chapter11_preview.img,
  background: RSX.chapter11_background.img,
  #audio: RSX.chapter11_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 6
}

c[CodexChapters.Chapter12] = {
  id: CodexChapters.Chapter12,
  img: RSX.chapter12_preview.img,
  background: RSX.chapter12_background.img,
  #audio: RSX.chapter12_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 7
}

c[CodexChapters.Chapter13] = {
  id: CodexChapters.Chapter13,
  img: RSX.chapter13_preview.img,
  background: RSX.chapter13_background.img,
  #audio: RSX.chapter13_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 8
}

c[CodexChapters.Chapter14] = {
  id: CodexChapters.Chapter14,
  img: RSX.chapter14_preview.img,
  background: RSX.chapter14_background.img,
  #audio: RSX.chapter14_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 9
}

c[CodexChapters.Chapter15] = {
  id: CodexChapters.Chapter15,
  img: RSX.chapter15_preview.img,
  background: RSX.chapter15_background.img,
  #audio: RSX.chapter15_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 10
}

c[CodexChapters.Chapter16] = {
  id: CodexChapters.Chapter16,
  img: RSX.chapter16_preview.img,
  background: RSX.chapter16_background.img,
  #audio: RSX.chapter16_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 12
}

c[CodexChapters.Chapter17] = {
  id: CodexChapters.Chapter17,
  img: RSX.chapter17_preview.img,
  background: RSX.chapter17_background.img,
  #audio: RSX.chapter17_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 14
}

c[CodexChapters.Chapter18] = {
  id: CodexChapters.Chapter18,
  img: RSX.chapter18_preview.img,
  background: RSX.chapter18_background.img,
  #audio: RSX.chapter18_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 16
}

c[CodexChapters.Chapter19] = {
  id: CodexChapters.Chapter19,
  img: RSX.chapter19_preview.img,
  background: RSX.chapter19_background.img,
  #audio: RSX.chapter19_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 18
}

c[CodexChapters.Chapter20] = {
  id: CodexChapters.Chapter20,
  img: RSX.chapter20_preview.img,
  background: RSX.chapter20_background.img,
  #audio: RSX.chapter20_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 20
}

c[CodexChapters.Chapter21] = {
  id: CodexChapters.Chapter21,
  img: RSX.chapter21_preview.img,
  background: RSX.chapter21_background.img,
  #audio: RSX.chapter21_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 22
}

c[CodexChapters.Chapter22] = {
  id: CodexChapters.Chapter22,
  img: RSX.chapter22_preview.img,
  background: RSX.chapter22_background.img,
  #audio: RSX.chapter22_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 24
}

c[CodexChapters.Chapter23] = {
  id: CodexChapters.Chapter23,
  img: RSX.chapter23_preview.img,
  background: RSX.chapter23_background.img,
  #audio: RSX.chapter23_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 26
}

c[CodexChapters.Chapter24] = {
  id: CodexChapters.Chapter24,
  img: RSX.chapter24_preview.img,
  background: RSX.chapter24_background.img,
  #audio: RSX.chapter24_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 28
}

c[CodexChapters.Chapter25] = {
  id: CodexChapters.Chapter25,
  img: RSX.chapter25_preview.img,
  background: RSX.chapter25_background.img,
  #audio: RSX.chapter25_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 30
}

c[CodexChapters.Chapter26] = {
  id: CodexChapters.Chapter26,
  img: RSX.chapter26_preview.img,
  background: RSX.chapter26_background.img,
  #audio: RSX.chapter26_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 32
}

c[CodexChapters.Chapter27] = {
  id: CodexChapters.Chapter27,
  img: RSX.chapter27_preview.img,
  background: RSX.chapter27_background.img,
  #audio: RSX.chapter27_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 34
}

c[CodexChapters.Chapter28] = {
  id: CodexChapters.Chapter28,
  img: RSX.chapter28_preview.img,
  background: RSX.chapter28_background.img,
  #audio: RSX.chapter28_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 36
}

c[CodexChapters.Chapter29] = {
  id: CodexChapters.Chapter29,
  img: RSX.chapter29_preview.img,
  background: RSX.chapter29_background.img,
  #audio: RSX.chapter29_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 38
}

c[CodexChapters.Chapter30] = {
  id: CodexChapters.Chapter30,
  img: RSX.chapter30_preview.img,
  background: RSX.chapter30_background.img,
  #audio: RSX.chapter30_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 40
}

c[CodexChapters.Chapter31] = {
  id: CodexChapters.Chapter31,
  "“Consular Draug!” Cassyva called out as he was about to disappear into the ship. He paused at the sight of five distant beauties in resplendent gowns approaching the blocked walkway. There was no time for Cassyva to use the Star Crystals, to consult with her sisters, or even to think things through. There was only time to act. In a single motion she pulled five blades hidden in her sleeves and cast them with as much magical force as she could summon. They spiraled and sliced through the air with deadly accuracy toward Draug...but at the last moment ricocheted harmlessly off an invisible magical barrier surrounding him. As it was, he watched impassively as the magically siphoned blades instead skewered his elite Defenders as they crumpled into the water with unceremonious splashes. Draug smiled and said, “Kill them.” Then he was gone."
  img: RSX.chapter31_preview.img,
  background: RSX.chapter31_background.img,
  #audio: RSX.chapter31_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 42
}

c[CodexChapters.Chapter32] = {
  id: CodexChapters.Chapter32,
  img: RSX.chapter32_preview.img,
  background: RSX.chapter32_background.img,
  #audio: RSX.chapter32_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 44
}

c[CodexChapters.Chapter33] = {
  id: CodexChapters.Chapter33,
  img: RSX.chapter33_preview.img,
  background: RSX.chapter33_background.img,
  #audio: RSX.chapter33_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 46
}

c[CodexChapters.Chapter34] = {
  id: CodexChapters.Chapter34,
  img: RSX.chapter34_preview.img,
  background: RSX.chapter34_background.img,
  #audio: RSX.chapter34_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 48
}

c[CodexChapters.Chapter35] = {
  id: CodexChapters.Chapter35,
  img: RSX.chapter35_preview.img,
  background: RSX.chapter35_background.img,
  #audio: RSX.chapter35_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 50
}

c[CodexChapters.Chapter36] = {
  id: CodexChapters.Chapter36,
  img: RSX.chapter36_preview.img,
  background: RSX.chapter36_background.img,
  #audio: RSX.chapter36_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 52
}

c[CodexChapters.Chapter37] = {
  id: CodexChapters.Chapter37,
  img: RSX.chapter37_preview.img,
  background: RSX.chapter37_background.img,
  #audio: RSX.chapter37_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 54
}

c[CodexChapters.Chapter38] = {
  id: CodexChapters.Chapter38,
  img: RSX.chapter38_preview.img,
  background: RSX.chapter38_background.img,
  #audio: RSX.chapter38_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 56
}

c[CodexChapters.Chapter39] = {
  id: CodexChapters.Chapter39,
  img: RSX.chapter39_preview.img,
  background: RSX.chapter39_background.img,
  #audio: RSX.chapter39_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 58
}

c[CodexChapters.Chapter40] = {
  id: CodexChapters.Chapter40,
  img: RSX.chapter40_preview.img,
  background: RSX.chapter40_background.img,
  #audio: RSX.chapter40_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 60
}

c[CodexChapters.Chapter41] = {
  id: CodexChapters.Chapter41,
  img: RSX.chapter41_preview.img,
  background: RSX.chapter41_background.img,
  #audio: RSX.chapter41_audio.audio,
  enabled: true,
  gamesRequiredToUnlock: 62
}

c[CodexChapters.ChaptersComingSoon] = {
  id: CodexChapters.ChaptersComingSoon,
  img: RSX.chapters_coming_soon_preview.img,
  enabled: false,
  gamesRequiredToUnlock: 0
}

module.exports = Codex
