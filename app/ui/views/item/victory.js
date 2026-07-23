// pragma PKGS: game

'use strict';

var SDK = require('app/sdk');
var Scene = require('app/view/Scene');
var RSX = require('app/data/resources');
var CONFIG = require('app/common/config');
var Animations = require('app/ui/views/animations');
var audio_engine = require('app/audio/audio_engine');
var NavigationManager = require('app/ui/managers/navigation_manager');
var VictoryTemplate = require('app/ui/templates/item/victory.hbs');
var VictoryLayer = require('app/view/layers/postgame/VictoryLayer');
var moment = require('moment');
var i18next = require('i18next');

var VictoryItemView = Backbone.Marionette.ItemView.extend({

  id: 'app-victory',
  className: 'status',

  template: VictoryTemplate,

  ui: {
    result: '.result',
    resultContent: '.result-content',
    progressBarComplete: '#progressBarComplete',
    progressBarEarned: '#progressBarEarned',
    levelUpNotice: '.level-up-notice',
    factionLevel: '.faction-level',
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  isCancelLocked: false,
  _userNavLockId: 'VictoryUserNavLockId',

  templateHelpers: {

    havePlayRewardsBeenMaxed: function () {
      return this.model.get('has_maxed_play_count_rewards');
      // var last_maxed = this.model.get("play_awards_last_maxed_at")
      // if (last_maxed) {
      //   var now = moment().utc()
      //   var lastMaxedStartOfDay = moment(last_maxed).startOf('day')
      //   var days_since_last_maxed = now.diff(lastMaxedStartOfDay,'days');
      //   if (days_since_last_maxed == 0)
      //     return true;
      //   else
      //     return false;
      // } else {
      //   return false;
      // }
    },

    haveWinRewardsBeenMaxed: function () {
      return this.model.get('has_maxed_win_count_rewards');
      // var last_maxed = this.model.get("win_awards_last_maxed_at")
      // if (last_maxed) {
      //   var now = moment().utc()
      //   var lastMaxedStartOfDay = moment(last_maxed).startOf('day')
      //   var days_since_last_maxed = now.diff(lastMaxedStartOfDay,'days');
      //   if (days_since_last_maxed == 0)
      //     return true;
      //   else
      //     return false;
      // } else {
      //   return false;
      // }
    },

    shouldShowGameCounterRewards: function () {
      return SDK.GameType.isCompetitiveGameType(SDK.GameSession.getInstance().getGameType()) && SDK.GameSession.getInstance().getGameType() != SDK.GameType.Rift;
    },

    winsToReward: function () {
      var delta = this.model.get('win_count_reward_progress');
      if (delta == 0) {
        if (this.model.get('is_winner')) {
          return 2;
        } else {
          return 0;
        }
      } else {
        return delta;
      }
    },

    gamesToReward: function () {
      var delta = this.model.get('play_count_reward_progress');
      if (delta == 0) {
        return 4;
      } else {
        return delta;
      }
    },

    shouldShowFactionLevel: function () {
      return this.model.get('faction_xp') != null;
    },

    shouldShowFactionXP: function () {
      return this.model.get('faction_xp_earned');
    },

    hasMaxedSinglePlayerXp: function () {
      return this.model.get('is_scored') && (SDK.GameSession.getInstance().getGameType() == SDK.GameType.SinglePlayer || SDK.GameSession.getInstance().getGameType() == SDK.GameType.BossBattle || SDK.GameSession.getInstance().getGameType() == SDK.GameType.Friendly) && this.model.get('faction_xp_earned') == null;
    },

  },

  initialize: function () {
  },

  /* region MODEL to VIEW DATA */

  serializeModel: function (model) {
    var data = model.toJSON.apply(model, _.rest(arguments));

    var winningPlayer = SDK.GameSession.getInstance().getWinner();
    var myPlayer;
    var myPlayerWon;
    if (SDK.GameSession.getInstance().isSandbox()) {
      if (winningPlayer == null) {
        winningPlayer = SDK.GameSession.getInstance().getCurrentPlayer();
      }
      myPlayer = winningPlayer;
      myPlayerWon = true;
    } else {
      myPlayer = SDK.GameSession.getInstance().getMyPlayer();
      myPlayerWon = myPlayer === winningPlayer;
    }

    data.is_network_game = false;
    data.is_spectate_or_replay = false;
    data.has_won = myPlayerWon;

    var playerSetupData = SDK.GameSession.getInstance().getPlayerSetupDataForPlayerId(myPlayer.getPlayerId());
    var factionData = SDK.FactionFactory.factionForIdentifier(playerSetupData.factionId);
    data.faction_name = factionData.name;

    if (data.faction_xp != null) {
      // Set faction level to level prior to this game (don't add xp earned) higher level is shown after animation
      var xp_previous = data.faction_xp;

      var prev_level = SDK.FactionProgression.levelForXP(xp_previous);
      data.faction_level = prev_level;

      // show level indexed off of 1
      data.faction_level = data.faction_level + 1;
    }

    data.opponent_id = null;

    var now = moment();
    var then = moment(SDK.GameSession.getInstance().createdAt);
    var duration = moment.duration(now.diff(then));
    data.game_duration = moment(duration.asMilliseconds()).format('m:ss');
    data.game_turn_count = SDK.GameSession.getInstance().turns.length;

    return data;
  },

  /* endregion MODEL to VIEW DATA */

  onRender: function () {
    var winningPlayer = SDK.GameSession.getInstance().getWinner();
    var myPlayer = SDK.GameSession.getInstance().getMyPlayer();

    this.$el.find('[data-toggle=\'tooltip\']').tooltip();

    if (SDK.GameSession.getInstance().isSandbox()) {
      this.ui.result.addClass('friendly');
      this.ui.resultContent.text(i18next.t('battle.outcome_victory'));
    } else if (winningPlayer == null) {
      this.ui.result.addClass('enemy');
      this.ui.resultContent.text(i18next.t('battle.outcome_draw'));
    } else if (myPlayer === winningPlayer) {
      this.ui.result.addClass('friendly');
      this.ui.resultContent.text(i18next.t('battle.outcome_victory'));
    } else {
      this.ui.result.addClass('enemy');
      this.ui.resultContent.text(i18next.t('battle.outcome_defeat'));
    }
  },

  onDestroy: function () {
    // unlock user triggered navigation
    NavigationManager.getInstance().requestUserTriggeredNavigationUnlocked(this._userNavLockId);

    this.$el.find('[data-toggle=\'tooltip\']').tooltip('destroy');
  },

  onAnimatedIn: function () {
    var winningPlayer = SDK.GameSession.getInstance().getWinner();
    var myPlayer = SDK.GameSession.getInstance().getMyPlayer();

    if (myPlayer === winningPlayer || SDK.GameSession.getInstance().isSandbox()) {
      audio_engine.current().play_effect(RSX.sfx_victory_match_w_vo.audio);
    }

    this.ui.resultContent.addClass('active');

    // Offline post-game data can still carry local faction XP. Animate it
    // directly from the local result model instead of consulting game history.
    if (
      this.model.get('is_scored')
      && this.model.get('faction_id') != null
      && this.model.get('faction_xp') != null
      && this.model.get('faction_xp_earned') != null
      && SDK.GameType.isFactionXPGameType(SDK.GameSession.getInstance().getGameType())
    ) {
      var data = this.model.attributes;
      var factionName = SDK.FactionFactory.factionForIdentifier(data.faction_id).name;

      var xp_previous = data.faction_xp;
      var xp_earned = data.faction_xp_earned;
      var xp = xp_previous + xp_earned;

      var level = SDK.FactionProgression.levelForXP(xp_previous);
      var levelXPCost = SDK.FactionProgression.totalXPForLevel(level);
      var levelXPProgress = xp_previous - levelXPCost;
      var levelUpXPRequired = SDK.FactionProgression.deltaXPForLevel(level + 1);
      var hasLeveledUp = SDK.FactionProgression.hasLeveledUp(xp, xp_earned);

      if (hasLeveledUp) {
        // Lock while we show level up animation
        NavigationManager.getInstance().requestUserTriggeredNavigationLocked(this._userNavLockId);

        var xp_current_percent = Math.min(100, 100 * levelXPProgress / levelUpXPRequired);
        var xp_earned_percent = Math.min(100, 100 * (levelUpXPRequired - levelXPProgress) / levelUpXPRequired);

        this.animateFactionProgress(xp_current_percent, xp_earned_percent, function () {
          this.showLevelUpAnimation(function () {
            var nextLevel = SDK.FactionProgression.levelForXP(xp);
            var nextLevelXPCost = SDK.FactionProgression.totalXPForLevel(nextLevel);
            var nextLevelXPProgress = xp - nextLevelXPCost;
            var nextLevelXPRequired = SDK.FactionProgression.deltaXPForLevel(nextLevel + 1);

            var xp_next_earned_percent = 100 * nextLevelXPProgress / nextLevelXPRequired;

            this.animateFactionProgress(0, xp_next_earned_percent);

            this.ui.factionLevel.velocity({
              opacity: [0, 'easeOutCubic', 1],
            }, {
              duration: 800,
              complete: function () {
                // show level indexed off of 1
                this.ui.factionLevel.text(factionName + ' - ' + i18next.t('common.xp_level').toUpperCase() + ' ' + (nextLevel + 1));
                this.ui.factionLevel.velocity({
                  opacity: [1, 'easeOutCubic', 0],
                }, {
                  duration: 400,
                  complete: function () {
                    NavigationManager.getInstance().requestUserTriggeredNavigationUnlocked(this._userNavLockId);
                  }.bind(this),
                });
              }.bind(this),
            });
          }.bind(this));
        }.bind(this));
      } else if (xp_earned) {
        // Lock while we show xp gained animation
        NavigationManager.getInstance().requestUserTriggeredNavigationLocked(this._userNavLockId);

        var xp_current_percent = Math.min(100, 100 * levelXPProgress / levelUpXPRequired);
        var xp_earned_percent = Math.min(100, 100 * xp_earned / levelUpXPRequired);

        this.animateFactionProgress(xp_current_percent, xp_earned_percent, function () {
          NavigationManager.getInstance().requestUserTriggeredNavigationUnlocked(this._userNavLockId);
        }.bind(this));
      }
    }
  },

  showLevelUpAnimation: function (onComplete) {
    var victoryLayer = Scene.getInstance().getOverlay();
    if (victoryLayer instanceof VictoryLayer) {
      victoryLayer.showLevelUpEffect();
    }

    this.ui.levelUpNotice.velocity({
      opacity: [1, 'easeOutCubic', 0],
      translateY: ['0px', 'easeOutCubic', '100px'],
    }, { duration: 800, complete: onComplete });
  },

  animateFactionProgress: function (percentCurrent, percentEarned, onComplete) {
    var totalWidth = percentCurrent + percentEarned;

    this.ui.progressBarComplete.width(percentCurrent + '%');
    this.ui.progressBarEarned.width(0);

    this.ui.progressBarEarned.css('backgroundColor', '#6dcff6');
    this.ui.progressBarEarned.velocity({ width: [percentEarned + '%', 'none', '0%'] }, {
      duration: 1000,
      complete: function () {
        // this.ui.progressBarEarned.velocity({ width: [ "0%", "none", percentEarned+"%" ] }, { duration: 1000 });
        // this.ui.progressBarComplete.velocity({ width: [ totalWidth+"%", "none", percentCurrent+"%" ] }, { duration: 1000, complete:onComplete });

        this.ui.progressBarEarned.velocity({ backgroundColor: '#ffffff' }, { duration: 400, complete: onComplete });
      }.bind(this),
    });
  },

});

// Expose the class either via CommonJS or the global object
module.exports = VictoryItemView;
