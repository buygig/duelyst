'use strict';

var CONFIG = require('app/common/config');
var EventBus = require('app/common/eventbus');
var EVENTS = require('app/common/event_types');
var generatePushID = require('app/common/generate_push_id');
var Scene = require('app/view/Scene');
var Storage = require('app/common/storage');
var UtilsJavascript = require('app/common/utils/utils_javascript');
var RSX = require('app/data/resources');
var audio_engine = require('app/audio/audio_engine');
var Animations = require('app/ui/views/animations');
var NavigationManager = require('app/ui/managers/navigation_manager');
var SettingsMenuTemplate = require('app/ui/templates/item/settings_menu.hbs');
var i18next = require('i18next');
var ConfirmDialogItemView = require('./confirm_dialog');

function normalizeLanguageKey(languageKey) {
  var normalized = String(languageKey || '').toLowerCase();
  if (normalized === 'zh' || normalized.indexOf('zh-') === 0) return 'zh-cn';
  if (normalized === 'en' || normalized.indexOf('en-') === 0) return 'en';
  return normalized || 'en';
}

var SettingsMenuView = Backbone.Marionette.ItemView.extend({

  className: 'modal duelyst-modal settings-menu',

  /* where are we appending the items views */
  childViewContainer: '.settings-menu-container',

  template: SettingsMenuTemplate,

  /* ui selector cache */
  ui: {
    $versionTag: '#version-tag',
    $resolution: '#resolution',
    $language: '#language',
    $checkboxHiDPIEnabled: '#checkbox-hi-dpi-enabled',
    $buttonLightingQualityLow: '#lighting-quality-low',
    $buttonLightingQualityMedium: '#lighting-quality-medium',
    $buttonLightingQualityHigh: '#lighting-quality-high',
    $buttonShadowQualityLow: '#shadow-quality-low',
    $buttonShadowQualityMedium: '#shadow-quality-medium',
    $buttonShadowQualityHigh: '#shadow-quality-high',
    $buttonBoardQualityLow: '#board-quality-low',
    $buttonBoardQualityHigh: '#board-quality-high',
    $bloom: '#bloom',
    $checkboxAlwaysShowStats: '#checkbox-always-show-stats',
    $checkboxShowBattleLog: '#checkbox-show-battlelog',
    $checkboxPlayerDetails: '#checkbox-player-details',
    $checkboxStickyTargeting: '#checkbox-sticky-targeting',
    $checkboxShowInGameTips: '#checkbox-show-in-game-tips',
    $masterVolume: '#master-volume',
    $musicVolume: '#music-volume',
    $voiceVolume: '#voice-volume',
    $effectsVolume: '#effects-volume',
  },

  /* Ui events hash */
  events: {
    'click button.desktop-quit': 'onDesktopQuitClicked',
    'change #resolution': 'changeResolution',
    'change #language': 'changeLanguage',
    'change #checkbox-hi-dpi-enabled': 'changeHiDPIEnabled',
    'click #lighting-quality-low': 'changeLightingQualityLow',
    'click #lighting-quality-medium': 'changeLightingQualityMedium',
    'click #lighting-quality-high': 'changeLightingQualityHigh',
    'click #shadow-quality-low': 'changeShadowQualityLow',
    'click #shadow-quality-medium': 'changeShadowQualityMedium',
    'click #shadow-quality-high': 'changeShadowQualityHigh',
    'click #board-quality-low': 'changeBoardQualityLow',
    'click #board-quality-high': 'changeBoardQualityHigh',
    'change #bloom': 'changeBloom',
    'change #checkbox-always-show-stats': 'changeAlwaysShowStats',
    'change #checkbox-show-battlelog': 'changeShowBattleLog',
    'change #checkbox-player-details': 'changeShowPlayerDetails',
    'change #checkbox-sticky-targeting': 'changeStickyTargeting',
    'change #checkbox-show-in-game-tips': 'changeShowInGameTips',
    'change #master-volume': 'changeMasterVolume',
    'change #music-volume': 'changeMusicVolume',
    'change #voice-volume': 'changeVoiceVolume',
    'change #effects-volume': 'changeEffectsVolume',
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,
  _requestId: null,

  initialize: function () {
    // generate unique id for requests
    this._requestId = generatePushID();

    // check whether changing viewport settings will do anything
    // generate global scale for resolution auto setting
    var $html = $('html');
    var screenWidth = $html.width();
    var screenHeight = $html.height();
    var globalScaleExact = CONFIG.getGlobalScaleForResolution(CONFIG.RESOLUTION_EXACT, screenWidth, screenHeight);
    if (globalScaleExact !== 1.0) {
      // check all resolutions and sort by whether they fit into user's current screen size
      var resolutions = UtilsJavascript.deepCopy(CONFIG.RESOLUTIONS);
      var resolutionsThatFit = [];
      var resolutionsThatDontFit = [];
      for (var i = 0, il = resolutions.length; i < il; i++) {
        var resolutionData = resolutions[i];
        if (resolutionData.value === CONFIG.RESOLUTION_AUTO || resolutionData.value === CONFIG.RESOLUTION_PIXEL_PERFECT) {
          resolutionsThatFit.push(resolutionData);
        } else {
          var resolution = $.trim(resolutionData.description);
          var resWidth = parseInt(resolution.replace(/x[\s\t]*?\d+/, ''));
          var resHeight = parseInt(resolution.replace(/\d+[\s\t]*?x/, ''));
          if (resWidth > screenWidth || resHeight > screenHeight) {
            resolutionsThatDontFit.push(resolutionData);
          } else {
            resolutionsThatFit.push(resolutionData);
          }
        }
      }
      this.model.set('_resolutionsThatFit', resolutionsThatFit);
      if (resolutionsThatDontFit.length > 0) {
        this.model.set('_resolutionsThatDontFit', resolutionsThatDontFit);
      }
    }
  },

  onBeforeRender: function () {
    this.$el.find('[data-toggle=\'tooltip\']').tooltip('destroy');
  },

  onRender: function () {
    this.ui.$bloom.attr('min', CONFIG.BLOOM_MIN);
    this.ui.$bloom.attr('max', CONFIG.BLOOM_MAX);
    this.ui.$bloom.attr('step', 0.05);

    this.ui.$resolution.val(parseFloat(CONFIG.resolution));
    var currentLanguageKey = normalizeLanguageKey(Storage.get('preferredLanguageKey') || i18next.languages[0] || i18next.language);
    this.ui.$language.val(currentLanguageKey);
    this.ui.$checkboxHiDPIEnabled.prop('checked', CONFIG.hiDPIEnabled);
    this.ui.$bloom.val(parseFloat(this.model.get('bloom')));
    this.ui.$checkboxAlwaysShowStats.prop('checked', this.model.get('alwaysShowStats'));
    this.ui.$checkboxShowBattleLog.prop('checked', this.model.get('showBattleLog'));
    this.ui.$checkboxPlayerDetails.prop('checked', this.model.get('showPlayerDetails'));
    this.ui.$checkboxStickyTargeting.prop('checked', this.model.get('stickyTargeting'));
    this.ui.$checkboxShowInGameTips.prop('checked', this.model.get('showInGameTips'));
    this.ui.$masterVolume.val(parseFloat(this.model.get('masterVolume')));
    this.ui.$musicVolume.val(parseFloat(this.model.get('musicVolume')));
    this.ui.$voiceVolume.val(parseFloat(this.model.get('voiceVolume')));
    this.ui.$effectsVolume.val(parseFloat(this.model.get('effectsVolume')));

    this._updateLightingQualityUI();
    this._updateShadowQualityUI();
    this._updateBoardQualityUI();

    if (!window.isDesktop) {
      this.$el.find('.desktop-quit').remove();
    }

    this.ui.$versionTag.text('v' + process.env.VERSION);

    this.$el.find('[data-toggle=\'tooltip\']').tooltip();
  },

  onShow: function () {
    // listen to global events
    this.listenTo(EventBus.getInstance(), EVENTS.resize, this.onResize);

    // listen to model events
    this.listenTo(this.model, 'change:lightingQuality', this._updateLightingQualityUI.bind(this));
    this.listenTo(this.model, 'change:shadowQuality', this._updateShadowQualityUI.bind(this));
    this.listenTo(this.model, 'change:boardQuality', this._updateBoardQualityUI.bind(this));

    // change gradient color mapping
    Scene.getInstance().getFX().showGradientColorMap(this._requestId, CONFIG.ANIMATE_FAST_DURATION, {
      r: 194, g: 203, b: 220, a: 255,
    }, {
      r: 36, g: 51, b: 65, a: 255,
    });

    audio_engine.current().play_effect_for_interaction(RSX.sfx_ui_tab_in.audio, CONFIG.SHOW_SFX_PRIORITY);
  },

  onPrepareForDestroy: function () {
    // reset gradient color mapping
    Scene.getInstance().getFX().clearGradientColorMap(this._requestId, CONFIG.ANIMATE_MEDIUM_DURATION);
  },

  onResize: function () {
    this.ui.$resolution.val(parseFloat(CONFIG.resolution));
    this.ui.$checkboxHiDPIEnabled.prop('checked', CONFIG.hiDPIEnabled);
  },

  /* event handlers */

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

  changeResolution: function () {
    var res = parseInt(this.ui.$resolution.val());
    if (CONFIG.resolution !== res) {
      CONFIG.resolution = res;
      Storage.set('resolution', res);
      EventBus.getInstance().trigger(EVENTS.request_resize);
    }
  },

  changeLanguage: function () {
    var languageKey = this.ui.$language.val();
    var currentLanguageKey = normalizeLanguageKey(Storage.get('preferredLanguageKey') || i18next.languages[0] || i18next.language);
    if (currentLanguageKey != languageKey) {
      Storage.set('preferredLanguageKey', languageKey);
      EventBus.getInstance().trigger(EVENTS.request_reload, { id: 'language_changed', message: i18next.t('settings.language_change_requires_restart') });
    }
  },

  changeHiDPIEnabled: function () {
    var enabled = this.ui.$checkboxHiDPIEnabled.prop('checked');
    if (CONFIG.hiDPIEnabled != enabled) {
      CONFIG.hiDPIEnabled = enabled;
      Storage.set('hiDPIEnabled', enabled);
      EventBus.getInstance().trigger(EVENTS.request_resize);
    }
  },

  changeLightingQualityLow: function () {
    this.model.set('lightingQuality', CONFIG.LIGHTING_QUALITY_LOW);
  },

  changeLightingQualityMedium: function () {
    this.model.set('lightingQuality', CONFIG.LIGHTING_QUALITY_MEDIUM);
  },

  changeLightingQualityHigh: function () {
    this.model.set('lightingQuality', CONFIG.LIGHTING_QUALITY_HIGH);
  },

  changeShadowQualityLow: function () {
    this.model.set('shadowQuality', CONFIG.SHADOW_QUALITY_LOW);
  },

  changeShadowQualityMedium: function () {
    this.model.set('shadowQuality', CONFIG.SHADOW_QUALITY_MEDIUM);
  },

  changeShadowQualityHigh: function () {
    this.model.set('shadowQuality', CONFIG.SHADOW_QUALITY_HIGH);
  },

  changeBoardQualityLow: function () {
    this.model.set('boardQuality', CONFIG.SHADOW_QUALITY_LOW);
  },

  changeBoardQualityHigh: function () {
    this.model.set('boardQuality', CONFIG.SHADOW_QUALITY_HIGH);
  },

  changeBloom: function () {
    this.model.set('bloom', this.ui.$bloom.val());
  },

  changeAlwaysShowStats: function () {
    this.model.set('alwaysShowStats', this.ui.$checkboxAlwaysShowStats.prop('checked'));
  },

  changeShowBattleLog: function () {
    this.model.set('showBattleLog', this.ui.$checkboxShowBattleLog.prop('checked'));
  },

  changeShowPlayerDetails: function () {
    this.model.set('showPlayerDetails', this.ui.$checkboxPlayerDetails.prop('checked'));
  },

  changeStickyTargeting: function () {
    this.model.set('stickyTargeting', this.ui.$checkboxStickyTargeting.prop('checked'));
  },

  changeShowInGameTips: function () {
    this.model.set('showInGameTips', this.ui.$checkboxShowInGameTips.prop('checked'));
  },

  changeMasterVolume: function () {
    this.model.set('masterVolume', this.ui.$masterVolume.val());
  },

  changeMusicVolume: function () {
    this.model.set('musicVolume', this.ui.$musicVolume.val());
  },

  changeVoiceVolume: function () {
    this.model.set('voiceVolume', this.ui.$voiceVolume.val());
  },

  changeEffectsVolume: function () {
    this.model.set('effectsVolume', this.ui.$effectsVolume.val());
  },

  _updateLightingQualityUI: function () {
    var lightingQuality = this.model.get('lightingQuality');
    if (lightingQuality === CONFIG.LIGHTING_QUALITY_HIGH) {
      // high quality lighting
      this.ui.$buttonLightingQualityHigh.addClass('active');
      this.ui.$buttonLightingQualityMedium.removeClass('active');
      this.ui.$buttonLightingQualityLow.removeClass('active');
    } else if (lightingQuality === CONFIG.LIGHTING_QUALITY_MEDIUM) {
      // medium quality lighting
      this.ui.$buttonLightingQualityMedium.addClass('active');
      this.ui.$buttonLightingQualityLow.removeClass('active');
      this.ui.$buttonLightingQualityHigh.removeClass('active');
    } else {
      // low quality lighting
      this.ui.$buttonLightingQualityLow.addClass('active');
      this.ui.$buttonLightingQualityMedium.removeClass('active');
      this.ui.$buttonLightingQualityHigh.removeClass('active');
    }
  },

  _updateShadowQualityUI: function () {
    var shadowQuality = this.model.get('shadowQuality');
    if (shadowQuality === CONFIG.SHADOW_QUALITY_HIGH) {
      // high quality shadows
      this.ui.$buttonShadowQualityHigh.addClass('active');
      this.ui.$buttonShadowQualityLow.removeClass('active');
      this.ui.$buttonShadowQualityMedium.removeClass('active');
    } else if (shadowQuality === CONFIG.SHADOW_QUALITY_MEDIUM) {
      // medium quality shadows
      this.ui.$buttonShadowQualityMedium.addClass('active');
      this.ui.$buttonShadowQualityLow.removeClass('active');
      this.ui.$buttonShadowQualityHigh.removeClass('active');
    } else {
      // low quality shadows
      this.ui.$buttonShadowQualityLow.addClass('active');
      this.ui.$buttonShadowQualityMedium.removeClass('active');
      this.ui.$buttonShadowQualityHigh.removeClass('active');
    }
  },

  _updateBoardQualityUI: function () {
    var boardQuality = this.model.get('boardQuality');
    if (boardQuality === CONFIG.SHADOW_QUALITY_HIGH) {
      // high quality board
      this.ui.$buttonBoardQualityHigh.addClass('active');
      this.ui.$buttonBoardQualityLow.removeClass('active');
    } else {
      // low quality board
      this.ui.$buttonBoardQualityLow.addClass('active');
      this.ui.$buttonBoardQualityHigh.removeClass('active');
    }
  },

});

// Expose the class either via CommonJS or the global object
module.exports = SettingsMenuView;
