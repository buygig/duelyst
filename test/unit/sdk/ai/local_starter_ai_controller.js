const path = require('path');

require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');

const EventBus = require('../../../../app/common/eventbus');
const EVENTS = require('../../../../app/common/event_types');
const LocalStarterAIController = require('../../../../app/sdk/ai/localStarterAIController.coffee');

function createScheduler() {
  const timers = [];

  return {
    setTimeout(callback) {
      const timer = { callback, cancelled: false };
      timers.push(timer);
      return timer;
    },

    clearTimeout(timer) {
      timer.cancelled = true;
    },

    flushNext() {
      const timer = timers.shift();
      if (timer && !timer.cancelled) timer.callback();
    },

    pendingCount() {
      return timers.filter((timer) => !timer.cancelled).length;
    },
  };
}

function createAction(name) {
  return {
    name,
    getIsImplicit() { return false; },
    getOwnerId() { return 'ai'; },
  };
}

function createSession(overrides) {
  const eventBus = EventBus.create();
  const endTurnAction = createAction('end-turn');
  const executedActions = [];
  const state = {
    active: true,
    currentPlayerId: 'ai',
    isNew: false,
    isOver: false,
  };

  const session = {
    state,
    endTurnAction,
    executedActions,
    getEventBus() { return eventBus; },
    getIsRunningAsAuthoritative() { return true; },
    getAiPlayerId() { return 'ai'; },
    getAiDifficulty() { return 0.5; },
    getPlayerById() { return { getHasStartingHand() { return false; } }; },
    getCurrentPlayerId() { return state.currentPlayerId; },
    hasStepsInQueue() { return false; },
    hasActionsInQueue() { return false; },
    isActive() { return state.active; },
    isNew() { return state.isNew; },
    isOver() { return state.isOver; },
    actionEndTurn() { return endTurnAction; },
    submitExplicitAction(action) {
      executedActions.push(action);
      return true;
    },
  };

  return Object.assign(session, overrides);
}

describe('LocalStarterAIController', () => {
  it('executes StarterAI actions and ends the turn when no action remains', () => {
    const scheduler = createScheduler();
    const firstAction = createAction('move');
    const actions = [firstAction, null];
    const ai = { nextAction() { return actions.shift(); } };
    const session = createSession();
    const controller = new LocalStarterAIController(session, {
      ai,
      setTimeout: scheduler.setTimeout,
      clearTimeout: scheduler.clearTimeout,
    });

    controller.start();
    scheduler.flushNext();
    expect(session.executedActions).to.deep.equal([firstAction]);

    session.getEventBus().trigger(EVENTS.step, { gameSession: session });
    scheduler.flushNext();
    expect(session.executedActions).to.deep.equal([firstAction, session.endTurnAction]);

    controller.destroy();
  });

  it('forces EndTurn after an action cannot be submitted', () => {
    const scheduler = createScheduler();
    const invalidAction = createAction('invalid');
    const ai = { nextAction() { return invalidAction; } };
    const session = createSession({
      submitExplicitAction(action) {
        this.executedActions.push(action);
        return action !== invalidAction;
      },
    });
    const controller = new LocalStarterAIController(session, {
      ai,
      setTimeout: scheduler.setTimeout,
      clearTimeout: scheduler.clearTimeout,
    });

    controller.start();
    scheduler.flushNext();
    scheduler.flushNext();

    expect(session.executedActions).to.deep.equal([invalidAction, session.endTurnAction]);
    controller.destroy();
  });

  it('waits for the AI turn and reacts to start-turn events', () => {
    const scheduler = createScheduler();
    const session = createSession();
    session.state.currentPlayerId = 'human';
    const controller = new LocalStarterAIController(session, {
      ai: { nextAction() { return null; } },
      setTimeout: scheduler.setTimeout,
      clearTimeout: scheduler.clearTimeout,
    });

    controller.start();
    scheduler.flushNext();
    expect(session.executedActions).to.deep.equal([]);

    session.state.currentPlayerId = 'ai';
    session.getEventBus().trigger(EVENTS.start_turn, { gameSession: session });
    scheduler.flushNext();
    expect(session.executedActions).to.deep.equal([session.endTurnAction]);

    controller.destroy();
  });

  it('lets StarterAI submit its mulligan while the game is new', () => {
    const scheduler = createScheduler();
    const mulliganAction = createAction('draw-starting-hand');
    const session = createSession();
    session.state.active = false;
    session.state.isNew = true;
    const controller = new LocalStarterAIController(session, {
      ai: { nextAction() { return mulliganAction; } },
      setTimeout: scheduler.setTimeout,
      clearTimeout: scheduler.clearTimeout,
    });

    controller.start();
    scheduler.flushNext();
    expect(session.executedActions).to.deep.equal([mulliganAction]);

    controller.destroy();
  });

  it('unsubscribes and cancels pending work on destroy', () => {
    const scheduler = createScheduler();
    const session = createSession();
    const controller = new LocalStarterAIController(session, {
      ai: { nextAction() { return null; } },
      setTimeout: scheduler.setTimeout,
      clearTimeout: scheduler.clearTimeout,
    });

    controller.start();
    expect(scheduler.pendingCount()).to.equal(1);

    controller.destroy();
    expect(scheduler.pendingCount()).to.equal(0);

    session.getEventBus().trigger(EVENTS.step, { gameSession: session });
    expect(scheduler.pendingCount()).to.equal(0);
  });

  it('rejects a non-authoritative session', () => {
    const session = createSession({ getIsRunningAsAuthoritative() { return false; } });
    const controller = new LocalStarterAIController(session, {
      ai: { nextAction() { return null; } },
    });

    expect(() => controller.start()).to.throw('authoritative GameSession');
  });
});
