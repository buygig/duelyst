# User Agent Parsing
UAParser = require 'ua-parser-js'
uaparser = new UAParser()
uaparser.setUA(window.navigator.userAgent)
userAgent = uaparser.getResult()
# userAgent now contains : browser, os, device, engine objects

# ---- Marionette Application ---- #
#
App = new Backbone.Marionette.Application()

# require Firebase via browserify but temporarily alias it global scope
Firebase = window.Firebase = require 'app/common/firebase'
Promise = require 'bluebird'
moment = require 'moment'
semver = require 'semver'

# core
Storage = require 'app/common/storage'
Logger = window.Logger = require 'app/common/logger'

# Disable detailed logging in production.
Logger.enabled = process.env.NODE_ENV != 'production'

Session = window.Session = require 'app/common/session2'
CONFIG = window.CONFIG = require 'app/common/config'
RSX = window.RSX = require 'app/data/resources'
PKGS = window.PKGS = require 'app/data/packages'
EventBus = window.EventBus = require 'app/common/eventbus'
EVENTS = require 'app/common/event_types'
SDK = window.SDK = require 'app/sdk'
UtilsJavascript = require 'app/common/utils/utils_javascript'
UtilsEnv = require 'app/common/utils/utils_env'
UtilsPointer = require 'app/common/utils/utils_pointer'
audio_engine = window.audio_engine = require 'app/audio/audio_engine'
openUrl = require('app/common/openUrl')
i18next = require('i18next')

OfflineMode = require 'app/common/offline_mode'
OfflineLocalApi = require 'app/offline/local_api'
OfflineLocalApi.install()

# Managers / Controllers
PackageManager = window.PackageManager = require 'app/ui/managers/package_manager'
ProfileManager = window.ProfileManager = require 'app/ui/managers/profile_manager'
GameDataManager = window.GameDataManager = require 'app/ui/managers/game_data_manager'
NavigationManager = window.NavigationManager = require 'app/ui/managers/navigation_manager'
InventoryManager = window.InventoryManager = require 'app/ui/managers/inventory_manager'
ProgressionManager = window.ProgressionManager = require 'app/ui/managers/progression_manager'
NewPlayerManager = window.NewPlayerManager = require 'app/ui/managers/new_player_manager'

# Views
LoaderItemView = require 'app/ui/views/item/loader'

UtilityLoadingLoginMenuItemView = require 'app/ui/views/item/utility_loading_login_menu'
UtilityMainMenuItemView = require 'app/ui/views/item/utility_main_menu'
UtilityGameMenuItemView = require 'app/ui/views/item/utility_game_menu'
EscGameMenuItemView = require 'app/ui/views/item/esc_game_menu'
EscMainMenuItemView = require 'app/ui/views/item/esc_main_menu'

LoginMenuItemView = require 'app/ui/views/item/login_menu'

Scene = require 'app/view/Scene'
GameLayer = require 'app/view/layers/game/GameLayer'

MainMenuItemView = require 'app/ui/views/item/main_menu'
CollectionLayout = require 'app/ui/views2/collection/collection'

PlayLayout = require 'app/ui/views/layouts/play'
PlayLayer = require 'app/view/layers/pregame/PlayLayer'

CodexLayout = require 'app/ui/views2/codex/codex_layout'
CodexLayer = require 'app/view/layers/codex/CodexLayer'

VictoryLayer = require 'app/view/layers/postgame/VictoryLayer'

GameLayout = require 'app/ui/views/layouts/game'
TutorialLayout = require 'app/ui/views/layouts/tutorial'

VictoryItemView = require 'app/ui/views/item/victory'

ConfirmDialogItemView = require 'app/ui/views/item/confirm_dialog'
PromptDialogItemView = require 'app/ui/views/item/prompt_dialog'
ActivityDialogItemView = require 'app/ui/views/item/activity_dialog'
ErrorDialogItemView = require 'app/ui/views/item/error_dialog'

# require the Handlebars Template Helpers extension here since it modifies core Marionette code
require 'app/ui/extensions/handlebars_template_helpers'

localStorage.debug = 'session:*'

#
# --- Utility ---- #
#

App._userNavLockId = "AppUserNavLockId"

App.getIsLoggedIn = ->
  return Storage.get('token')

#
# --- Main ---- #
#

App.getIsShowingMain = () ->
  # temporary method to check if the user can navigate to main (i.e. not already there)
  # this does NOT work for switching between main sub-screens
  return NavigationManager.getInstance().getIsShowingContentViewClass(LoginMenuItemView) or NavigationManager.getInstance().getIsShowingContentViewClass(MainMenuItemView)

App.main = ->
  if !App._mainPromise?
    App._mainPromise = App._startPromise.then(() ->
      Logger.module("APPLICATION").log("App:main")
      lastGameType = CONFIG.lastGameType
      wasTutorial = CONFIG.lastGameWasTutorial
      wasDeveloper = CONFIG.lastGameWasDeveloper
      CONFIG.resetLastGameData()

      App.cleanupGame()

      NavigationManager.getInstance().resetRoutes()
      NavigationManager.getInstance().addMajorRoute("main", App.main, App)
      NavigationManager.getInstance().requestUserTriggeredNavigationUnlocked(App._userNavLockId)

      if !App.getIsLoggedIn()
        return App._showLoginMenu()

      return App.managersReadyDeferred.promise.then(() ->
        # Restore only selections backed by local game setup.
        if lastGameType == SDK.GameType.Challenge and !wasTutorial
          return App.showPlay(SDK.PlayModes.Challenges, true)
        else if lastGameType == SDK.GameType.SinglePlayer
          return App.showPlay(SDK.PlayModes.Practice, true)
        else if lastGameType == SDK.GameType.Sandbox and !wasDeveloper
          return App.showPlay(SDK.PlayModes.Sandbox, true)
        else
          return App._showMainMenu()
      )
    ).finally () ->
      App._mainPromise = null
      return Promise.resolve()
  return App._mainPromise

App._showLoginMenu = (options) ->
  Logger.module("APPLICATION").log("App:_showLoginMenu")
  return PackageManager.getInstance().loadAndActivateMajorPackage("nongame", null, null,
    (() ->
      # show main scene
      viewPromise = Scene.getInstance().showMain()

      # show login menu
      contentPromise = NavigationManager.getInstance().showContentView(new LoginMenuItemView(options))

      # show utility menu for desktop only
      if window.isDesktop
        utilityPromise = NavigationManager.getInstance().showUtilityView(new UtilityLoadingLoginMenuItemView())
      else
        utilityPromise = Promise.resolve()

      return Promise.all([
        viewPromise,
        contentPromise,
        utilityPromise
      ])
    )
  )

App._showMainMenu = () ->
  Logger.module("APPLICATION").log("App:_showMainMenu")

  return PackageManager.getInstance().loadAndActivateMajorPackage("nongame", null, null, () ->
    # show main scene
    viewPromise = Scene.getInstance().showMain().then(() ->
      # play main layer music
      mainLayer = Scene.getInstance().getMainLayer()
      if mainLayer? then mainLayer.playMusic()
    )

    return Promise.all([
      viewPromise,
      NavigationManager.getInstance().showContentView(new MainMenuItemView({model: ProfileManager.getInstance().profile})),
      NavigationManager.getInstance().showUtilityView(new UtilityMainMenuItemView({model: ProfileManager.getInstance().profile}))
    ])
  )


