// pragma PKGS: alwaysloaded

'use strict';

var CONFIG = require('app/common/config');
var EventBus = require('app/common/eventbus');
var EVENTS = require('app/common/event_types');
var UtilityMenuTmpl = require('app/ui/templates/item/utility_menu.hbs');
var NavigationManager = require('app/ui/managers/navigation_manager');
var Animations = require('app/ui/views/animations');
var ProfileManager = require('app/ui/managers/profile_manager');
var SettingsMenuView = require('./settings_menu');

/**
 * Basic local utility menu that exposes settings.
 */
var UtilityMenuItemView = Backbone.Marionette.CompositeView.extend({

  id: 'app-utility-menu',
  className: 'utility-menu',

  template: UtilityMenuTmpl,

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  /* region LAYOUT */

  onResize: function () {
    // override in sub class
  },

  /* endregion LAYOUT */

  onBeforeRender: function () {
    this.$el.find('[data-toggle=\'tooltip\']').tooltip('destroy');
    this.$el.find('[data-toggle=\'popover\']').popover('destroy');
  },

  onRender: function () {
    this.$el.find('.settings').on('click', this.toggleSettingsMenu.bind(this));
    this.$el.find('[data-toggle=\'tooltip\']').tooltip({ container: CONFIG.OVERLAY_SELECTOR, trigger: 'hover' });
    this.onResize();
  },

  onShow: function () {
    // listen to global events
    this.listenTo(EventBus.getInstance(), EVENTS.resize, this.onResize);
    this.onResize();

    this.animateReveal();
  },

  animateReveal: function () {
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
    this.$el.find('[data-toggle=\'popover\']').popover('destroy');
  },

  toggleSettingsMenu: function () {
    NavigationManager.getInstance().toggleModalViewByClass(SettingsMenuView, { model: ProfileManager.getInstance().profile });
  },

});

// Expose the class either via CommonJS or the global object
module.exports = UtilityMenuItemView;
