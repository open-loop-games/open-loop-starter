/**
 * Action runner module — per-tick execution engine for Idle Loops actions.
 *
 * Owns a bare ContentRegistry<ActionDef> and a single onTick dispatcher that
 * drives all three looper action types (basic/progress/regular). Per-def tick
 * state lives in action-types/*; this module is the routing + completion layer.
 *
 * Bespoke looper additions vs. idle-loops-ng:
 * - Weight-based multi-stat XP (def.weights replaces def.stats)
 * - Prereq array visibility (def.prereqs replaces def.visible/unlocked)
 * - canStart(LooperGameState) runnability gate (passes module-backed state)
 *
 * Effect dispatch is direct: per-completion arithmetic ('add this many of X')
 * calls the resource module helpers in a small switch on `effect.kind`. No
 * engine accessor/IEffect indirection — the per-effect math is too small
 * for the engine pipeline to earn its weight.
 *
 * Reference: idleLoops/actions.js, idle-loops-ng/src/modules/action-runner.ts
 */

import {
  Decimal,
  type EngineModule,
  type EngineContext,
  type ContentRegistry,
  type Loop,
  bn,
  createContentRegistry,
  GameLoopKey,
  tunable,
} from '@open-loop/engine';
import { LooperTuningRegistryKey } from './tuning';
import { ACTIONS } from '../data/actions';
import { ref } from 'vue';
import type {
  ActionDef,
  ActionPrereq,
  CompletionEffect,
  RewardEffect,
  LooperGameState,
} from '../data/types';
import { PROGRESS_VARS } from '../data/progress-vars';
import {
  getActiveLoopQueue,
  addCompletedTicks,
  patchCursorMeta,
  accumulateCurrentItemTime,
  isActiveQueueExhausted,
  getRepeatLastAction,
} from './action-queue';
import { getCurrentZone, addProgressXP, finishRegular, getProgressLevel } from './zones';
import { computeAdjustedTicks, addExpFromAction, setCostDivisorReader } from './action-formulas';
import { installBasicOne, dispatchBasic, basicCategory } from './action-types/basic';
import { installProgressOne, dispatchProgress, progressCategory } from './action-types/progress';
import { installRegularOne, dispatchRegular, regularCategory } from './action-types/regular';
import { getStatLevel, getTalentLevel } from './stats';
import { getLoop } from './loop';
import { getManaValue, addMana } from './mana';
import {
  getResourceValue,
  addResourceAmount,
  subtractResourceAmount,
  hasEnough,
} from './resources';

export { basicCategory, progressCategory, regularCategory };

// ============================================================================
// Action Registry
// ============================================================================

/** Bare content registry — per-type state and dispatch live in action-types/. */
let actions: ContentRegistry<ActionDef>;

let loop: Loop;

/**
 * Restart flag — set when the dispatcher observes an exhausted active queue.
 * The loop module reads via `isRestartFlagged()` and clears via `consumeRestartFlag()`.
 */
const _restartFlag = ref(false);

/** Read the restart flag. */
export function isRestartFlagged(): boolean {
  return _restartFlag.value;
}

/** Clear the restart flag — called by loop module in `onLoopRestart`. */
export function consumeRestartFlag(): void {
  _restartFlag.value = false;
}

/** Get the action definition registry */
export function getActionRegistry(): ContentRegistry<ActionDef> {
  return actions;
}

/** Get an action definition by ID */
export function getActionDef(id: string): ActionDef | undefined {
  return actions.get(id);
}

/**
 * Register an action definition and eagerly build its per-type state.
 */
export function registerAction(def: ActionDef): void {
  actions.register(def);
  installBasicOne(def);
  installProgressOne(def);
  installRegularOne(def);
}

/** Register multiple action definitions at once. */
export function registerActions(defs: ActionDef[]): void {
  for (const def of defs) registerAction(def);
}

// ============================================================================
// Completion hooks
// ============================================================================

type CompletionHook = (def: ActionDef, proceedNative: () => void) => void;
const _completionHooks: CompletionHook[] = [];

/**
 * Register a completion hook. The hook fires on every action completion and
 * must explicitly call `proceedNative()` to allow the normal completion path.
 */
