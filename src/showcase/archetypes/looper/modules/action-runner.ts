/**
 * Action runner module — active execution queue on top of `createActionCategory`.
 *
 * Owns `activeLoopCategory` (an `ActionCategory<ActionDef, void, ActionPayload>`)
 * and a single dispatcher tick closure that switches on `def.type` to drive
 * the three looper action types (basic/progress/regular). Per-def tick state
 * lives in `action-types/*` sibling categories; this module is the routing,
 * accumulator, and completion layer.
 *
 * State split:
 * - Per-def persistent state (`progress`, `timesCompleted`, optional
 *   `gainChain`) — in sibling per-def categories under `action-types/`.
 *   ActionCategory's `State = void`.
 * - Per-enqueue consumer payload (`loops`, `loopsLeft`, `disabled`, `statExp`)
 *   — typed `Payload` on item metadata.
 * - Per-execution engine slots (`lifecycle`, `progress` multi-bar, `attempt`,
 *   `error`, `timing`) — managed by ActionCategory.
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
  type Loop,
  type SequencerItem,
  type ActionCategory,
  type ActionItemMetadata,
  bn,
  computed,
  createActionCategory,
  TickDriverKey,
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
import { getEditLoopQueue, getRepeatLastAction } from './action-queue';
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
// Types
// ============================================================================

/**
 * Per-execution payload — what the consumer types into ActionCategory's
 * `Payload` generic. Plain JSON-serializable; Decimal-scale state stays in
 * sibling per-def categories.
 */
export interface ActionPayload {
  loops: number;
  loopsLeft: number;
  disabled: boolean;
  /**
   * Per-stat XP accumulated this execution. Boosted figure (after talentMult)
   * — see `addExpFromAction` in action-formulas.ts.
   */
  statExp: Record<string, number>;
}

/**
 * Multi-bar engine progress slot keys. Used through `tickItemProgress` /
 * `setItemProgress`. Bars are plain numbers; large Decimal quantities stay
 * in sibling category state.
 */
const PROGRESS_KEYS = ['ticks', 'timeSpent', 'manaUsed', 'goldRemaining'] as const;
type ProgressKey = (typeof PROGRESS_KEYS)[number];
type ActionProgress = Record<ProgressKey, number>;

function zeroProgress(): ActionProgress {
  return { ticks: 0, timeSpent: 0, manaUsed: 0, goldRemaining: 0 };
}

// ============================================================================
// Module State
// ============================================================================

let activeLoopCategory: ActionCategory<ActionDef, void, ActionPayload>;
let loop: Loop;
let _dispatcherTickRate = 20;

/** Completed ticks this loop (for progress display) */
let completedTicks = 0;

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

// ============================================================================
// Public API — active-queue access
// ============================================================================

/** Get the active action category (executing queue + per-execution state machine). */
export function getActiveLoopCategory(): ActionCategory<ActionDef, void, ActionPayload> {
  return activeLoopCategory;
}

/** Items in the active queue (what's running this loop). */
export function getActiveList(): SequencerItem<ActionItemMetadata<ActionPayload>>[] {
  return activeLoopCategory.sequencer.items.value;
}

/** Cursor position in the active queue. */
export function getActiveCursor(): number {
  return activeLoopCategory.sequencer.cursor;
}

/**
 * Vanilla parity for `getNextValidAction() == null`: the active queue has
 * items but the cursor has walked past the end (last item completed, or all
 * remaining items got skipped by canRun).
 *
 * Reference: idleLoops/actions.js Actions.tick — `shouldRestart = true` when
 * `getNextValidAction()` returns null.
 */
export function isActiveQueueExhausted(): boolean {
  const items = activeLoopCategory.sequencer.items.value;
  if (items.length === 0) return false;
  return activeLoopCategory.sequencer.cursor >= items.length;
}

/** Get completed ticks this loop */
export function getCompletedTicks(): number {
  return completedTicks;
}

/** Add to completed ticks (called by action runner on action completion) */
export function addCompletedTicks(ticks: number): void {
  completedTicks += ticks;
}

/** Get an action definition by ID */
export function getActionDef(id: string): ActionDef | undefined {
  return activeLoopCategory.getDef(id);
}