#
# --- Major Layouts ---- #
#

App.showPlay = (playModeIdentifier, showingDirectlyFromGame) ->
  if !App.getIsLoggedIn()
    return Promise.reject()
  else
    return PackageManager.getInstance().loadAndActivateMajorPackage("nongame", null, null, () ->
      # force play mode to string
      if !_.isString(playModeIdentifier) then playModeIdentifier = ""

      # add mode to route
      NavigationManager.getInstance().addMajorRoute("play_" + playModeIdentifier, App.showPlay, App, [playModeIdentifier])

      # if currently in play modes, show new play mode direct
      currentContentView = NavigationManager.getInstance().getContentView()
      if currentContentView instanceof PlayLayout
        return currentContentView.showPlayMode(playModeIdentifier)
      else
        if showingDirectlyFromGame
          # show play layer
          viewPromise = Scene.getInstance().showContentByClass(PlayLayer, true)
        else
          viewPromise = Promise.resolve()

        return Promise.all([
          viewPromise,
          NavigationManager.getInstance().showContentView(new PlayLayout({model: new Backbone.Model({playModeIdentifier: playModeIdentifier})}))
        ])
    )

App.showCollection = () ->
  if !App.getIsLoggedIn() or NavigationManager.getInstance().getContentView() instanceof CollectionLayout
    return Promise.reject()
  else
    return PackageManager.getInstance().loadAndActivateMajorPackage("nongame", null, null, () ->
      # add mode to route
      NavigationManager.getInstance().addMajorRoute("collection", App.showCollection, App)

      # show UI
      return Promise.all([
        Scene.getInstance().showMain()
        NavigationManager.getInstance().showContentView(new CollectionLayout({model: new Backbone.Model()}))
      ])
    )

App.showCodex = () ->
  if !App.getIsLoggedIn() or NavigationManager.getInstance().getContentView() instanceof CodexLayout
    return Promise.reject()
  else
    return PackageManager.getInstance().loadAndActivateMajorPackage("nongame", null, null, () ->
      # add mode to route
      NavigationManager.getInstance().addMajorRoute("codex", App.showCodex, App)

      # show UI
      return Promise.all([
        Scene.getInstance().showContent(new CodexLayer(), true),
        NavigationManager.getInstance().showContentView(new CodexLayout({model: new Backbone.Model()}))
      ])
    )

#
# --- Session Events ---- #
#

App.onLogin = (data) ->
  Logger.module("APPLICATION").log "User logged in: #{data.userId}"

  # save token to localStorage
  Storage.set('token', data.token)

  # setup ajax headers for jquery/backbone requests
  $.ajaxSetup
    headers: {
      Authorization: "Bearer #{data.token}"
      "Client-Version": window.BUILD_VERSION
    }

  # Trigger the eventbus login event for the utilty menus
  EventBus.getInstance().trigger EVENTS.session_logged_in

  # Connect the managers that own local game state in every session.
  ProfileManager.getInstance().connect({userId: data.userId})
  offlineManagers = [
    PackageManager.getInstance(),
    InventoryManager.getInstance(),
    ProgressionManager.getInstance(),
    GameDataManager.getInstance(),
    NavigationManager.getInstance(),
    NewPlayerManager.getInstance()
  ]
  manager.connect() for manager in offlineManagers

  managersToWaitFor = [
    ProfileManager.getInstance().onReady(),
    PackageManager.getInstance().onReady(),
    InventoryManager.getInstance().onReady(),
    GameDataManager.getInstance().onReady(),
    ProgressionManager.getInstance().onReady(),
    NewPlayerManager.getInstance().onReady(),
    NavigationManager.getInstance().onReady()
  ]

  Promise.all(managersToWaitFor).then () ->
    # update resolution values as of login
    App._updateLastResolutionValues()

    # we're all done loading managers
    App.managersReadyDeferred.resolve()

    # show the main screen
    return App.main()

  .catch (err) ->
    App.managersReadyDeferred.reject()
    Logger.module("APPLICATION").log("ERROR initializing managers")
    if err == null then err = new Error("ERROR initializing managers")
    App._error(err.message)
    throw err
  .finally () ->
    # NavigationManager.getInstance().destroyDialogView()

App.onLogout = () ->
  Logger.module("APPLICATION").log "User logged out."

  # create a new deferred object for managers loading process
  App.managersReadyDeferred = new Promise.defer()

  # destroy out any login specific menus
  NavigationManager.getInstance().destroyNonContentViews()

  # stop playing any music
  audio_engine.current().stop_music()

  # reset config
  CONFIG.reset()

  # remove token
  Storage.remove('token')

  # remove ajax headers with new call to ajaxSetup
  $.ajaxSetup
    headers: {
      Authorization: ""
    }

  # Trigger the eventbus logout event for the ui/managers
  EventBus.getInstance().trigger EVENTS.session_logged_out

  # go back to main to show login menu
  App.main()

# just logs the error for debugging
App.onSessionError = (error) ->
  Logger.module("APPLICATION").log "Session Error: #{error.message}"

#
# ---- Pointer ---- #
#
App._$canvasMouseClassEl = null
App._currentMouseClass = null

App.onCanvasMouseState = (e) ->
  if e?.state? then mouseClass = "mouse-" + e.state.toLowerCase() else mouseClass = "mouse-auto"
  if App._currentMouseClass != mouseClass
    App._$canvasMouseClassEl ?= $(CONFIG.GAMECANVAS_SELECTOR)
    if App._currentMouseClass == "mouse-auto"
      App._$canvasMouseClassEl.addClass(mouseClass)
    else if mouseClass == "mouse-auto"
      App._$canvasMouseClassEl.removeClass(App._currentMouseClass)
    else
      App._$canvasMouseClassEl.removeClass(App._currentMouseClass).addClass(mouseClass)
    App._currentMouseClass = mouseClass

App.onPointerDown = (event) ->
  # update pointer
  if event?
    $app = $(CONFIG.APP_SELECTOR)
    offset = $app.offset()
    UtilsPointer.setPointerFromDownEvent(event, $app.height(), offset.left, offset.top)

  # trigger pointer event
  pointerEvent = UtilsPointer.getPointerEvent()
  pointerEvent.type = EVENTS.pointer_down
  pointerEvent.target = event.target
  EventBus.getInstance().trigger(pointerEvent.type, pointerEvent)
  # before passing event to view, stop propagation when the target of the pointer event is not the game canvas
  # however, continue pass the event down to the view and let listeners decide whether to use it
  if !$(CONFIG.GAMECANVAS_SELECTOR).is(event.target)
    pointerEvent.stopPropagation()
  Scene.getInstance().getEventBus().trigger(pointerEvent.type, pointerEvent)

  return true

App.onPointerUp = (event) ->
  # update pointer
  if event?
    $app = $(CONFIG.APP_SELECTOR)
    offset = $app.offset()
    UtilsPointer.setPointerFromUpEvent(event, $app.height(), offset.left, offset.top)

  # trigger pointer event
  pointerEvent = UtilsPointer.getPointerEvent()
  pointerEvent.type = EVENTS.pointer_up
  pointerEvent.target = event.target
  EventBus.getInstance().trigger(pointerEvent.type, pointerEvent)
  # before passing event to view, stop propagation when the target of the pointer event is not the game canvas
  # however, continue pass the event down to the view and let listeners decide whether to use it
  if !$(CONFIG.GAMECANVAS_SELECTOR).is(event.target)
    pointerEvent.stopPropagation()
  Scene.getInstance().getEventBus().trigger(pointerEvent.type, pointerEvent)

  return true

