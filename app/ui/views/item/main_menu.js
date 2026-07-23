// pragma PKGS: nongame

'use strict';

var Logger = require('app/common/logger');
var CONFIG = require('app/common/config');
var EventBus = require('app/common/eventbus');
var EVENTS = require('app/common/event_types');
var RSX = require('app/data/resources');
var SDK = require('app/sdk');
var Animations = require('app/ui/views/animations');
var MainMenuTmpl = require('app/ui/templates/item/main_menu.hbs');
var InventoryManager = require('app/ui/managers/inventory_manager');
var ProfileManager = require('app/ui/managers/profile_manager');
var ZodiacSymbolModel = require('app/ui/models/zodiac_symbol');
var audio_engine = require('app/audio/audio_engine');

var MainMenuItemView = Backbone.Marionette.ItemView.extend({

  template: MainMenuTmpl,

  ui: {
    $symbolMainMenuCenter: '.symbol-main-menu-center',
    $symbolMainMenuDiamond: '.symbol-main-menu-diamond',
    $symbolMainMenuIcon: '.symbol-main-menu-icon',
    $symbolMainMenuRingInner: '.symbol-main-menu-ring-inner',
    $symbolMainMenuRingOuter: '.symbol-main-menu-ring-outer',
    $btnCollection: '.collection',
    $sceneSwitcher: '.scene-switcher',
    $sceneName: '.scene-name',
  },

  events: {
    'mouseenter .btn': 'activateSymbolMainMenu',
    'mouseleave .btn': 'deactivateSymbolMainMenu',
    'click .btn': 'onClickButton',
    'click .play': 'onClickPlay',
    'click .collection': 'onClickCollection',
    'click .codex': 'onClickCodex',
    'click .next-scene': 'onClickNextScene',
    'click .previous-scene': 'onClickPreviousScene',
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  _sceneLoadId: null,
  _stopLoadingSceneTimeoutId: null,

  onShow: function () {
    // listen to global events
    this.listenTo(EventBus.getInstance(), EVENTS.resize, this.onResize);
    this.listenTo(EventBus.getInstance(), EVENTS.change_scene, this.onChangeScene);
    this.listenTo(ProfileManager.getInstance().profile, 'change:showLoreNotifications', this.bindUnreadLoreCount);

    this.animateReveal();
  },

  onBeforeRender: function () {
    // stop any activated symbols
    this.deactivateSymbolMainMenu();

    this.$el.find('[data-toggle=\'tooltip\']').tooltip('destroy');
    this.$el.find('[data-toggle=\'popover\']').popover('destroy');
  },

  onResize: function () {
    this.updateZodiacSymbols();
  },

  onRender: function () {
    var selectedSceneData = SDK.CosmeticsFactory.sceneForIdentifier(CONFIG.selectedScene);
    this.ui.$sceneName.text(selectedSceneData.name);

    this.updateZodiacSymbols();

    this.bindUnreadCounts();

    this.$el.find('[data-toggle=\'tooltip\']').tooltip();
  },

  onDestroy: function () {
    Logger.module('UI').log('MainMenu.onDestroy');

    // stop any activated symbols
    this.deactivateSymbolMainMenu();

    this.$el.find('[data-toggle=\'tooltip\']').tooltip('destroy');
    this.$el.find('[data-toggle=\'popover\']').popover('destroy');

    // invalidate responses to any loading scene
    this._sceneLoadId = null;

    if (this._stopLoadingSceneTimeoutId != null) {
      clearTimeout(this._stopLoadingSceneTimeoutId);
      this._stopLoadingSceneTimeoutId = null;
    }
  },

  onClickPlay: function () {
    EventBus.getInstance().trigger(EVENTS.show_play);
  },

  onClickCollection: function () {
    EventBus.getInstance().trigger(EVENTS.show_collection);
  },

  onClickCodex: function () {
    EventBus.getInstance().trigger(EVENTS.show_codex);
  },

  bindUnreadCounts: function () {
    this.bindUnreadCardCount();
    this.bindUnreadLoreCount();
  },

  bindUnreadCardCount: function () {
    // if we have unread cards, show collection badge
    if (InventoryManager.getInstance().hasUnreadCards()) {
      this.ui.$btnCollection.find('.badge-unread-cards').addClass('active').text(InventoryManager.getInstance().getTotalUnreadCardCount());
    } else {
      this.ui.$btnCollection.find('.badge-unread-cards').removeClass('active');
    }
  },

  bindUnreadLoreCount: function () {
    // if we have unread lore, show collection badge
    if (ProfileManager.getInstance().profile.get('showLoreNotifications') && InventoryManager.getInstance().hasUnreadCardLore()) {
      this.ui.$btnCollection.find('.badge-unread-lore').addClass('active');
    } else {
      this.ui.$btnCollection.find('.badge-unread-lore').removeClass('active');
    }
  },

  onClickButton: function () {
    audio_engine.current().play_effect_for_interaction(RSX.sfx_ui_confirm.audio, CONFIG.CONFIRM_SFX_PRIORITY);
  },

  onChangeScene: function () {
    var newSceneData = SDK.CosmeticsFactory.sceneForIdentifier(CONFIG.selectedScene);
    this.ui.$sceneName.text(newSceneData.name);
    this._stopLoadingSceneTimeoutId = setTimeout(function () {
      this.ui.$sceneSwitcher.removeClass('loading');
    }.bind(this), 500);
  },

  onClickNextScene: function () {
    var selectedScene = CONFIG.selectedScene || SDK.CosmeticsFactory.getDefaultSceneIdentifier();
    var scenes = SDK.CosmeticsFactory.cosmeticsForType(SDK.CosmeticsTypeLookup.Scene);
    var index = -1;
    for (var i = 0, il = scenes.length; i < il; i++) {
      if (scenes[i].id === selectedScene) {
        index = i;
        break;
      }
    }
    // find next usable scene
    var newSceneData;
    while (newSceneData == null) {
      index = (index + 1) % scenes.length;
      var potentialSceneData = scenes[index];
      var potentialSceneId = potentialSceneData.id;
      if (potentialSceneId === selectedScene
        || InventoryManager.getInstance().getCanUseCosmeticById(potentialSceneId)) {
        newSceneData = potentialSceneData;
      }
    }
    var newScene = newSceneData && newSceneData.id;
    if (newScene != selectedScene) {
      this.ui.$sceneSwitcher.addClass('loading');
      ProfileManager.getInstance().profile.setSelectedScene(newScene);
    }
  },

  onClickPreviousScene: function () {
    var selectedScene = CONFIG.selectedScene || SDK.CosmeticsFactory.getDefaultSceneIdentifier();
    var scenes = SDK.CosmeticsFactory.cosmeticsForType(SDK.CosmeticsTypeLookup.Scene);
    var index = -1;
    for (var i = 0, il = scenes.length; i < il; i++) {
      if (scenes[i].id === selectedScene) {
        index = i;
        break;
      }
    }
    // find previous usable scene
    var newSceneData;
    while (newSceneData == null) {
      index = index <= 0 ? (scenes.length - 1) : (index - 1);
      var potentialSceneData = scenes[index];
      var potentialSceneId = potentialSceneData.id;
      if (potentialSceneId === selectedScene
        || InventoryManager.getInstance().getCanUseCosmeticById(potentialSceneId)) {
        newSceneData = potentialSceneData;
      }
    }
    var newScene = newSceneData && newSceneData.id;
    if (newScene != selectedScene) {
      this.ui.$sceneSwitcher.addClass('loading');
      ProfileManager.getInstance().profile.setSelectedScene(newScene);
    }
  },

  animateReveal: function () {
    // brand
    var brandMain = this.$el.find('.brand-main');
    var delay = 0;
    $(brandMain[0]).css('opacity', 0);
    brandMain[0].animate([
      { opacity: 0.0 },
      { opacity: 1.0 },
    ], {
      duration: 2000,
      delay: delay,
      easing: 'cubic-bezier(0.39, 0.575, 0.565, 1)',
      fill: 'forwards',
    });

    // animated reveal
    var buttons = this.$el.find('.animate-reveal:visible');
    for (var i = 0; i < buttons.length; i++) {
      $(buttons[i]).css('opacity', 0);
      buttons[i].animate([
        { opacity: 0.0, transform: 'translateX(10px)' },
        { opacity: 1.0, transform: 'translateX(0px)' },
      ], {
        duration: 200,
        delay: delay,
        easing: 'cubic-bezier(0.39, 0.575, 0.565, 1)',
        fill: 'forwards',
      });
      delay += 100;
    }
  },

  activateSymbolMainMenu: function () {
    if (this.ui.$symbolMainMenuIcon instanceof $) {
      if (this.ui.$symbolMainMenuIcon._animation == null) {
        this.ui.$symbolMainMenuIcon._animation = this.ui.$symbolMainMenuIcon[0].animate([
          { transform: 'rotateZ(0deg)' },
          { transform: 'rotateZ(360deg)' },
        ], {
          duration: 2000.0,
          iterations: Infinity,
        });
      } else {
        this.ui.$symbolMainMenuIcon._animation.play();
      }
    }
    if (this.ui.$symbolMainMenuRingInner instanceof $) {
      if (this.ui.$symbolMainMenuRingInner._animation == null) {
        this.ui.$symbolMainMenuRingInner._animation = this.ui.$symbolMainMenuRingInner[0].animate([
          { transform: 'rotateZ(0deg)' },
          { transform: 'rotateZ(-360deg)' },
        ], {
          duration: 12000.0,
          iterations: Infinity,
        });
      } else {
        this.ui.$symbolMainMenuRingInner._animation.play();
      }
    }
    if (this.ui.$symbolMainMenuRingOuter instanceof $) {
      if (this.ui.$symbolMainMenuRingOuter._animation == null) {
        this.ui.$symbolMainMenuRingOuter._animation = this.ui.$symbolMainMenuRingOuter[0].animate([
          { transform: 'rotateZ(0deg)' },
          { transform: 'rotateZ(360deg)' },
        ], {
          duration: 12000.0,
          iterations: Infinity,
        });
      } else {
        this.ui.$symbolMainMenuRingOuter._animation.play();
      }
    }
  },

  deactivateSymbolMainMenu: function () {
    if (this.ui.$symbolMainMenuIcon instanceof $ && this.ui.$symbolMainMenuIcon._animation != null) {
      this.ui.$symbolMainMenuIcon._animation.pause();
    }
    if (this.ui.$symbolMainMenuRingInner instanceof $ && this.ui.$symbolMainMenuRingInner._animation != null) {
      this.ui.$symbolMainMenuRingInner._animation.pause();
    }
    if (this.ui.$symbolMainMenuRingOuter instanceof $ && this.ui.$symbolMainMenuRingOuter._animation != null) {
      this.ui.$symbolMainMenuRingOuter._animation.pause();
    }
  },

  updateZodiacSymbols: function () {
    var $canvases = this.$el.find('.zodiac-symbol-canvas');
    this._zodiacModels || (this._zodiacModels = []);

    $canvases.each(function (i, canvas) {
      var $canvas = $(canvas);
      var $btn = $canvas.closest('.btn');
      var zodiacModel = this._zodiacModels[i];
      if (!zodiacModel) {
        // setup new zodiac symbol
        zodiacModel = this._zodiacModels[i] = new ZodiacSymbolModel({ canvas: canvas });
        zodiacModel.listenTo(this, 'destroy', zodiacModel.stopDrawing.bind(zodiacModel));
      } else {
        // provide canvas to zodiac symbol
        zodiacModel.setCanvas(canvas);
      }

      // listen to button mouse input
      $btn.on('mouseover', zodiacModel.startDrawing.bind(zodiacModel));
      $btn.on('mouseout', zodiacModel.stopDrawing.bind(zodiacModel));

      // always draw once
      zodiacModel.draw();
    }.bind(this));
  },

});

// Expose the class either via CommonJS or the global object
module.exports = MainMenuItemView;