export function addCompletionHook(hook: CompletionHook): void {
  _completionHooks.push(hook);
}

// ============================================================================
// Prereq evaluation
// ============================================================================

export function getTimesCompleted(actionId: string): Decimal {
  const bs = basicCategory.getEntry(actionId)?.state;
  if (bs) return bn(bs.timesCompleted.value);
  const ps = progressCategory.getEntry(actionId)?.state;
  if (ps) return bn(ps.timesCompleted.value);
  const rs = regularCategory.getEntry(actionId)?.state;
  if (rs) return bn(rs.timesCompleted.value);
  return Decimal.dZero;
}

export function getActionProgress(id: string): number {
  const def = getActionDef(id);
  if (!def) return 0;
  const adjusted = computeAdjustedTicks(def);
  if (Decimal.lte(adjusted, 0)) return 0;
  const state =
    def.type === 'basic'
      ? basicCategory.getEntry(id)?.state
      : def.type === 'progress'
        ? progressCategory.getEntry(id)?.state
        : def.type === 'regular'
          ? regularCategory.getEntry(id)?.state
          : undefined;
  if (!state) return 0;
  return Math.min(1, Math.max(0, Decimal.div(state.progress.value, adjusted).toNumber()));
}

function evaluatePrereq(prereq: ActionPrereq): boolean {
  switch (prereq.kind) {
    case 'always':
      return true;
    case 'action-completion-count':
      return Decimal.gte(getTimesCompleted(prereq.actionId), prereq.value);
    case 'stat-tier-level': {
      try {
        const level =
          prereq.tier === 'level' ? getStatLevel(prereq.statId) : getTalentLevel(prereq.statId);
        return Decimal.gte(level, prereq.value);
      } catch {
        return false;
      }
    }
    case 'progress-var-level':
      return Decimal.gte(getProgressLevel(prereq.progressVarId), prereq.value);
    case 'loop-count':
      return loop.count.value >= prereq.value;
  }
}

/** Check if an action is visible (all prereqs match). */
export function isActionVisible(def: ActionDef): boolean {
  if (!def.prereqs || def.prereqs.length === 0) return true;
  return def.prereqs.every(evaluatePrereq);
}

/**
 * Build a LooperGameState snapshot from live module state.
 * Passed to def.canStart() for runnability checks.
 */
function buildLooperGameState(): LooperGameState {
  return {
    manaAtLeast(amount) {
      return getManaValue().gte(amount);
    },
    goldAtLeast(amount) {
      return hasEnough('gold', amount);
    },
    statLevelAtLeast(statId, tier, n) {
      try {
        const level = tier === 'level' ? getStatLevel(statId) : getTalentLevel(statId);
        return Decimal.gte(level, n);
      } catch {
        return false;
      }
    },
    progressVarLevelAtLeast(pvId, n) {
      return Decimal.gte(getProgressLevel(pvId), n);
    },
    actionCompletedAtLeast(actionId, count) {
      return Decimal.gte(getTimesCompleted(actionId), count);
    },
    loopCountAtLeast(n) {
      return loop.count.value >= n;
    },
  };
}

// ============================================================================
// Completion / reward effect dispatch
// ============================================================================

/**
 * Apply a basic-type action's CompletionEffect array. Pre-snapshot gold so
 * `exchange-gold-to-mana` reads pre-spend value regardless of effect order
 * inside the array — mirrors vanilla `addMana(gold * 50); addGold(-gold)`.
 */
function applyCompletionEffects(def: ActionDef & { type: 'basic' }): void {
  if (!def.completionEffects?.length) return;
  const preBatchGold = getResourceValue('gold');
  for (const effect of def.completionEffects) applyOneCompletionEffect(effect, def, preBatchGold);
}

function applyOneCompletionEffect(
  effect: CompletionEffect,
  def: ActionDef & { type: 'basic' },
  preBatchGold: Decimal,
): void {
  switch (effect.kind) {
    case 'add-mana':
      addMana(effect.amount);
      return;
    case 'add-gold':
      addResourceAmount('gold', effect.amount);
      return;
    case 'spend-gold':
      subtractResourceAmount(
        'gold',
        effect.amount === 'all' ? getResourceValue('gold') : effect.amount,
      );
      return;
    case 'exchange-gold-to-mana':
      addMana(Decimal.mul(preBatchGold, def.exchangeMult ?? 50));
      return;
  }
}