App.onPointerMove = (event) ->
  # update pointer
  if event?
    $app = $(CONFIG.APP_SELECTOR)
    offset = $app.offset()
    UtilsPointer.setPointerFromMoveEvent(event, $app.height(), offset.left, offset.top)

  # trigger pointer events
  pointerEvent = UtilsPointer.getPointerEvent()
  pointerEvent.type = EVENTS.pointer_move
  pointerEvent.target = event.target
  EventBus.getInstance().trigger(pointerEvent.type, pointerEvent)
  # before passing event to view, stop propagation when the target of the pointer event is not the game canvas
  # however, continue pass the event down to the view and let listeners decide whether to use it
  if !$(CONFIG.GAMECANVAS_SELECTOR).is(event.target)
    pointerEvent.stopPropagation()
  Scene.getInstance().getEventBus().trigger(pointerEvent.type, pointerEvent)

  return true

App.onPointerWheel = (event) ->
  # update pointer
  if event?
    target = event.target
    $app = $(CONFIG.APP_SELECTOR)
    offset = $app.offset()
    UtilsPointer.setPointerFromWheelEvent(event.originalEvent, $app.height(), offset.left, offset.top)

  # trigger pointer events
  pointerEvent = UtilsPointer.getPointerEvent()
  pointerEvent.type = EVENTS.pointer_wheel
  pointerEvent.target = target
  EventBus.getInstance().trigger(pointerEvent.type, pointerEvent)
  # before passing event to view, stop propagation when the target of the pointer event is not the game canvas
  # however, continue pass the event down to the view and let listeners decide whether to use it
  if !$(CONFIG.GAMECANVAS_SELECTOR).is(target)
    pointerEvent.stopPropagation()
  Scene.getInstance().getEventBus().trigger(pointerEvent.type, pointerEvent)

  return true

#
# --- Game Invites ---- #
#

App._error = (errorMessage) ->
  Logger.module("APPLICATION").log("App._error", errorMessage)
  # always unlock user triggered navigation
  NavigationManager.getInstance().requestUserTriggeredNavigationUnlocked(App._userNavLockId)

  if errorMessage?
    # if we're in the process of loading the main menu
    # show the error dialog and don't go to main menu
    # to avoid infinite loop of loading main menu
    if App._mainPromise or process.env.NODE_ENV == "local"
      return NavigationManager.getInstance().showDialogView(new ErrorDialogItemView({message:errorMessage}))
    else
      # otherwise load the main menu and show the error dialog
      return App.main().then () ->
        return NavigationManager.getInstance().showDialogView(new ErrorDialogItemView({message:errorMessage}))
  else
    return App.main()

App._startSinglePlayerGame = (myPlayerDeck, myPlayerFactionId, myPlayerGeneralId, myPlayerCardBackId, myPlayerBattleMapId, aiGeneralId, aiDifficulty, aiNumRandomCards) ->
  Logger.module("APPLICATION").log("App._startSinglePlayerGame")

  offlinePractice = new SDK.OfflinePractice({
    playerDeck: myPlayerDeck
    playerName: ProfileManager.getInstance().get('username') or OfflineMode.getUsername()
    aiGeneralId: aiGeneralId
    aiDifficulty: if aiDifficulty? then aiDifficulty else SDK.OfflinePractice.DEFAULT_AI_DIFFICULTY
    aiNumRandomCards: if aiNumRandomCards? then aiNumRandomCards else SDK.OfflinePractice.DEFAULT_AI_NUM_RANDOM_CARDS
  })
  return App._startGameWithChallenge(offlinePractice)

#
# --- Game Setup ---- #
#

App._startGameWithChallenge = (challenge) ->
  Logger.module("APPLICATION").log("App:_startGameWithChallenge")

  # don't allow user triggered navigation
  NavigationManager.getInstance().requestUserTriggeredNavigationLocked(App._userNavLockId)

  # mark challenge as attempted
  ProgressionManager.getInstance().markChallengeAsAttemptedWithType(challenge.type)

  # challenge handles setting up game session
  SDK.GameSession.reset()
  SDK.GameSession.getInstance().setUserId(ProfileManager.getInstance().get('id'))
  challenge.setupSession(SDK.GameSession.getInstance())

  # get ui promise
  if CONFIG.LOAD_ALL_AT_START
    ui_promise = Promise.resolve()
  else
    ui_promise = NavigationManager.getInstance().showDialogForLoad()

  return ui_promise.then () ->
    return PackageManager.getInstance().loadGamePackageWithoutActivation([
      SDK.GameSession.getInstance().getGeneralForPlayer1().getFactionId(),
      SDK.GameSession.getInstance().getGeneralForPlayer2().getFactionId()
    ], [
      "tutorial",
      PKGS.getChallengePkgIdentifier(SDK.GameSession.getInstance().getChallenge().getType())
    ])
  .then () ->
    return App._startGame()
  .then () ->
    opponentAgent = challenge.getOpponentAgent?()
    if opponentAgent?.start?
      App._localGameAgent = opponentAgent
      opponentAgent.start()
  .catch (errorMessage) ->
    return App._error(errorMessage)

