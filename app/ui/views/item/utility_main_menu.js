'use strict';

var CONFIG = require('app/common/config');
var Animations = require('app/ui/views/animations');
var NavigationManager = require('app/ui/managers/navigation_manager');
var ProfileManager = require('app/ui/managers/profile_manager');
var UtilityMainMenuTmpl = require('app/ui/templates/item/utility_main_menu.hbs');
var SettingsMenuView = require('./settings_menu');

/**
 * Offline main-menu utilities. Settings includes the desktop quit action.
 */
var UtilityMainMenuItemView = Backbone.Marionette.ItemView.extend({

  id: 'app-utility-main-menu',
  className: 'utility-menu',

  template: UtilityMainMenuTmpl,

  events: {
    'click .settings': 'toggleSettingsMenu',
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  onBeforeRender: function () {
    this.$el.find('[data-toggle=\'tooltip\']').tooltip('destroy');
  },

  onRender: function () {
    this.$el.find('[data-toggle=\'tooltip\']').tooltip({ container: CONFIG.OVERLAY_SELECTOR, trigger: 'hover' });
  },

  onShow: function () {
    var buttons = this.$el.find('.animate-reveal:visible');
    var delay = 400;
    for (var i = 0; i < buttons.length; i++) {
      $(buttons[i]).css('opacity', 0);
      buttons[i].animate([
        { opacity: 0.0, transform: 'translateY(10px)' },
        { opacity: 1.0, transform: 'translateY(0px)' },
      ], {
        duration: 200,
        delay: delay,
        easing: 'cubic-bezier(0.39, 0.575, 0.565, 1)',
        fill: 'forwards',
      });
      delay += 100;
    }
  },

  onDestroy: function () {
    this.$el.find('[data-toggle=\'tooltip\']').tooltip('destroy');
  },

  toggleSettingsMenu: function () {
    NavigationManager.getInstance().toggleModalViewByClass(SettingsMenuView, { model: ProfileManager.getInstance().profile });
  },

});

// Expose the class either via CommonJS or the global object
module.exports = UtilityMainMenuItemView;