/** Apply a regular-type action's RewardEffect array (fired on good-finds). */
function applyRewardEffects(effects: readonly RewardEffect[]): void {
  for (const effect of effects) {
    if (effect.kind === 'add-mana') addMana(effect.amount);
    else addResourceAmount('gold', effect.amount);
  }
}

// ============================================================================
// Dispatcher
// ============================================================================

let _dispatcherTickRate = 20;

/**
 * Metadata patch on dispatched-type completion.
 */
function onDispatchedComplete(adjusted: number): void {
  const queue = getActiveLoopQueue();
  addCompletedTicks(adjusted);

  const cursorIdx = queue.cursor;
  const items = queue.items.value;
  if (cursorIdx < 0 || cursorIdx >= items.length) return;
  const meta = items[cursorIdx].metadata;
  const goldSnapshot = getResourceValue('gold').toNumber();
  const updated = [...items];
  updated[cursorIdx] = {
    ...updated[cursorIdx],
    metadata: {
      ...meta,
      loopsLeft: Math.max(0, meta.loopsLeft - 1),
      adjustedTicks: adjusted,
      manaUsed: meta.manaUsed + adjusted,
      ticks: 0,
      goldRemaining: goldSnapshot,
      errorMessage: undefined,
    },
  };
  queue.items.value = updated;
}

/**
 * Grant progress-var XP for a completed progress-type action.
 * Applies the ProgressState's gainChain and the pvDef.expMult.
 */
function grantProgressXP(def: ActionDef): void {
  if (def.type !== 'progress' || def.progressAmount == null) return;
  const pvDef = PROGRESS_VARS.find((pv) => pv.id === def.progressVarId);
  const expMult = pvDef ? bn(pvDef.expMult) : Decimal.dOne;
  const base = Decimal.mul(def.progressAmount, expMult);
  const state = progressCategory.getEntry(def.id)?.state;
  const multiplied = state ? state.gainChain.apply(base) : base;
  addProgressXP(def.progressVarId, multiplied);
}

/**
 * Finalize a regular-type completion: pool check + conditional rewardEffects.
 */
function finishRegularCompletion(def: ActionDef): void {
  if (def.type !== 'regular') return;
  finishRegular(def.regularVarId, def.rewardRatio, () => {
    if (def.rewardEffects?.length) applyRewardEffects(def.rewardEffects);
    return 1;
  });
}

function dispatchTick(dt: number): void {
  if (!loop.running.value) return;
  const queue = getActiveLoopQueue();
  const item = queue.currentItem;
  if (!item) {
    if (isActiveQueueExhausted()) _restartFlag.value = true;
    return;
  }

  const def = actions.get(item.id);
  if (!def) return;
  if (def.type !== 'basic' && def.type !== 'progress' && def.type !== 'regular') return;
  if (item.metadata.loopsLeft <= 0) return;

  const adjusted = computeAdjustedTicks(def);

  // Shared tick instrumentation — XP grant per tick, wall time
  addExpFromAction(def, adjusted);
  accumulateCurrentItemTime(dt);

  // gainPerTick: at dt ≈ 1/tickRate, speedMult=1, ticksAmt=1 → 1 unit/frame
  const gainPerTick = _dispatcherTickRate * dt; // speedMult=1, ticksAmt=1 (declared invention)

  const status =
    def.type === 'basic'
      ? dispatchBasic(def, gainPerTick, adjusted)
      : def.type === 'progress'
        ? dispatchProgress(def, gainPerTick, adjusted)
        : dispatchRegular(def, gainPerTick, adjusted);

  if (status !== 'completed') return;

  // Native completion path — type-specific effects.
  // Wrapped in a closure so completion hooks can call it or gate it.
  const proceedNative = () => {
    if (def.type === 'progress') {
      grantProgressXP(def);
    } else if (def.type === 'regular') {
      finishRegularCompletion(def);
    } else if (def.type === 'basic') {
      applyCompletionEffects(def);
    }
  };

  if (_completionHooks.length === 0) {
    proceedNative();
  } else {
    _completionHooks[0](def, proceedNative);
  }

  const liveLoopsLeft =
    queue.items.value[queue.cursor]?.metadata.loopsLeft ?? item.metadata.loopsLeft;
  const wasLastLoop = Math.max(0, liveLoopsLeft - 1) <= 0;
  onDispatchedComplete(adjusted.toNumber());

  if (wasLastLoop) {
    if (shouldRepeatLast(def, queue)) {
      patchCursorMeta((m) => ({ ...m, loops: m.loops + 1, loopsLeft: m.loopsLeft + 1 }));
    } else {
      queue.complete();
    }
  }
}