App._startGame = () ->
  gameSession = SDK.GameSession.getInstance()
  challenge = gameSession.getChallenge()
  Logger.module("APPLICATION").log("App:_startGame", gameSession.getStatus())

  # reset routes as soon as we lock into a game
  NavigationManager.getInstance().resetRoutes()

  # record the local game data needed to restore its selection screen
  CONFIG.resetLastGameData()
  # OfflinePractice deliberately uses Challenge internally so that it can use
  # the local authoritative action flow. Preserve the product-facing route.
  if challenge instanceof SDK.OfflinePractice
    CONFIG.lastGameType = SDK.GameType.SinglePlayer
  else
    CONFIG.lastGameType = gameSession.getGameType()
  CONFIG.lastGameWasTutorial = gameSession.isTutorial()
  CONFIG.lastGameWasDeveloper = UtilsEnv.getIsInDevelopment() && gameSession.getIsDeveloperMode()

  # get game UI view class
  if challenge? and !(challenge instanceof SDK.Sandbox)
    gameUIViewClass = TutorialLayout
  else
    gameUIViewClass = GameLayout

  # load resources for game session
  load_promises = [
    # load battlemap assets required for game
    PackageManager.getInstance().loadMinorPackage(PKGS.getBattleMapPkgIdentifier(gameSession.getBattleMapTemplate().getMap()), null, "game")
  ]

  # load all cards in my player's hand
  preloaded_package_ids = []
  for cardIndex in gameSession.getMyPlayer().getDeck().getHand()
    card = gameSession.getCardByIndex(cardIndex)
    if card?
      # get unique id for card preload
      card_id = card.id
      card_pkg_id = PKGS.getCardGamePkgIdentifier(card_id)
      card_preload_pkg_id = card_pkg_id + "_preload_" + UtilsJavascript.generateIncrementalId()
      preloaded_package_ids.push(card_preload_pkg_id)
      load_promises.push(PackageManager.getInstance().loadMinorPackage(card_preload_pkg_id, PKGS.getPkgForIdentifier(card_pkg_id), "game"))

  # load all cards and modifiers on board
  for card in gameSession.getBoard().getCards(null, allowUntargetable=true)
    # get unique id for card preload
    card_id = card.getId()
    card_pkg_id = PKGS.getCardGamePkgIdentifier(card_id)
    card_resources_pkg = PKGS.getPkgForIdentifier(card_pkg_id)
    card_preload_pkg_id = card_pkg_id + "_preload_" + UtilsJavascript.generateIncrementalId()
    preloaded_package_ids.push(card_preload_pkg_id)

    # include signature card resources
    if card instanceof SDK.Entity and card.getWasGeneral()
      referenceSignatureCard = card.getReferenceSignatureCard()
      if referenceSignatureCard?
        signature_card_id = referenceSignatureCard.getId()
        signature_card_pkg_id = PKGS.getCardGamePkgIdentifier(signature_card_id)
        signature_card_resources_pkg = PKGS.getPkgForIdentifier(signature_card_pkg_id)
        card_resources_pkg = [].concat(card_resources_pkg, signature_card_resources_pkg)

    # load card resources
    load_promises.push(PackageManager.getInstance().loadMinorPackage(card_preload_pkg_id, card_resources_pkg, "game"))

    # modifiers
    for modifier in card.getModifiers()
      if modifier?
        # get unique id for modifier preload
        modifier_type = modifier.getType()
        modifier_preload_package_id = modifier_type + "_preload_" + UtilsJavascript.generateIncrementalId()
        preloaded_package_ids.push(modifier_preload_package_id)
        load_promises.push(PackageManager.getInstance().loadMinorPackage(modifier_preload_package_id, PKGS.getPkgForIdentifier(modifier_type), "game"))

        # load artifact card if modifier is applied by an artifact
        if modifier.getIsFromArtifact()
          artifact_card = modifier.getSourceCard()
          if artifact_card?
            # get unique id for artifact card preload
            artifact_card_id = artifact_card.getId()
            artifact_card_pkg_id = PKGS.getCardInspectPkgIdentifier(artifact_card_id)
            artifact_card_preload_pkg_id = artifact_card_pkg_id + "_preload_" + UtilsJavascript.generateIncrementalId()
            preloaded_package_ids.push(artifact_card_preload_pkg_id)
            load_promises.push(PackageManager.getInstance().loadMinorPackage(artifact_card_preload_pkg_id, PKGS.getPkgForIdentifier(artifact_card_pkg_id), "game"))

  return Promise.all(load_promises).then(() ->
    # destroy all views/layers
    return NavigationManager.getInstance().destroyAllViewsAndLayers()
  ).then(() ->
    return PackageManager.getInstance().activateGamePackage()
  ).then(() ->
    # show game and ui
    overlay_promise = Scene.getInstance().destroyOverlay()
    game_promise = Scene.getInstance().showGame()
    content_promise = NavigationManager.getInstance().showContentView(new gameUIViewClass({challenge: challenge}))
    utility_promise = NavigationManager.getInstance().showUtilityView(new UtilityGameMenuItemView({model: ProfileManager.getInstance().profile}))

    # listen to game local events
    App._subscribeToGameLocalEvents()

    # wait for game to show as active (not status active) then unload all preloaded packages
    scene = Scene.getInstance()
    gameLayer = scene? && scene.getGameLayer()
    if !gameLayer? or gameLayer.getStatus() == GameLayer.STATUS.ACTIVE
      PackageManager.getInstance().unloadMajorMinorPackages(preloaded_package_ids)
    else
      onActiveGame = () ->
        gameLayer.getEventBus().off(EVENTS.show_active_game, onActiveGame)
        gameLayer.getEventBus().off(EVENTS.terminate, onTerminate)
        PackageManager.getInstance().unloadMajorMinorPackages(preloaded_package_ids)
      onTerminate = () ->
        gameLayer.getEventBus().off(EVENTS.show_active_game, onActiveGame)
        gameLayer.getEventBus().off(EVENTS.terminate, onTerminate)
      gameLayer.getEventBus().on(EVENTS.show_active_game, onActiveGame)
      gameLayer.getEventBus().on(EVENTS.terminate, onTerminate)

    return Promise.all([
      overlay_promise,
      game_promise,
      content_promise,
      utility_promise
    ])
  ).then(() ->
    # enable user triggered navigation
    NavigationManager.getInstance().requestUserTriggeredNavigationUnlocked(App._userNavLockId)
  )

########

App.onAfterShowEndTurn = () ->
  Logger.module("APPLICATION").log "App:onAfterShowEndTurn"
  # if we're playing in sandbox mode, we need to let the player play both sides so we swap players here
  if SDK.GameSession.getInstance().isSandbox()
    # swap test user id
    player1 = SDK.GameSession.getInstance().getPlayer1()
    player2 = SDK.GameSession.getInstance().getPlayer2()
    if player1.getIsCurrentPlayer() then SDK.GameSession.getInstance().setUserId(player1.getPlayerId()) else SDK.GameSession.getInstance().setUserId(player2.getPlayerId())

#
# --- Game Cleanup ---- #
#

App.cleanupGame = () ->
  Logger.module("APPLICATION").log "App.cleanupGame"
  if App._localGameAgent?
    App._localGameAgent.destroy?()
    App._localGameAgent = null

  # cleanup events
  App.cleanupGameEvents()

  # terminate the game layer
  Scene.getInstance().getGameLayer()?.terminate()

  # reset the current instance of the game session
  SDK.GameSession.reset()

App.cleanupGameEvents = () ->
  Logger.module("APPLICATION").log "App.cleanupGameEvents"
  # cleanup events
  App._unsubscribeFromGameLocalEvents()

#
# --- Game Over Views ---- #
#

App._onGameOver = () ->
  Logger.module("APPLICATION").log "App:_onGameOver"

  # start loading data as soon as game is over, don't wait for animations
  App._startLoadingGameOverData()

#
# --- Game Turn Over---- #
#

###*
# This method de-registers all game listeners and initiates the game over screen flow. For visual sequencing purposes, it fires when it recieves an event that all game actions are done showing in the game layer.
# @public
###
App.onShowGameOver = () ->
  Logger.module("APPLICATION").log "App:onShowGameOver"

  App.cleanupGameEvents()
  App.showVictoryWhenGameDataReady()

###*
# Load progression, rank, etc... data after a game is over.
# @private
###
App._startLoadingGameOverData = () ->
  gameSession = SDK.GameSession.getInstance()

  challenge = gameSession.getChallenge()
  if gameSession.isChallenge() and !(challenge instanceof SDK.OfflinePractice)
    challengeId = challenge.type
    completionPromise = ProgressionManager.getInstance().completeChallengeWithType(challengeId)
  else
    completionPromise = Promise.resolve()

  App._gameOverDataThenable = Promise.resolve(completionPromise).then () ->
    return [null, [], new Backbone.Collection()]

###*
# Shows the victory screen after a game is over, all data is loaded, and assets for victory screen are allocated.
# @public
###
App.showVictoryWhenGameDataReady = () ->
  NavigationManager.getInstance().showDialogView(new ActivityDialogItemView())

  return PackageManager.getInstance().loadMinorPackage("postgame")
  .then () ->
    return App._gameOverDataThenable
  .then () ->
    NavigationManager.getInstance().destroyDialogView()
    Scene.getInstance().getGameLayer()?.terminate()
    return App.showVictory()
  .catch (error) ->
    NavigationManager.getInstance().destroyDialogView()
    return App._error(error?.message or error)

