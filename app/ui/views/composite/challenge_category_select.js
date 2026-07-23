// pragma PKGS: nongame

'use strict';

var CONFIG = require('app/common/config');
var RSX = require('app/data/resources');
var audio_engine = require('app/audio/audio_engine');
var SDK = require('app/sdk');
var Scene = require('app/view/Scene');
var Analytics = require('app/common/analytics');
var Animations = require('app/ui/views/animations');
var ProgressionManager = require('app/ui/managers/progression_manager');
var ChallengeCategorySelectTmpl = require('app/ui/templates/composite/challenge_category_select.hbs');
var i18next = require('i18next');
var UtilsEnv = require('app/common/utils/utils_env');
var ChallengeCategoryGate = require('app/common/challenge_category_gate');
var PlayLayer = require('app/view/layers/pregame/PlayLayer');
var ChallengeSelectCompositeView = require('./challenge_select');
var SlidingPanelSelectCompositeView = require('./sliding_panel_select');

var ChallengeCategorySelectCompositeView = SlidingPanelSelectCompositeView.extend({

  className: 'sliding-panel-select challenge-category-select',

  template: ChallengeCategorySelectTmpl,

  childView: ChallengeSelectCompositeView,
  childViewOptions: function (model, index) {
    // each child view should have a collection as it is a composite view
    return { collection: new Backbone.Collection() };
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  // sliding panels should snap
  slidingPanelsSnap: true,
  slidingPanelsStack: false,

  /* region INITIALIZE */

  initialize: function () {
    SlidingPanelSelectCompositeView.prototype.initialize.apply(this, arguments);

    // build models for each category
    var challengeCategories = SDK.ChallengeFactory.getAllChallengeCategories();
    if (!ChallengeCategoryGate.shouldIncludeTutorialCategory({ isProduction: UtilsEnv.getIsInProduction() })) {
      challengeCategories = _.without(challengeCategories, SDK.ChallengeCategory.tutorial); // remove tutorial
    }
    var categoryModels = [];
    var hasAttemptedTutorial = ProgressionManager.getInstance().hasAttemptedChallengeCategory(SDK.ChallengeCategory.tutorial.type);
    var gameCount = ProgressionManager.getInstance().getGameCount();
    _.each(challengeCategories, function (challengeCategory) {
      var challenges = SDK.ChallengeFactory.getChallengesForCategoryType(challengeCategory.type);
      if (challenges && challenges.length) {
        var unlockMessage = '';
        var lockState = ChallengeCategoryGate.getLockState({
          isTutorialCategory: challengeCategory.type === SDK.ChallengeCategory.tutorial.type,
          hasAttemptedTutorial: hasAttemptedTutorial,
          gameCount: gameCount,
          gameCountRequired: challengeCategory.gamesRequiredToUnlock,
        });
        var enabled = lockState.enabled;
        var needsTutorial = lockState.needsTutorial;
        var gamesNeeded = lockState.gamesNeeded;

        if (needsTutorial && gamesNeeded > 0) {
          unlockMessage = i18next.t('challenges.unlock_complete_tutorial_and_play_more_matches_message', { count: gamesNeeded });
        } else if (needsTutorial) {
          unlockMessage = i18next.t('challenges.unlock_complete_tutorial_message');
        } else if (gamesNeeded > 0) {
          unlockMessage = i18next.t('challenges.unlock_play_more_matches_message', { count: gamesNeeded });
        }

        // check user attempt and completion progress
        var numChallengesAttempted = 0;
        var numChallengesCompleted = 0;
        _.each(challenges, function (challenge) {
          if (ProgressionManager.getInstance().hasAttemptedChallengeOfType(challenge.type)) {
            numChallengesAttempted++;
          }
          if (ProgressionManager.getInstance().hasCompletedChallengeOfType(challenge.type)) {
            numChallengesCompleted++;
          }
        });

        // create model for category
        var categoryModel = new Backbone.Model(_.extend({}, challengeCategory, {
          challenges: challenges,
          numChallengesAttempted: numChallengesAttempted,
          numChallengesCompleted: numChallengesCompleted,
          enabled: enabled,
          unlockMessage: unlockMessage,
        }));
        categoryModels.push(categoryModel);
      }
    });

    // reset collection to categories
    this.collection.reset(categoryModels);
  },

  /* endregion INITIALIZE */

  /* region EVENTS */

  onShow: function () {
    SlidingPanelSelectCompositeView.prototype.onShow.call(this);

    // analytics call
    Analytics.page('Select Tutorial Category', { path: '/#tutorial_category_selection' });

    // show play layer
    Scene.getInstance().showContentByClass(PlayLayer, true);

    // play music
    audio_engine.current().play_music(RSX.music_challengemode.audio);
  },

  /* endregion EVENTS */

  /* region SELECT */

  setSelectedChildView: function () {
    // get last selected
    var selectedChildViewPrev = this.getSelectedChildView();

    // make selection
    SlidingPanelSelectCompositeView.prototype.setSelectedChildView.apply(this, arguments);

    // get new selected
    var selectedChildView = this.getSelectedChildView();

    // reset last
    if (selectedChildViewPrev != null) {
      if (selectedChildView == null) {
        // play audio
        audio_engine.current().play_effect_for_interaction(RSX.sfx_ui_challenge_category_deselect.audio, CONFIG.SELECT_SFX_PRIORITY);
      }
    }

    // set new selected
    if (selectedChildView != null) {
      // play audio
      audio_engine.current().play_effect_for_interaction(RSX.sfx_ui_challenge_category_select.audio, CONFIG.SELECT_SFX_PRIORITY);
    }
  },

  /* endregion SELECT */

});

// Expose the class either via CommonJS or the global object
module.exports = ChallengeCategorySelectCompositeView;
