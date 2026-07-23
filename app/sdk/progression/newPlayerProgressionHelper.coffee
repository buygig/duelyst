
# lookups
NewPlayerProgressionStageEnum = require './newPlayerProgressionStageEnum'
NewPlayerFeatureLookup = require './newPlayerProgressionFeatureLookup'

class NewPlayerProgression

  @featureToCoreStageMapping:{}

  @FinalStage: NewPlayerProgressionStageEnum.FirstFactionLevelingDone
  @DailyQuestsStartToGenerateStage: NewPlayerProgressionStageEnum.FirstGameDone
  @FirstWinOfTheDayAvailableStage: NewPlayerProgressionStageEnum.FirstGameDone

  ###*
  # Check if a feature is available at a certain stage in new player guided progression.
  # @param  feature    Number(NewPlayerFeatureLookup)      Which feature.
  # @param  stage    Enum(NewPlayerProgressionStageEnum)    Which stage.
  # @returns         Boolean    Is it available.
  ###
  @isFeatureAvailableAtStage: (feature,stage)->
    # make sure to cast any stringts to enum
    stage = NewPlayerProgressionStageEnum[stage]
    stageWhenFeatureIsAvailable = NewPlayerProgression.featureToCoreStageMapping[feature]

    if !stageWhenFeatureIsAvailable?
      return true

    # return if the current stage is greater or equal to the stage when this feature becomes available
    return stage.value >= stageWhenFeatureIsAvailable.value

# feature to stage mapping
fMap = NewPlayerProgression.featureToCoreStageMapping
# main menu
fMap[NewPlayerFeatureLookup.MainMenuCollection] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.MainMenuWatch] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.MainMenuCodex] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.MainMenuCrates] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.MainMenuSpiritOrbs] = NewPlayerProgressionStageEnum.TutorialDone
# utility menu
fMap[NewPlayerFeatureLookup.UtilityMenuFriends] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.UtilityMenuQuests] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.UtilityMenuShop] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.UtilityMenuDailyChallenge] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.UtilityMenuFreeCardOfTheDay] = NewPlayerProgressionStageEnum.TutorialDone
# play modes
fMap[NewPlayerFeatureLookup.PlayModeFriendly] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.PlayModePractice] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.PlayModeSoloChallenges] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.PlayModeBossBattle] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.PlayModeCasual] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.PlayModeRanked] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.PlayModeGauntlet] = NewPlayerProgressionStageEnum.TutorialDone
# misc
fMap[NewPlayerFeatureLookup.FirstWinOfTheDay] = NewPlayerProgressionStageEnum.TutorialDone
fMap[NewPlayerFeatureLookup.Announcements] = NewPlayerProgressionStageEnum.TutorialDone

module.exports = NewPlayerProgression