###*
# Shows the local victory screen and makes continue return through App.main,
# which restores the appropriate practice, challenge, or sandbox selection.
# @public
###
App.showVictory = () ->
  Logger.module("APPLICATION").log "App:showVictory"
  App.setCallbackWhenCancel(App.main)

  return Promise.all([
    Scene.getInstance().showOverlay(new VictoryLayer())
    NavigationManager.getInstance().showContentView(new VictoryItemView({model:new Backbone.Model({})}))
  ])

#
# ---- User Triggered Navigation ---- #
#

App.onUserTriggeredExit = () ->
  Logger.module("APPLICATION").log "App:onUserTriggeredExit"
  return App.main()

App.onUserTriggeredSkip = () ->
  Logger.module("APPLICATION").log "App:onUserTriggeredSkip"
  gameSession = SDK.GameSession.getInstance()
  scene = Scene.getInstance()
  gameLayer = scene and scene.getGameLayer()
  if gameLayer? and gameLayer.getIsGameActive()
    # when in an active game
    if gameSession.getIsMyFollowupActiveAndCancellable()
      audio_engine.current().play_effect_for_interaction(RSX.sfx_ui_cancel.audio, CONFIG.CANCEL_SFX_PRIORITY)
      gameSession.submitExplicitAction(gameSession.getMyPlayer().actionEndFollowup())
    else if gameLayer.getIsShowingActionCardSequence()
      audio_engine.current().play_effect_for_interaction(RSX.sfx_ui_cancel.audio, CONFIG.CANCEL_SFX_PRIORITY)
      # stop showing played card
      gameLayer.skipShowActionCardSequence()

  return Promise.resolve()

App.onUserTriggeredCancel = () ->
  Logger.module("APPLICATION").log "App:onUserTriggeredCancel"
  cancelPromises = []

  if NavigationManager.getInstance().getIsShowingModalView()
    # close modal screens
    audio_engine.current().play_effect_for_interaction(RSX.sfx_ui_cancel.audio, CONFIG.CANCEL_SFX_PRIORITY)
    cancelPromises.push(NavigationManager.getInstance().destroyModalView())
  else if NavigationManager.getInstance().getHasLastRoute()
    # go to last route (handles own sfx)
    NavigationManager.getInstance().showLastRoute()
  else
    gameSession = SDK.GameSession.getInstance()
    scene = Scene.getInstance()
    gameLayer = scene and scene.getGameLayer()

    if gameLayer? and !gameLayer.getIsDisabled() and NavigationManager.getInstance().getIsShowingContentViewClass(GameLayout)
      # when in game that is not over
      if gameSession.getIsMyFollowupActiveAndCancellable()
        audio_engine.current().play_effect_for_interaction(RSX.sfx_ui_cancel.audio, CONFIG.CANCEL_SFX_PRIORITY)
        gameSession.submitExplicitAction(gameSession.actionRollbackSnapshot())
      else
        if !gameLayer.getMyPlayer().getIsTakingSelectionAction() and !gameLayer.getIsShowingActionCardSequence()
          # show esc game menu if we are not selecting something in game and not showing an action sequence
          cancelPromises.push(NavigationManager.getInstance().showModalView(new EscGameMenuItemView()))

        # always reset game active state
        gameLayer.resetActiveState()
    else
      callback = App.getCallbackWhenCancel()
      if callback?
        App.setCallbackWhenCancel(null)
        callbackResult = callback()
        if callbackResult instanceof Promise
          cancelPromises.push(callbackResult)
      else if (App.getIsLoggedIn() or window.isDesktop) and (NavigationManager.getInstance().getIsShowingContentViewClass(LoaderItemView) or NavigationManager.getInstance().getIsShowingContentViewClass(LoginMenuItemView) or NavigationManager.getInstance().getIsShowingContentViewClass(MainMenuItemView))
        # show esc main menu when on loading or login or main
        cancelPromises.push(NavigationManager.getInstance().showModalView(new EscMainMenuItemView()))
      else if (!gameLayer? or gameLayer.getIsDisabled()) and !App.getIsShowingMain()
        audio_engine.current().play_effect_for_interaction(RSX.sfx_ui_cancel.audio, CONFIG.CANCEL_SFX_PRIORITY)
        # for now just go back to main until we implement routing
        cancelPromises.push(App.main())

  return Promise.all(cancelPromises)

App.setCallbackWhenCancel = (callback) ->
  # this is a less than ideal method of setting the next step in cancel sequence
  App._callbackWhenCancel = callback

App.getCallbackWhenCancel = () ->
  return App._callbackWhenCancel

App.onUserTriggeredConfirm = () ->
  Logger.module("APPLICATION").log "App:onUserTriggeredConfirm"

#
# ---- Events: Client ---- #
#

App.beforeunload = (e) ->
  # return an empty string to trigger alert
  if App._reloadRequestIds.length == 0 and !window.isDesktop and !UtilsEnv.getIsInLocal()
    confirmMessage = ""
    (e || window.event).returnValue = confirmMessage
    return confirmMessage

App.unload = () ->
  # reset the global event bus so no more events will be handled
  EventBus.reset()

App.bindEvents = () ->
  # attach event listeners to document/window
  $(window).on('unload', App.unload.bind(App))
  $(window).on('mousemove',App.onPointerMove.bind(App))
  $(window).on('mousedown',App.onPointerDown.bind(App))
  $(window).on('mouseup',App.onPointerUp.bind(App))
  $(window).on('wheel',App.onPointerWheel.bind(App))
  $(window).on("resize", _.debounce(App.onResize.bind(App), 250))
  EventBus.getInstance().on(EVENTS.request_resize, _.debounce(App.onResize.bind(App), 250))
  $(document).on("visibilitychange",App.onVisibilityChange.bind(App))
  EventBus.getInstance().on(EVENTS.request_reload, App.onRequestReload)
  EventBus.getInstance().on(EVENTS.cancel_reload_request, App.onCancelReloadRequest)
  $(CONFIG.GAMECANVAS_SELECTOR).on("webglcontextlost", () ->
    App.onRequestReload({
      id: "webgl_context_lost",
      message: i18next.t(if window.isDesktop then 'settings.graphics_restart_required_message' else 'settings.graphics_reload_required_message')
    })
  )

  # session is a plain event emitter
  Session.on('login', App.onLogin)
  Session.on('logout', App.onLogout)
  Session.on('error', App.onSessionError)

  EventBus.getInstance().on(EVENTS.show_login, App._showLoginMenu, App)

  EventBus.getInstance().on(EVENTS.show_play, App.showPlay, App)
  EventBus.getInstance().on(EVENTS.show_collection, App.showCollection, App)
  EventBus.getInstance().on(EVENTS.show_codex, App.showCodex, App)
  EventBus.getInstance().on(EVENTS.start_challenge, App._startGameWithChallenge, App)
  EventBus.getInstance().on(EVENTS.start_single_player, App._startSinglePlayerGame, App)

  EventBus.getInstance().on EVENTS.canvas_mouse_state, App.onCanvasMouseState, App

  NavigationManager.getInstance().on(EVENTS.user_triggered_exit, App.onUserTriggeredExit, App)
  NavigationManager.getInstance().on(EVENTS.user_triggered_skip, App.onUserTriggeredSkip, App)
  NavigationManager.getInstance().on(EVENTS.user_triggered_cancel, App.onUserTriggeredCancel, App)
  NavigationManager.getInstance().on(EVENTS.user_triggered_confirm, App.onUserTriggeredConfirm, App)

  EventBus.getInstance().on EVENTS.error, App._error, App
  EventBus.getInstance().on EVENTS.ajax_error, App._error, App