/**
 * Vanilla repeat-last gate.
 */
function shouldRepeatLast(def: ActionDef, queue: ReturnType<typeof getActiveLoopQueue>): boolean {
  if (!getRepeatLastAction().value) return false;
  if (queue.cursor !== queue.items.value.length - 1) return false;
  if (def.zoneId !== getCurrentZone()) return false;
  if (def.canStart && !def.canStart(buildLooperGameState())) return false;
  return true;
}

// ============================================================================
// Queue wiring (canRun gate + skip handler)
// ============================================================================

/**
 * Wire queue-level gates onto the active sequencer. Called from boot.ts
 * after all actions are registered.
 */
export function initRunner(): void {
  const queue = getActiveLoopQueue();

  queue.canRun = (item) => {
    const def = actions.get(item.id);
    if (!def) return 'never';
    if (item.metadata.disabled) return 'never';
    if (def.zoneId !== getCurrentZone()) return 'never';
    if (def.canStart && !def.canStart(buildLooperGameState())) return 'never';
    return 'now';
  };

  queue.on('skip', () => {
    const priorIdx = queue.cursor - 1;
    if (priorIdx < 0) return;
    const items = queue.items.value;
    if (priorIdx >= items.length) return;
    const meta = items[priorIdx].metadata;
    if (meta.errorMessage) return;
    const updated = [...items];
    updated[priorIdx] = {
      ...updated[priorIdx],
      metadata: {
        ...meta,
        failedCount: meta.failedCount + 1,
        errorMessage: 'Cannot run here',
      },
    };
    queue.items.value = updated;
  });
}

// ============================================================================
// Mana Budget Calculation
// ============================================================================

/**
 * Remaining mana needed for the active loop (current cursor to end).
 * Reference: idleLoops/actions.js adjustTicksNeeded
 */
export function calcTotalTicksNeeded(): Decimal {
  const queue = getActiveLoopQueue();
  const items = queue.items.value;
  const cursor = queue.cursor;
  let total = Decimal.dZero;

  for (let i = cursor; i < items.length; i++) {
    const item = items[i];
    const def = actions.get(item.id);
    if (!def) continue;
    const adjusted = computeAdjustedTicks(def);
    total = Decimal.add(total, Decimal.mul(item.metadata.loopsLeft, adjusted));
  }

  return total;
}

// ============================================================================
// Module
// ============================================================================

export const actionRunnerModule: EngineModule = {
  id: 'action-runner',
  dependencies: ['tuning', 'stats', 'mana', 'resources', 'zones', 'action-queue', 'loop'],
  install(ctx: EngineContext) {
    const gameLoop = ctx.inject(GameLoopKey);
    _dispatcherTickRate = gameLoop.tickRate;
    loop = getLoop();

    const tuningRegistry = ctx.inject(LooperTuningRegistryKey);
    // Vanilla canonical: `1 + level / 100` cost-reduction shape on stat Level.
    // Reference: idleLoops/actions.js setAdjustedTicks.
    const costDivisorRef = tunable(tuningRegistry, 'balance/costDivisor', () => 100);
    setCostDivisorReader(() => costDivisorRef.value);

    actions = createContentRegistry<ActionDef>('actions');
    registerActions(ACTIONS);
    initRunner();

    ctx.onTick((dt: number) => dispatchTick(dt));
  },
};
