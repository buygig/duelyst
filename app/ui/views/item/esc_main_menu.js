'use strict';

var CONFIG = require('app/common/config');
var RSX = require('app/data/resources');
var audio_engine = require('app/audio/audio_engine');
var NavigationManager = require('app/ui/managers/navigation_manager');
var EscMainMenuTmpl = require('app/ui/templates/item/esc_main_menu.hbs');
var i18next = require('i18next');
var UtilityMenuItemView = require('./utility_menu');
var ConfirmDialogItemView = require('./confirm_dialog');

var EscMainMenuItemView = UtilityMenuItemView.extend({

  template: EscMainMenuTmpl,

  id: 'app-esc-main-menu',
  className: 'modal duelyst-modal',

  onRender: function () {
    UtilityMenuItemView.prototype.onRender.apply(this, arguments);

    if (window.isDesktop) {
      this.$el.find('.desktop-quit').on('click', this.onDesktopQuitClicked.bind(this));
    } else {
      this.$el.find('.desktop-quit').remove();
    }
  },

  onShow: function () {
    UtilityMenuItemView.prototype.onShow.apply(this, arguments);
    audio_engine.current().play_effect_for_interaction(RSX.sfx_ui_tab_in.audio, CONFIG.SHOW_SFX_PRIORITY);
  },

  animateReveal: function () {
    // don't animate reveal esc menu
  },

  onDesktopQuitClicked: function () {
    if (window.isDesktop) {
      var confirmDialogItemView = new ConfirmDialogItemView({ title: i18next.t('settings.quit_confirm_message') });
      this.listenToOnce(confirmDialogItemView, 'confirm', function () {
        window.quitDesktop();
      }.bind(this));
      this.listenToOnce(confirmDialogItemView, 'cancel', function () {
        this.stopListening(confirmDialogItemView);
      }.bind(this));
      NavigationManager.getInstance().showDialogView(confirmDialogItemView);
    }
  },

});

// Expose the class either via CommonJS or the global object
module.exports = EscMainMenuItemView;