App._subscribeToGameLocalEvents = () ->
  Logger.module("APPLICATION").log "App._subscribeToGameLocalEvents"
  scene = Scene.getInstance()
  gameLayer = scene?.getGameLayer()
  if gameLayer?
    gameLayer.getEventBus().on(EVENTS.after_show_end_turn, App.onAfterShowEndTurn, App)
    gameLayer.getEventBus().on(EVENTS.show_game_over, App.onShowGameOver, App)
    gameLayer.getEventBus().on(EVENTS.canvas_mouse_state, App.onCanvasMouseState, App)

  SDK.GameSession.getInstance().getEventBus().on(EVENTS.game_over, App._onGameOver, App)

App._unsubscribeFromGameLocalEvents = () ->
  Logger.module("APPLICATION").log "App._unsubscribeFromGameLocalEvents"
  scene = Scene.getInstance()
  gameLayer = scene?.getGameLayer()
  if gameLayer?
    gameLayer.getEventBus().off(EVENTS.after_show_end_turn, App.onAfterShowEndTurn, App)
    gameLayer.getEventBus().off(EVENTS.show_game_over, App.onShowGameOver, App)
    gameLayer.getEventBus().off(EVENTS.canvas_mouse_state, App.onCanvasMouseState, App)

  SDK.GameSession.getInstance().getEventBus().off(EVENTS.game_over, App._onGameOver, App)

App.onVisibilityChange = () ->
  # TODO: look into why this causes errors
  # Prevent sound effects that have been queued up from blasting all at once when app regains visibility
  if document.hidden
    # Would rather do a resume and start of effects, it doesn't stop them from piling up though
    audio_engine.current().stop_all_effects()
  else
    audio_engine.current().stop_all_effects()

#
# ---- RESIZE ---- #
#

App.onResize = (e) ->
  Logger.module("APPLICATION").log("App.onResize")
  # store current resolution data
  ignoreNextResolutionChange = App._ignoreNextResolutionChange
  App._ignoreNextResolutionChange = false
  if !ignoreNextResolutionChange
    currentResolution = CONFIG.resolution
    confirmResolutionChange = App._lastResolution? and App._lastResolution != currentResolution

  # before resize
  EventBus.getInstance().trigger(EVENTS.before_resize)

  # resize and update scale
  App._resizeAndScale()

  # resize the scene to match app
  Scene.getInstance().resize()

  # resize the UI
  EventBus.getInstance().trigger(EVENTS.resize)

  # after resize
  EventBus.getInstance().trigger(EVENTS.after_resize)

  # force user to restart if resource scale for engine has changed
  # CSS automatically handles resource scale changes
  # TODO: instead of restarting, destroy all current views, show loading screen, reload images at new scale, and return to current route
  App._needsRestart = App._lastResourceScaleEngine? and CONFIG.resourceScaleEngine != App._lastResourceScaleEngine
  if !App._needsRestart
    # cancel forced reload in case user has restored original window size
    App._cancelReloadRequestForResolutionChange()

  if confirmResolutionChange
    # confirm resolution with user after resizing
    App._confirmResolutionChange()
  else if App._needsRestart
    # force reload as user has changed window size
    App._requestReloadForResolutionChange()
  else
    # update resolution values as no confirm or restart needed
    App._updateLastResolutionValues()

  return true

App._resizeAndScale = () ->
  Logger.module("APPLICATION").log("App._resizeAndScale")
  # resize canvas to match app size
  # engine bases its window size on the canvas size
  $html = $("html")
  $canvas = $(CONFIG.GAMECANVAS_SELECTOR)
  width = Math.max(CONFIG.REF_WINDOW_SIZE.width, $html.width())
  height = Math.max(CONFIG.REF_WINDOW_SIZE.height, $html.height())
  $canvas.width(width)
  $canvas.height(height)

  # set global scale
  CONFIG.globalScale = CONFIG.getGlobalScaleForResolution(CONFIG.resolution, width, height)

  # set css scales
  CONFIG.pixelScaleCSS = CONFIG.globalScale * window.devicePixelRatio
  $html.removeClass("resource-scale-" + String(CONFIG.resourceScaleCSS).replace(".", "\."))
  CONFIG.resourceScaleCSS = 1
  for resourceScale in CONFIG.RESOURCE_SCALES
    scaleDiff = Math.abs(CONFIG.pixelScaleCSS - resourceScale)
    currentScaleDiff = Math.abs(CONFIG.pixelScaleCSS - CONFIG.resourceScaleCSS)
    if scaleDiff < currentScaleDiff or (scaleDiff == currentScaleDiff and resourceScale > CONFIG.resourceScaleCSS)
      CONFIG.resourceScaleCSS = resourceScale
  $html.addClass("resource-scale-" + String(CONFIG.resourceScaleCSS).replace(".", "\."))

  # html font size by global scale
  # css layout uses rems, which is based on html font size
  $html.css("font-size", CONFIG.globalScale * 10.0 + "px")

App._lastResolution = null
App._lastResourceScaleEngine = null
App._ignoreNextResolutionChange = false
App._needsRestart = false
App._updateLastResolutionValues = () ->
  App._lastResolution = CONFIG.resolution
  App._lastResourceScaleEngine = CONFIG.resourceScaleEngine

App._confirmResolutionChange = () ->
  Logger.module("APPLICATION").log "App._confirmResolutionChange"
  confirmData = {title: i18next.t('settings.viewport_keep_confirm_message')}
  if App._needsRestart
    if window.isDesktop
      confirmData.message = i18next.t('settings.viewport_restart_warning')
    else
      confirmData.message = i18next.t('settings.viewport_reload_warning')
  confirmDialogItemView = new ConfirmDialogItemView(confirmData)
  confirmDialogItemView.listenToOnce(confirmDialogItemView, 'confirm', ()->
    # update resolution after confirm
    App._lastResolution = CONFIG.resolution
    if App._needsRestart
      # defer to ensure this occurs after event resolves
      _.defer(App._requestReloadForResolutionChange)
    else
      # update resource scale if no restart needed
      App._lastResourceScaleEngine = CONFIG.resourceScaleEngine
  )
  confirmDialogItemView.listenToOnce(confirmDialogItemView, 'cancel', ()->
    # defer to ensure this occurs after event resolves
    _.defer(() ->
      # reset resolution and don't prompt about changes
      App._ignoreNextResolutionChange = true
      res = App._lastResolution || CONFIG.RESOLUTION_DEFAULT
      CONFIG.resolution = res
      Storage.set("resolution", res)
      App.onResize()
    )
  )

  # show confirm/cancel
  NavigationManager.getInstance().showDialogView(confirmDialogItemView)

App._requestReloadForResolutionChangeId = "resolution_change"
App._requestReloadForResolutionChange = () ->
  App.onRequestReload({
    id: App._requestReloadForResolutionChangeId
    message: i18next.t(if window.isDesktop then 'settings.viewport_restart_required_message' else 'settings.viewport_reload_required_message')
  })

App._cancelReloadRequestForResolutionChange = () ->
  App.onCancelReloadRequest({
    id: App._requestReloadForResolutionChangeId
  })

#
# ---- RELOAD ---- #
#

App._reloadRequestIds = []