/** The action def registry (live `ContentRegistry<ActionDef>`). */
export function getActionRegistry() {
  return activeLoopCategory.registry;
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

// ============================================================================
// Active queue lifecycle (copy edit → active, reset per loop)
// ============================================================================

/**
 * Copy the edit queue into the active category and reset the cursor.
 *
 * Called on initial play / manual restart / loop-end unless `preserveActive`
 * is set. With `preserveActive`, leaves active contents untouched and only
 * resets the per-execution metadata + cursor (replay the same list).
 */
export function startActiveLoop(preserveActive = false): void {
  completedTicks = 0;

  if (!preserveActive) {
    activeLoopCategory.sequencer.clear();
    for (const item of getEditLoopQueue().items.value) {
      activeLoopCategory.enqueue(item.id, {
        payload: {
          loops: item.metadata.loops,
          loopsLeft: item.metadata.loops,
          disabled: item.metadata.disabled,
          statExp: {},
        },
      });
    }
  } else {
    for (const item of activeLoopCategory.sequencer.items.value) {
      const defId = item.metadata.defId;
      activeLoopCategory.patchItemPayload(defId, (p) => ({
        ...p,
        loopsLeft: p.loops,
        statExp: {},
      }));
      activeLoopCategory.setItemProgress(defId, zeroProgress());
      activeLoopCategory.setItemError(defId, null);
    }
  }

  activeLoopCategory.sequencer.resetCursor();
}

/**
 * Reset the action queues for a new loop.
 *
 * Reference: idleLoops/actions.js restart()
 */
export function restartActionQueue(preserveActive = false): void {
  startActiveLoop(preserveActive);
}

/**
 * If active has items from a prior save but the runner hasn't started,
 * kick it off. Called on game load bootstrap.
 */
export function bootstrapActiveFromSave(): void {
  const active = activeLoopCategory.sequencer.items.value;
  const edit = getEditLoopQueue().items.value;

  if (active.length === 0 && edit.length > 0) {
    startActiveLoop(false);
    return;
  }
  // active.length > 0: dispatcher reads sequencer.currentItem each tick; cursor consistent.
}

// ============================================================================
// Per-item progress helpers (multi-bar engine slot accessors)
// ============================================================================

function progressOf(meta: ActionItemMetadata<ActionPayload>): ActionProgress {
  const raw = meta.progress;
  if (typeof raw === 'number') return zeroProgress();
  return {
    ticks: raw.ticks ?? 0,
    timeSpent: raw.timeSpent ?? 0,
    manaUsed: raw.manaUsed ?? 0,
    goldRemaining: raw.goldRemaining ?? 0,
  };
}

// ============================================================================
// Dispatcher (per-def tick closure inside mapAction)
// ============================================================================

/**
 * Per-def tick — fires when this def is the current active item. Switches
 * on `def.type` to call the matching sibling dispatch function.
 *
 * On 'completed':
 * - Apply per-type effects (completionEffects / progress XP / regular pool).
 * - Decrement loopsLeft on the payload.
 * - Snapshot gold remaining; accumulate mana used; reset ticks.
 * - On last loop: either `sequencer.repeat()` (with payload bump) or
 *   `sequencer.complete()`.
 */
function runDispatch(def: ActionDef, dt: number): void {
  if (!loop.running.value) return;
  if (def.type !== 'basic' && def.type !== 'progress' && def.type !== 'regular') return;

  const current = activeLoopCategory.currentItem;
  if (!current || current.defId !== def.id) return;
  if (current.payload.loopsLeft <= 0) return;

  const adjusted = computeAdjustedTicks(def);

  // Shared tick instrumentation — XP grant per tick, wall time
  addExpFromAction(def, adjusted);
  activeLoopCategory.tickItemProgress(def.id, { timeSpent: dt });

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
  if (def.type === 'progress') {
    grantProgressXP(def);
  } else if (def.type === 'regular') {
    finishRegularCompletion(def);
  } else if (def.type === 'basic') {
    applyCompletionEffects(def);
  }

  // Refresh the current payload after side-effects (loopsLeft snapshot for
  // the wasLastLoop decision).
  const after = activeLoopCategory.currentItem;
  if (!after || after.defId !== def.id) return;
  const wasLastLoop = Math.max(0, after.payload.loopsLeft - 1) <= 0;

  activeLoopCategory.patchItemPayload(def.id, (p) => ({
    ...p,
    loopsLeft: Math.max(0, p.loopsLeft - 1),
  }));
  const goldSnapshot = getResourceValue('gold').toNumber();
  activeLoopCategory.setItemProgress(def.id, {
    ticks: 0,
    timeSpent: progressOf(after).timeSpent,
    manaUsed: progressOf(after).manaUsed + adjusted.toNumber(),
    goldRemaining: goldSnapshot,
  });
  activeLoopCategory.setItemError(def.id, null);
  addCompletedTicks(adjusted.toNumber());

  if (wasLastLoop) {
    if (shouldRepeatLast(def)) {
      activeLoopCategory.patchItemPayload(def.id, (p) => ({
        ...p,
        loops: p.loops + 1,
        loopsLeft: p.loopsLeft + 1,
      }));
      activeLoopCategory.sequencer.repeat();
    } else {
      activeLoopCategory.sequencer.complete();
    }
  }
}

/** Vanilla repeat-last gate. */
function shouldRepeatLast(def: ActionDef): boolean {
  const seq = activeLoopCategory.sequencer;
  if (!getRepeatLastAction().value) return false;
  if (seq.cursor !== seq.items.value.length - 1) return false;
  if (def.zoneId !== getCurrentZone()) return false;
  if (def.canStart && !def.canStart(buildLooperGameState())) return false;
  return true;
}

// ============================================================================
// Mana Budget Calculation
// ============================================================================

/**
 * Remaining mana needed for the active loop (current cursor to end).
 * Reference: idleLoops/actions.js adjustTicksNeeded
 */
export function calcTotalTicksNeeded(): Decimal {
  const items = activeLoopCategory.sequencer.items.value;
  const cursor = activeLoopCategory.sequencer.cursor;
  let total = Decimal.dZero;

  for (let i = cursor; i < items.length; i++) {
    const item = items[i];
    const def = activeLoopCategory.getDef(item.id);
    if (!def) continue;
    const adjusted = computeAdjustedTicks(def);
    total = Decimal.add(total, Decimal.mul(item.metadata.payload.loopsLeft, adjusted));
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
    const gameLoop = ctx.inject(TickDriverKey);
    _dispatcherTickRate = gameLoop.tickRate;
    loop = getLoop();

    const tuningRegistry = ctx.inject(LooperTuningRegistryKey);
    // Vanilla canonical: `1 + level / 100` cost-reduction shape on stat Level.
    // Reference: idleLoops/actions.js setAdjustedTicks.
    const costDivisorRef = tunable(tuningRegistry, 'balance/costDivisor', () => 100);
    setCostDivisorReader(() => costDivisorRef.value);

    activeLoopCategory = createActionCategory<ActionDef, void, ActionPayload>({
      id: 'actions/active',
      mode: 'list',
      registerTick: ctx.onTick,
      mapAction: (def) => ({
        signals: {
          unlock: computed(() => isActionVisible(def)),
          count: computed(() => bn(getTimesCompleted(def.id))),
        },
        canRun: (entry) => {
          if (entry.current?.payload.disabled) return 'never';
          if (def.zoneId !== getCurrentZone()) return 'never';
          if (def.canStart && !def.canStart(buildLooperGameState())) return 'never';
          return 'now';
        },
        tick: ({ dt }) => runDispatch(def, dt),
      }),
    });

    // Sibling per-def state must exist before any prereq evaluator or signals
    // computation reads `getTimesCompleted` (it walks all three sibling
    // categories' `getEntry(def.id)?.state`). Install siblings first, then
    // register into activeLoopCategory.
    for (const def of ACTIONS) {
      installBasicOne(def);
      installProgressOne(def);
      installRegularOne(def);
    }
    activeLoopCategory.register(ACTIONS);

    // Skip handler: when canRun returns 'never', the sequencer skips the item
    // and advances the cursor. Tag the prior (skipped) item with an error so
    // the UI surfaces "Cannot run here".
    activeLoopCategory.sequencer.on('skip', () => {
      const seq = activeLoopCategory.sequencer;
      const items = seq.items.value;
      const priorIdx = seq.cursor - 1;
      if (priorIdx < 0 || priorIdx >= items.length) return;
      const meta = items[priorIdx].metadata;
      if (meta.error) return;
      activeLoopCategory.setItemError(meta.defId, { message: 'Cannot run here' });
    });

    // Restart-flag detection — separate tick from the ActionCategory dispatcher,
    // which only fires when there's a current item. Exhaustion is "items exist
    // but cursor walked past the end."
    ctx.onTick(() => {
      if (!loop.running.value) return;
      if (activeLoopCategory.currentItem) return;
      if (isActiveQueueExhausted()) _restartFlag.value = true;
    });
  },
};
