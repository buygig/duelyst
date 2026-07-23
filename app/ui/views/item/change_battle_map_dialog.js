'use strict';

var UtilsJavascript = require('app/common/utils/utils_javascript');
var SDK = require('app/sdk');
var ProfileManager = require('app/ui/managers/profile_manager');
var ChangeBattleMapItemViewTempl = require('app/ui/templates/item/change_battle_map_dialog.hbs');
var i18next = require('i18next');
var FormPromptDialogItemView = require('./form_prompt_dialog');

var ChangeBattleMapItemView = FormPromptDialogItemView.extend({

  id: 'app-change-battlemap',

  template: ChangeBattleMapItemViewTempl,

  _cosmeticId: null,
  tooltipElement: null,
  _tooltipTimeoutId: null,

  events: function () {
    return _.extend(FormPromptDialogItemView.prototype.events, {
      'click .clear-selection': 'onClearSelectedBattleMap',
    });
  },

  initialize: function () {
    this._bindCosmetics();
  },

  onShow: function () {
    FormPromptDialogItemView.prototype.onShow.apply(this, arguments);

    // show tooltip
    this.showTooltip(this.$el.find('.cosmetic:first'));
  },

  onRender: function () {
    FormPromptDialogItemView.prototype.onRender.apply(this, arguments);

    // highlight selected battlemap
    var battlemapId = ProfileManager.getInstance().get('battle_map_id');
    if (battlemapId != null) {
      this.$el.find('.cosmetic[data-cosmetic-id=\'' + battlemapId + '\']').addClass('active');
    } else {
      this.$el.find('.clear-selection').addClass('active');
    }
  },

  onPrepareForDestroy: function () {
    this.stopShowingTooltip();
  },

  _bindCosmetics: function () {
    // All battle maps are local content and can be selected without purchasing.
    var cosmetics = SDK.CosmeticsFactory.cosmeticsForType(SDK.CosmeticsTypeLookup.BattleMap);
    var visibleCosmetics = [];
    for (var i = 0, il = cosmetics.length; i < il; i++) {
      var cosmeticData = cosmetics[i];
      if (cosmeticData.enabled) {
        var cosmeticDataCopy = _.extend({}, cosmeticData);
        cosmeticDataCopy._canUse = true;
        cosmeticDataCopy._canPurchase = false;
        UtilsJavascript.arraySortedInsertByComparator(visibleCosmetics, cosmeticDataCopy, function (a, b) {
          return b.id - a.id;
        });
      }
    }

    // set as non-serialized property of model in case model is firebase
    this.model.set('_cosmetics', visibleCosmetics);
  },

  updateValidState: function () {
    this.isValid = this._cosmeticId != null;
  },

  onClickSubmit: function (event) {
    var cosmeticId = $(event.currentTarget).data('cosmetic-id');
    if (SDK.CosmeticsFactory.cosmeticForIdentifier(cosmeticId) != null) {
      this._cosmeticId = cosmeticId;
      FormPromptDialogItemView.prototype.onClickSubmit.apply(this, arguments);
    }
  },

  onClearSelectedBattleMap: function () {
    this._cosmeticId = null;
    this.onSubmit();
  },

  onSubmit: function () {
    FormPromptDialogItemView.prototype.onSubmit.apply(this, arguments);

    this.stopShowingTooltip();
    ProfileManager.getInstance().set('battle_map_id', this._cosmeticId);
    this.onSuccess({ battle_map_id: this._cosmeticId });
  },

  showTooltip: function (element) {
    if (this.tooltipElement) {
      this.tooltipElement.tooltip('destroy');
    }
    this.tooltipElement = element;
    this._tooltipTimeoutId = setTimeout(function () {
      this._tooltipTimeoutId = null;
      this.tooltipElement.tooltip({
        container: '#app-change-battlemap',
        animation: false,
        html: true,
        title: '<p>' + i18next.t('game_setup.battle_map_choose_tooltip') + '</p>',
        template: '<div class=\'tooltip change-battlemap-popover\'><div class=\'tooltip-arrow\'></div><div class=\'tooltip-inner\'></div></div>',
        placement: 'left',
        trigger: 'manual',
      });
      this.tooltipElement.tooltip('show');
    }.bind(this), 1000);
  },

  stopShowingTooltip: function () {
    if (this._tooltipTimeoutId != null) {
      clearTimeout(this._tooltipTimeoutId);
      this._tooltipTimeoutId = null;
    }
    if (this.tooltipElement) {
      this.tooltipElement.tooltip('destroy');
    }
  },

});

// Expose the class either via CommonJS or the global object
module.exports = ChangeBattleMapItemView;
