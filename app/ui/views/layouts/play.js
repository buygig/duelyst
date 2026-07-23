// pragma PKGS: nongame

'use strict';

var SDK = require('app/sdk');
var RSX = require('app/data/resources');
var EventBus = require('app/common/eventbus');
var EVENTS = require('app/common/event_types');
var audio_engine = require('app/audio/audio_engine');
var DecksCollection = require('app/ui/collections/decks');
var Animations = require('app/ui/views/animations');
var TransitionRegion = require('app/ui/views/regions/transition');
var ChallengeCategorySelectCompositeView = require('app/ui/views/composite/challenge_category_select');
var DeckSelectSinglePlayerCompositeView = require('app/ui/views/composite/deck_select_single_player');
var DeckSelectSandboxCompositeView = require('app/ui/views/composite/deck_select_sandbox');
var PlayModeSelectCompositeView = require('app/ui/views/composite/play_mode_select');
var PlayLayoutTempl = require('app/ui/templates/layouts/play.hbs');
var VirtualCollection = require('backbone-virtual-collection');

var OFFLINE_PLAY_MODE_IDENTIFIERS = [
  SDK.PlayModes.Practice,
  SDK.PlayModes.Challenges,
  SDK.PlayModes.Sandbox,
];

var PlayLayout = Backbone.Marionette.LayoutView.extend({

  id: 'app-play',
  template: PlayLayoutTempl,

  regions: {
    modeRegion: { selector: '.mode-region', regionClass: TransitionRegion },
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  /* region INITIALIZE */

  /* endregion INITIALIZE */

  /* region MARIONETTE EVENTS */

  onShow: function () {
    // play music
    audio_engine.current().play_music(RSX.music_playmode.audio);

    // show starting play mode
    this.showPlayMode(this.model.get('playModeIdentifier'));
  },

  /* endregion MARIONETTE EVENTS */

  /* region GETTERS / SETTERS */

  /* endregion GETTERS / SETTERS */

  /* region PLAY MODES */

  /**
   * Shows a play mode, or if no mode provided defaults to mode select. See SDK.PlayModes for all identifiers.
   * @param {String} [playModeIdentifier]
   */
  showPlayMode: function (playModeIdentifier) {
    // only allow string identifiers
    if (!_.isString(playModeIdentifier)) {
      playModeIdentifier = '';
    }

    if (OFFLINE_PLAY_MODE_IDENTIFIERS.indexOf(playModeIdentifier) === -1) {
      playModeIdentifier = '';
    }

    // show new play mode
    this.model.set('playModeIdentifier', playModeIdentifier);

    var showPromise;
    if (playModeIdentifier === SDK.PlayModes.Practice) {
      showPromise = this.modeRegion.show(new DeckSelectSinglePlayerCompositeView({ model: new Backbone.Model(), collection: new VirtualCollection(new DecksCollection()) }));
    } else if (playModeIdentifier === SDK.PlayModes.Challenges) {
      showPromise = this.modeRegion.show(new ChallengeCategorySelectCompositeView({ model: new Backbone.Model(), collection: new Backbone.Collection() }));
    } else if (playModeIdentifier === SDK.PlayModes.Sandbox) {
      showPromise = this.modeRegion.show(new DeckSelectSandboxCompositeView({ model: new Backbone.Model(), collection: new VirtualCollection(new DecksCollection()) }));
    } else {
      var playModesDisplayed = OFFLINE_PLAY_MODE_IDENTIFIERS.map(function (identifier) {
        return _.extend({}, SDK.PlayModeFactory.playModeForIdentifier(identifier));
      });

      var playModesCollection = new Backbone.Collection(playModesDisplayed);
      var playModeSelectCompositeView = new PlayModeSelectCompositeView({ collection: playModesCollection });
      this.listenToOnce(playModeSelectCompositeView, 'select', function (model) {
        if (model != null) {
          EventBus.getInstance().trigger(EVENTS.show_play, model.get('id'));
        }
      });
      showPromise = this.modeRegion.show(playModeSelectCompositeView);
    }

    return showPromise;
  },

  /* endregion PLAY MODES */

});

// Expose the class either via CommonJS or the global object
module.exports = PlayLayout;
