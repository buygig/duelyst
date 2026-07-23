'use strict';

var CONFIG = require('app/common/config');
var RSX = require('app/data/resources');
var audio_engine = require('app/audio/audio_engine');
var EscGameMenuTmpl = require('app/ui/templates/item/esc_game_menu.hbs');
var UtilityMenuItemView = require('./utility_menu');

var EscGameMenuItemView = UtilityMenuItemView.extend({

  template: EscGameMenuTmpl,

  id: 'app-esc-game-menu',
  className: 'modal duelyst-modal',

  onShow: function () {
    UtilityMenuItemView.prototype.onShow.apply(this, arguments);
    audio_engine.current().play_effect_for_interaction(RSX.sfx_ui_tab_in.audio, CONFIG.SHOW_SFX_PRIORITY);
  },

  animateReveal: function () {
    // don't animate reveal esc menu
  },

});

// Expose the class either via CommonJS or the global object
module.exports = EscGameMenuItemView;