###
  * Request a reload, optionally passing in a message and id (to avoid conflicts).
  *###
App.onRequestReload = (event) ->
  requestId = event?.id or 0
  if !_.contains(App._reloadRequestIds, requestId)
    App._reloadRequestIds.push(requestId)
    if App._reloadRequestIds.length == 1
      App._reload(event?.message)

###
  * Cancel a reload request, optionally passing in an id (to avoid conflicts).
  *###
App.onCancelReloadRequest = (event) ->
  requestId = event?.id or 0
  index = _.indexOf(App._reloadRequestIds, requestId)
  if index != -1
    App._reloadRequestIds.splice(index, 1)
    if App._reloadRequestIds.length == 0
      App._cancelReload()

App._reload = (message) ->
  Logger.module("APPLICATION").log "App._reload"
  titleKey = if window.isDesktop then "common.restart_prompt_title" else "common.reload_prompt_title"
  promptDialogItemView = new PromptDialogItemView({title: i18next.t(titleKey), message: message})
  promptDialogItemView.listenTo(promptDialogItemView, 'cancel', () ->
    if window.isDesktop then window.quitDesktop() else location.reload()
  )
  NavigationManager.getInstance().showDialogView(promptDialogItemView)

App._cancelReload = () ->
  Logger.module("APPLICATION").log "App._cancelReload"
  NavigationManager.getInstance().destroyDialogView()

#
# ---- Initialization Events ---- #
# Sequence of events started with App.start. Can pass options object.
#

# Pre-Start Event
App.on "before:start", (options) ->
  Logger.module("APPLICATION").log "----BEFORE START----"
  App.$el = $("#app")


# Start Event
App.on "start", (options) ->
  Logger.module("APPLICATION").log "----START----"
  # set unload alert
  $(window).on('beforeunload', App.beforeunload.bind(App))

  # set initial selected scene
  selectedScene = parseInt(Storage.get("selectedScene"))
  if moment.utc().isAfter("2016-11-29") and moment.utc().isBefore("2017-01-01")
    selectedScene = SDK.CosmeticsLookup.Scene.Frostfire
  if moment.utc().isAfter("2017-03-14") and moment.utc().isBefore("2017-05-01")
    selectedScene = SDK.CosmeticsLookup.Scene.Vetruvian
  if moment.utc().isAfter("2017-07-01") and moment.utc().isBefore("2017-08-01")
    selectedScene = SDK.CosmeticsLookup.Scene.Shimzar
  if moment.utc().isAfter("2017-12-01") and moment.utc().isBefore("2018-01-18")
    selectedScene = SDK.CosmeticsLookup.Scene.Frostfire
  if selectedScene? and !isNaN(selectedScene) and _.isNumber(selectedScene) then CONFIG.selectedScene = selectedScene

  # set initial resolution
  userResolution = parseInt(Storage.get("resolution"))
  if userResolution? and !isNaN(userResolution) and _.isNumber(userResolution) then CONFIG.resolution = userResolution
  userHiDPIEnabled = Storage.get("hiDPIEnabled")
  if userHiDPIEnabled?
    if userHiDPIEnabled == "true" then CONFIG.hiDPIEnabled = true
    else if userHiDPIEnabled == "false" then CONFIG.hiDPIEnabled = false

  # update last resolution values to initial
  App._updateLastResolutionValues()

  # resize once for initial values
  App._resizeAndScale()

  # create a defered promise object for the loading and login process... sort of an anti-pattern but best for this use case
  App.managersReadyDeferred = new Promise.defer()

  # authenticate defered, the isAuthed check must stay here so we can
  # clear the token in the event it is stale / isAuthed fails
  # the App._authenticationPromise below does not fire if there's no loading
  App._authenticationPromise = () ->
    return Session.isAuthenticated(Storage.get('token'))
      .then (isAuthed) ->
        if !isAuthed
          Storage.remove('token')
        return isAuthed

  # VIEW/engine needs to be setup and cocos manages its own setup so we need to wait async
  Logger.module("APPLICATION").group("LOADING")
  App._loadingPromise = Scene.setup().then(() ->
    # update last resolution values to initial
    App._updateLastResolutionValues()

    # setup all events
    App.bindEvents()

    # load the package of resources that should always loaded
    return PackageManager.getInstance().loadPackage("alwaysloaded")
  ).then(() ->
    # temporary bypass all loader
    return Promise.resolve()

    ###
    # check if all assets should be loaded now or as needed
    # we want to know if the client has cached all resources for this version
    # we only care when not using the desktop client, on the production environment, and not loading all at start
    # if we need to cache all resources for this version, do a non allocating cache load first
    version_preloaded = Storage.get("version_preloaded")
    needs_non_allocating_cache_load = version_preloaded != process.env.VERSION && !window.isDesktop && !CONFIG.LOAD_ALL_AT_START && UtilsEnv.getIsInProduction()
    if needs_non_allocating_cache_load || CONFIG.LOAD_ALL_AT_START
      # temporarily force disable the load all at start flag
      # this allows the preloader to setup as a major package
      # so that it gets loaded correctly before we load all
      load_all_at_start = CONFIG.LOAD_ALL_AT_START
      CONFIG.LOAD_ALL_AT_START = false
      # load preloader scene to show load of all resources
      return PackageManager.getInstance().loadAndActivateMajorPackage("preloader", null, null, () ->
        # reset load all at start flag
        CONFIG.LOAD_ALL_AT_START = load_all_at_start

        # hide loading dialog
        NavigationManager.getInstance().destroyDialogForLoad()

        # show load ui
        viewPromise = Scene.getInstance().showLoad()
        contentPromise = NavigationManager.getInstance().showContentView(new LoaderItemView())

        # once we've authenticated, show utility for loading/login
        # this way users can quit anytime on desktop, and logout or adjust settings while waiting for load
        App._authenticationPromise().then (isAuthed) ->
          if App.getIsLoggedIn() or window.isDesktop
            return NavigationManager.getInstance().showUtilityView(new UtilityLoadingLoginMenuItemView())
          else
            return Promise.resolve()

        return Promise.all([
          viewPromise,
          contentPromise
        ])
      ).then(() ->
        # load all resources
        return PackageManager.getInstance().loadPackage("all", null, ((progress) -> Scene.getInstance().getLoadLayer()?.showLoadProgress(progress)), needs_non_allocating_cache_load)
      ).then(() ->
        # set version assets were preloaded for
        if !window.isDesktop
          Storage.set("version_preloaded", process.env.VERSION)
      )
    else
      # no loading needed now
      return Promise.resolve()
    ###
  ).then(() ->
    # end loading log group
    Logger.module("APPLICATION").groupEnd()
  )

  # The local session resolves synchronously. Wait until Scene.setup has bound
  # the session listeners, otherwise the offline login event is emitted before
  # App.onLogin can initialize the managers.
  authenticationPromise = if OfflineMode.isEnabled()
    App._loadingPromise.then(() -> App._authenticationPromise())
  else
    App._authenticationPromise()

  # setup start promise
  App._startPromise = Promise.all([
    App._loadingPromise,
    authenticationPromise
  ])

  # goto main screen
  App.main()

