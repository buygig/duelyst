// See: https://coderwall.com/p/myzvmg for why managers are created this way

var _InventoryManager = {};
_InventoryManager.instance = null;
_InventoryManager.getInstance = function () {
  if (this.instance == null) {
    this.instance = new InventoryManager();
  }
  return this.instance;
};
_InventoryManager.current = _InventoryManager.getInstance;

module.exports = _InventoryManager;

var CONFIG = require('app/common/config');
var EVENTS = require('app/common/event_types');
var Logger = require('app/common/logger');
var SDK = require('app/sdk');
var Promise = require('bluebird');
var DuelystFirebase = require('app/ui/extensions/duelyst_firebase');
var UserDecksCollection = require('app/ui/collections/user_decks');
var ProgressionManager = require('./progression_manager');
var GameDataManager = require('./game_data_manager');
var ProfileManager = require('./profile_manager');
var Manager = require('./manager');

var InventoryManager = Manager.extend({

  // backbone models / collections
  cardsCollection: null,
  cardLoreCollection: null,
  cardLoreReadRequests: null,
  decksCollection: null,
  cosmeticsCollection: null,
  codexChaptersCollection: null,
  portraitsCollection: null,
  _cached_hasAnyCardsOfFaction: null,

  /* region INITIALIZE */

  initialize: function (options) {
    this._cached_hasAnyCardsOfFaction = [];

    Manager.prototype.initialize.call(this);
  },

  onBeforeConnect: function () {
    Manager.prototype.onBeforeConnect.call(this);

    ProfileManager.getInstance().onReady()
      .bind(this)
      .then(function () {
        var userId = ProfileManager.getInstance().get('id');

        this.cardsCollection = new DuelystFirebase.Collection(null, {
          firebase: process.env.FIREBASE_URL + 'user-inventory/' + userId + '/card-collection',
        });

        this.cardLoreCollection = new DuelystFirebase.Collection(null, {
          firebase: process.env.FIREBASE_URL + 'user-inventory/' + userId + '/card-lore',
        });
        this.cardLoreReadRequests = [];

        this.decksCollection = new UserDecksCollection();
        this.decksCollection.fetch();

        this.cosmeticsCollection = new DuelystFirebase.Collection(null, {
          firebase: process.env.FIREBASE_URL + 'user-inventory/' + userId + '/cosmetic-inventory',
        });

        this.portraitsCollection = new DuelystFirebase.Collection(null, {
          firebase: process.env.FIREBASE_URL + 'user-inventory/' + userId + '/portraits',
        });

        this.codexChaptersCollection = new DuelystFirebase.Collection(null, {
          firebase: process.env.FIREBASE_URL + 'user-inventory/' + userId + '/codex',
        });

        this.onReady().then(function () {
          // listen to local collection changes immediately so we don't miss anything
          this.listenTo(this.cardsCollection, 'add', this.onCardsCollectionCardAdded);
          this.listenTo(this.cardsCollection, 'remove', this.onCardsCollectionCardRemoved);
          this.listenTo(this.cardsCollection, 'change', this.onCardsCollectionChange);
          this.listenTo(this.cardLoreCollection, 'change add remove', this.onCardLoreCollectionChange);
          this.listenTo(this.decksCollection, 'change add remove', this.onDecksCollectionChange);
          this.listenTo(this.cosmeticsCollection, 'add remove', this.onCosmeticsCollectionChange);

          // update decks when game data is ready
          Promise.all([
            GameDataManager.getInstance().onReady(),
            ProgressionManager.getInstance().onReady(),
          ]).then(function () {
            var invalidDeckModels = [];
            this.decksCollection.each(function (deckModel) {
              var deckFactionId = deckModel.get('faction_id');
              if (deckFactionId == null
              || !ProgressionManager.getInstance().isFactionUnlocked(deckModel.get('faction_id'))) {
              // no faction or faction not unlocked
                invalidDeckModels.push(deckModel);
              } else {
              // decks at this point have all properties
              // except their card models (these are not serialized)
              // so we need to update the card models from the list of card ids
                deckModel.updateCardModelsFromCardsData();

                // deck must have general
                if (!deckModel.hasGeneral()) {
                  invalidDeckModels.push(deckModel);
                }
              }
            }.bind(this));

            // remove all invalid decks
            this.decksCollection.remove(invalidDeckModels);
          }.bind(this));
        }.bind(this));

        this._markAsReadyWhenModelsAndCollectionsSynced([
          this.cardsCollection,
          this.decksCollection,
          this.cardLoreCollection,
          this.codexChaptersCollection,
          this.cosmeticsCollection,
        ]);
      });
  },

  onBeforeDisconnect: function () {
    Manager.prototype.onBeforeDisconnect.call(this);
    this.cardsCollection = null;
    this.decksCollection = null;
  },

  /* endregion INITIALIZE */

  /* region EVENTS */

  onCardsCollectionCardAdded: function (addedCardModel) {
    Logger.module('UI').log('InventoryManager::onCardsCollectionCardAdded()');
    if (addedCardModel) {
      var cardId = addedCardModel.id;
      this._updateLocalCardCacheWithCardInventoryCount(cardId, addedCardModel.get('count'));
    }

    this.trigger(EVENTS.cards_collection_change, { model: addedCardModel, collection: this.cardsCollection });
  },

  onCardsCollectionCardRemoved: function (removedCardModel) {
    Logger.module('UI').log('InventoryManager::onCardsCollectionCardRemoved()');
    if (removedCardModel) {
      var cardId = removedCardModel.id;
      this._updateLocalCardCacheWithCardInventoryCount(cardId, 0);
    }

    this.trigger(EVENTS.cards_collection_change, { model: removedCardModel, collection: this.cardsCollection });
  },

  onCardsCollectionChange: function (changedInventoryModel) {
    Logger.module('UI').log('InventoryManager::onCardsCollectionChange()');
    if (changedInventoryModel) {
      var cardId = changedInventoryModel.id;
      var cardCollectionModel = this.cardsCollection.get(cardId);
      var cardWasRemoved = cardCollectionModel == null;
      var inventoryCountChanged = changedInventoryModel.hasChanged('count') || cardWasRemoved;
      // if inventory count of this card has changed or reduced to 0
      if (inventoryCountChanged) {
        var newInventoryCount = cardWasRemoved ? 0 : changedInventoryModel.get('count');
        this._updateLocalCardCacheWithCardInventoryCount(cardId, newInventoryCount);
      }
    } else {
      // because this could fire before game data is ready
      GameDataManager.getInstance().onReady().then(function () {
        // sync all cards
        this.cardsCollection.each(function (inventoryCardModel) {
          var gameDataCardModel = GameDataManager.getInstance().getVisibleCardModelById(inventoryCardModel.id);
          if (gameDataCardModel != null) {
            gameDataCardModel.set('inventoryCount', inventoryCardModel.get('count'));
          }
        });

        // update unlocked/crafting state for all cards
        GameDataManager.getInstance().getVisibleCardsCollection().updateCardsCount();

        // sync all decks
        this.decksCollection.each(function (deckModel) {
          deckModel.updatePropertiesFromCardModels();
        });
      }.bind(this));
    }

    this.trigger(EVENTS.cards_collection_change, { model: changedInventoryModel, collection: this.cardsCollection });
  },

  _updateLocalCardCacheWithCardInventoryCount: function (cardId, newInventoryCount) {
    // because this could fire before game data is ready
    if (GameDataManager.getInstance().getIsReady()) {
      this._updateLocalCardCacheWithCardInventoryCountWhenGameDataReady(cardId, newInventoryCount);
    } else {
      GameDataManager.getInstance().onReady().then(function () {
        this._updateLocalCardCacheWithCardInventoryCountWhenGameDataReady(cardId, newInventoryCount);
      }.bind(this));
    }
  },

  _updateLocalCardCacheWithCardInventoryCountWhenGameDataReady: function (cardId, newInventoryCount) {
    // update card and any decks it is in
    var gameDataCardModel = GameDataManager.getInstance().getVisibleCardModelById(cardId);
    if (gameDataCardModel != null) {
      // clear cache
      var factionId = gameDataCardModel.get('factionId');
      if (factionId != null) {
        this._cached_hasAnyCardsOfFaction[factionId] = null;
      }

      // update counts
      gameDataCardModel.set('inventoryCount', newInventoryCount);

      // update unlocked/crafting state for all cards
      GameDataManager.getInstance().getVisibleCardsCollection().updateCardsCount();

      // update decks
      this.decksCollection.each(function (deckModel) {
        var changed = deckModel.updateCard(gameDataCardModel);

        // force deck to save due to automatic change
        if (changed) {
          deckModel.save();
        }
      });
    }
  },

  onCardLoreCollectionChange: function (loreModel) {
    Logger.module('UI').log('InventoryManager::onCardLoreCollectionChange');
    this.onCardLoreCollectionChangeForCardId(loreModel && loreModel.get('card_id'));
  },

  onCardLoreCollectionChangeForCardId: function (cardId) {
    if (cardId != null) {
      // remove from read requests
      var index = _.indexOf(this.cardLoreReadRequests, cardId);
      if (index !== -1) {
        this.cardLoreReadRequests.splice(index, 1);
      }

      // trigger change event
      this.trigger(EVENTS.card_lore_collection_change, { card_id: cardId, collection: this.cardLoreCollection });
    }
  },

  onDecksCollectionChange: function (deckModel) {
    Logger.module('UI').log('InventoryManager::onDecksCollectionChange');
    this.trigger(EVENTS.decks_collection_change, { model: deckModel, collection: this.decksCollection });
  },

  onCosmeticsCollectionChange: function (cosmeticModel) {
    var cosmeticId = cosmeticModel && cosmeticModel.get('id');
    Logger.module('UI').log('InventoryManager::onCosmeticsCollectionChange()', cosmeticId, this.hasCosmeticById(cosmeticId), SDK.CosmeticsFactory.isIdentifierForCardSkin(cosmeticId), cosmeticModel);
    if (cosmeticId != null && SDK.CosmeticsFactory.isIdentifierForCardSkin(cosmeticId)) {
      var cardId = SDK.Cards.getCardIdForCardSkinId(cosmeticId);
      var newInventoryCount;
      if (this.hasCosmeticById(cosmeticId)) {
        if (SDK.FactionFactory.cardIdIsGeneral(cardId)) {
          newInventoryCount = 1;
        } else {
          newInventoryCount = CONFIG.MAX_DECK_DUPLICATES;
        }
      } else {
        newInventoryCount = 0;
      }
      this._updateLocalCardCacheWithCardInventoryCount(cardId, newInventoryCount);
    }

    this.trigger(EVENTS.cosmetics_collection_change, { model: cosmeticModel, collection: this.cosmeticsCollection });
  },

  /* endregion EVENTS */

  /* region ACTIONS */

  markCardAsReadInCollection: function (cardId) {
    var inventoryCardModel = this.cardsCollection.get(cardId);
    if (inventoryCardModel != null && inventoryCardModel.get('is_unread')) {
      inventoryCardModel.set('is_unread', false);
      inventoryCardModel.set('is_new', false);
    }
  },

  dismissAllUnreadCards: function () {
    this.cardsCollection.each(function (inventoryCardModel) {
      if (inventoryCardModel.get('is_unread')) {
        inventoryCardModel.set('is_unread', false);
        inventoryCardModel.set('is_new', false);
      }
    });
  },

  markCardLoreAsReadInCollection: function (cardId) {
    var cardLoreModel = this.cardLoreCollection.get(cardId);
    var isUnread;
    if (cardLoreModel == null) {
      isUnread = !_.contains(this.cardLoreReadRequests, cardId);
    } else {
      isUnread = cardLoreModel.get('is_unread');
    }
    if (isUnread) {
      if (cardLoreModel == null) {
        // create a request entry so we can't re-request
        this.cardLoreReadRequests.push(cardId);
      } else {
        this.cardLoreCollection.each(function (cardLoreModel) {
          if (cardLoreModel != null && cardLoreModel.get('baseCardId') === cardId) {
            cardLoreModel.set('is_unread', false);
          }
        });
      }
    }
  },

  /* endregion ACTIONS */

  /* region GETTERS / SETTERS */

  getCardsCollection: function () {
    return this.cardsCollection;
  },

  hasAnyCardsOfFaction: function (factionId) {
    // attempt to use cached result
    var hasAnyCardsOfFaction = this._cached_hasAnyCardsOfFaction[factionId];
    if (hasAnyCardsOfFaction != null) {
      return hasAnyCardsOfFaction;
    } else {
      // find first card from faction
      var cardOfFaction = this.cardsCollection.find(function (inventoryCardModel) {
        var gameDataCardModel = GameDataManager.getInstance().getVisibleCardModelById(inventoryCardModel.get('id'));
        return gameDataCardModel != null && gameDataCardModel.get('factionId') == factionId;
      });

      // if no cards owned, check for skins
      if (cardOfFaction == null) {
        cardOfFaction = this.cosmeticsCollection.find(function (cosmeticModel) {
          var cosmeticId = cosmeticModel.get('id');
          if (SDK.CosmeticsFactory.isIdentifierForCardSkin(cosmeticId)) {
            var gameDataCardModel = GameDataManager.getInstance().getVisibleCardModelById(SDK.Cards.getCardIdForCardSkinId(cosmeticId));
            return gameDataCardModel != null && gameDataCardModel.get('factionId') == factionId;
          }
        });
      }

      // cache result
      var hasAnyCards = this._cached_hasAnyCardsOfFaction[factionId] = cardOfFaction != null;

      return hasAnyCards;
    }
  },

  getDecksCollection: function () {
    return this.decksCollection;
  },

  hasValidCustomDecks: function () {
    return this.decksCollection.filter(function (deckModel) { return deckModel.isValid(); }).length > 0;
  },

  getCosmeticsCollection: function () {
    return this.cosmeticsCollection;
  },

  getCosmeticById: function (cosmeticId) {
    return this.cosmeticsCollection.get(cosmeticId);
  },

  hasCosmeticById: function (cosmeticId) {
    return this.getCosmeticById(cosmeticId) != null;
  },

  getCanSeeCosmeticById: function (cosmeticId) {
    var cosmeticData = SDK.CosmeticsFactory.cosmeticForIdentifier(cosmeticId);
    return cosmeticData != null && cosmeticData.enabled;
  },

  getCanUseCosmeticById: function (cosmeticId) {
    var cosmeticData = SDK.CosmeticsFactory.cosmeticForIdentifier(cosmeticId);
    return cosmeticData != null && cosmeticData.enabled;
  },

  getCanAlwaysUseCosmeticById: function (cosmeticId) {
    var cosmeticData = SDK.CosmeticsFactory.cosmeticForIdentifier(cosmeticId);
    return cosmeticData != null && cosmeticData.enabled;
  },

  getCanPurchaseCosmeticById: function () {
    return false;
  },

  getPortraitsCollection: function () {
    return this.portraitsCollection;
  },

  isCardUnread: function (cardId) {
    var inventoryCardModel = this.cardsCollection.get(cardId);
    return (inventoryCardModel != null && inventoryCardModel.get('is_unread')) || false;
  },

  hasUnreadCards: function () {
    var unreadCard = this.cardsCollection.find(function (inventoryCardModel) {
      return inventoryCardModel.get('is_unread');
    });

    return unreadCard != null;
  },

  getTotalUnreadCardCount: function () {
    var unreadCount = 0;
    this.cardsCollection.each(function (inventoryCardModel) {
      if (inventoryCardModel.get('is_unread') && GameDataManager.getInstance().getVisibleCardModelById(inventoryCardModel.id) != null) {
        unreadCount += 1;
      }
    });

    return unreadCount;
  },

  getUnreadCardCountForFaction: function (factionId) {
    var unreadCount = 0;
    this.cardsCollection.each(function (inventoryCardModel) {
      if (inventoryCardModel.get('is_unread')) {
        var cardId = inventoryCardModel.id;
        var gameDataCardModel = GameDataManager.getInstance().getVisibleCardModelById(cardId);
        if (gameDataCardModel != null && gameDataCardModel.get('factionId') == factionId) {
          unreadCount += 1;
        }
      }
    });

    return unreadCount;
  },

  isCardLoreUnread: function (cardId) {
    if (!this.isCardLoreVisible(cardId)) {
      return false;
    }

    var cardLoreModel = this.cardLoreCollection.get(cardId);
    if (cardLoreModel == null) {
      return !_.contains(this.cardLoreReadRequests, cardId);
    } else {
      return cardLoreModel.get('is_unread');
    }
  },

  isCardLoreVisible: function (cardId) {
    // lore for cards that users don't own isn't visible
    var gameDataCardModel = GameDataManager.getInstance().getVisibleCardModelById(cardId);
    return gameDataCardModel != null && gameDataCardModel.get('inventoryCount') > 0 && ProgressionManager.getInstance().isFactionUnlocked(gameDataCardModel.get('factionId'));
  },

  hasUnreadCardLore: function () {
    var allLore = SDK.CardLore.getAllLore();
    for (var i = 0, il = allLore.length; i < il; i++) {
      var lore = allLore[i];
      var cardId = lore.id;
      if (this.isCardLoreUnread(cardId)) {
        return true;
      }
    }
    return false;
  },

  getTotalUnreadCardLoreCount: function () {
    var unreadCount = 0;

    var allLore = SDK.CardLore.getAllLore();
    for (var i = 0, il = allLore.length; i < il; i++) {
      var lore = allLore[i];
      var cardId = lore.id;
      if (this.isCardLoreUnread(cardId)) {
        unreadCount += 1;
      }
    }

    return unreadCount;
  },

  getUnreadCardLoreCountForFaction: function (factionId) {
    var unreadCount = 0;

    var allLore = SDK.CardLore.getAllLore();
    for (var i = 0, il = allLore.length; i < il; i++) {
      var lore = allLore[i];
      var cardId = lore.id;
      if (this.isCardLoreUnread(cardId)) {
        var gameDataCardModel = GameDataManager.getInstance().getVisibleCardModelById(cardId);
        if (gameDataCardModel != null && gameDataCardModel.get('factionId') == factionId) {
          unreadCount += 1;
        }
      }
    }

    return unreadCount;
  },

  getUnlockedCodexChapter: function (chapterId) {
    return this.codexChaptersCollection.get(chapterId);
  },

  hasUnlockedCodexChapter: function (chapterId) {
    var codexChapterData = SDK.Codex.chapterForIdentifier(chapterId);
    return (codexChapterData != null && (codexChapterData.gamesRequiredToUnlock == null || codexChapterData.gamesRequiredToUnlock == 0))
            || this.getUnlockedCodexChapter(chapterId) != null;
  },

  hasAnyBattleMapCosmetics: function () {
    var battleMapCosmetic = this.cosmeticsCollection.find(function (m) {
      var cosmetic = SDK.CosmeticsFactory.cosmeticForIdentifier(m.get('id'));
      return cosmetic && cosmetic.typeId === SDK.CosmeticsTypeLookup.BattleMap;
    });
    if (battleMapCosmetic) {
      return true;
    } else {
      return false;
    }
  },

  /* endregion GETTERS / SETTERS */

});