# get minimum browsers from Firebase
App.getMinBrowserVersions = () ->
  if Storage.get("skipBrowserCheck") then return Promise.resolve()
  return new Promise (resolve, reject) ->
    minBrowserVersionRef = new Firebase(process.env.FIREBASE_URL).child("system-status").child('browsers')

    defaults = {
      "Chrome": 50,
      "Safari": 10,
      "Firefox": 57,
      "Edge": 15,
      "Mobile Safari": 10,
    }

    # create a timeout to skip check in case Firebase lags (so atleast user does not get stuck on black screen)
    minBrowserVersionTimeout = setTimeout(() ->
      minBrowserVersionRef.off()
      resolve(defaults)
    , 5000)

    minBrowserVersionRef.once 'value', (snapshot) ->
      clearTimeout(minBrowserVersionTimeout)
      if !snapshot.val()
        resolve(defaults)
      else
        resolve(snapshot.val())

# check if given browser is valid when compared against list of allowed browsers
App.isBrowserValid = (browserName, browserMajor, supportedBrowsers) ->
  if Storage.get("skipBrowserCheck") then return true
  if browserName == 'Electron' then return true

  if Object.keys(supportedBrowsers).includes(browserName)
    return parseInt(browserMajor, 10) >= supportedBrowsers[browserName]
  else
    return false

App.generateBrowserHtml = (browser, version) ->
  if browser == 'Chrome'
    return """
      <p><a href='http://google.com/chrome'><strong>Google Chrome</strong> #{version} or newer.</a></p>
    """
  else if browser == 'Safari'
    return """
      <p><a href='https://www.apple.com/safari/'><strong>Apple Safari</strong> #{version} or newer.</a></p>
    """
  else if browser == 'Firefox'
    return """
      <p><a href='https://www.mozilla.org/firefox/'><strong>Mozilla Firefox</strong> #{version} or newer.</a></p>
    """
  else if browser == 'Edge'
    return """
      <p><a href='https://www.microsoft.com/en-us/windows/microsoft-edge'><strong>Microsoft Edge</strong> #{version} or newer.</a></p>
    """

# show some HTML saying the current browser is not supported if browser detection fails
App.browserTestFailed = (browserName, browserVersion, supportedBrowsers) ->
  html = """
    <div style="margin:auto; position:absolute; height:50%; width:100%; top: 0px; bottom: 0px; font-size: 20px; color: white; text-align: center;">
      <p>Looks like your current browser is not supported.</p>
      <p>Your browser was detected as: #{browserName} version #{browserVersion}.</p>
      <p>Visit <a href='https://support.duelyst.com' style="color: gray;">our support page</a> to submit a request for assistance.</p>
      <br>
  """

  # dynamically create html containing list of support browsers
  Object.keys(supportedBrowsers).forEach (browser) ->
    version = supportedBrowsers[browser]
    html += App.generateBrowserHtml(browser, version)

  html += "</div>"
  $("#app-preloading").css({display:"none"})
  $("#app-content-region").css({margin:"auto", height:"50%", width: "50%"})
  $("#app-content-region").html(html)

# ensure webgl is correctly running
App.glTest = () ->
  try
    canvas = document.createElement('canvas')
    return !! (window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
  catch e
    return false

App.glTestFailed = () ->
  if window.isDesktop
    html = """
      <div style="margin:auto; position:absolute; height:50%; width:100%; top: 0px; bottom: 0px; font-size: 20px; color: white; text-align: center;">
        <p>Looks like your video card is not supported.</p>
        <p>Ensure your video card drivers are up to date.</p>
        <p>Visit <a id='support-link' href='https://support.duelyst.com' style="color: gray;">our support page</a> to submit a request for assistance.</p>
      </div>
    """
  else
    html = """
      <div style="margin:auto; position:absolute; height:50%; width:100%; top: 0px; bottom: 0px; font-size: 20px; color: white; text-align: center;">
        <p>Looks like WebGL is not enabled in your browser./p>
        <p>Visit the <a id='webgl-link' href='https://get.webgl.org/' style="color: gray;">WebGL test page</a> for more information.</p>
        <p>Visit <a id='support-link' href='https://support.duelyst.com' style="color: gray;">our support page</a> to submit a request for assistance.</p>
      </div>
    """
  $("#app-preloading").css({display:"none"})
  $("#app-content-region").css({margin:"auto", height:"50%", width: "50%"})
  $("#app-content-region").html(html)
  $("#webgl-link").click (e) ->
    openUrl($(e.currentTarget).attr("href"))
    e.stopPropagation()
    e.preventDefault()
  $("#support-link").click (e) ->
    openUrl($(e.currentTarget).attr("href"))
    e.stopPropagation()
    e.preventDefault()

# show some HTML saying they are on an old client version
App.versionTestFailed = () ->
  if window.isDesktop
    html = """
      <div style="margin:auto; position:absolute; height:50%;  width:100%; top: 0px; bottom: 0px; font-size: 20px; color: white; text-align: center;">
        <p>Looks like you are running an old version of DUELYST.</p>
        <p>Exit and restart DUELYST to update to the latest version.</p>
        <p>Click <a id='reload-link' href='' style="color: gray;">here</a> to exit.</p>
      </div>
    """
  else
    html = """
      <div style="margin:auto; position:absolute; height:50%;  width:100%; top: 0px; bottom: 0px; font-size: 20px; color: white; text-align: center;">
        <p>Looks like you are running an old version of DUELYST.</p>
        <p>Click <a id='reload-link' href='' style="color: gray;">here</a> to refresh your browser to the latest version.</p>
      </div>
    """
  $("#app-preloading").css({display:"none"})
  $("#app-content-region").css({margin:"auto", height:"50%", width: "50%"})
  $("#app-content-region").html(html)
  $("#reload-link").click (e) ->
    if window.isDesktop then window.quitDesktop() else location.reload()

# compare if process.env.VERSION is gte >= than provided minimum version
# if minimumVersion is undefined or null, we set to '0.0.0'
App.isVersionValid = (minimumVersion) ->
  Logger.module("APPLICATION").log "#{process.env.VERSION} >= #{minimumVersion || '0.0.0'}"
  try
    return semver.gte(process.env.VERSION, minimumVersion || '0.0.0')
  catch e
    return true

# App.setup is the main entry function into Marionette app
# grabs configuration from server we're running on and call App.start()
App.setup = () ->
  # mark all requests with buld version
  $.ajaxSetup
    headers:
      "Client-Version": process.env.VERSION

  App.start()

#
# ---- Application Start Sequence ---- #
#
App.getMinBrowserVersions()
.then (supportedBrowsers) ->
  if !App.isBrowserValid(userAgent.browser.name, userAgent.browser.major, supportedBrowsers)
    return App.browserTestFailed(userAgent.browser.name, userAgent.browser.major, supportedBrowsers)

  if !App.glTest()
    return App.glTestFailed()

  App.minVersionRef = new Firebase(process.env.FIREBASE_URL).child("system-status").child('minimum_version')

  # wrap App.setup() in _.once() just to be safe from double calling
  App.setupOnce = _.once(App.setup)

  # create a timeout to skip version check in case Firebase lags (so atleast user does not get stuck on black screen)
  App.versionCheckTimeout = setTimeout(() ->
    App.minVersionRef.off()
    App.setupOnce()
  , 5000)

  # read minimum version from Firebase and perform check, if fails, show error html
  # otherwise start application as normal
  App.minVersionRef.once('value', (snapshot) ->
    clearTimeout(App.versionCheckTimeout)
    if !App.isVersionValid(snapshot.val())
      App.versionTestFailed()
    else
      App.setupOnce()
  )
