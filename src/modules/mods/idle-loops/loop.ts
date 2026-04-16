/**
 * Idle-loops mod — loop lifecycle, BestOf with captureStrategy,
 * and RecommendationSystem wiring.
 *
 * Forked from src/modules/mods/loop.ts, stripped of GatheringKey/EconomyKey
 * dependencies. All domain state comes in via the factory options.
 */
import {
  Decimal,
  createResource,
  createLoop,
  createLoopLog,
  createBestOf,
  createRecommendationSystem,
  type Resource,
  type DecimalSource,
  type State,
  type Loop,
  type LoopLog,
  type BestOf,
  type RecommendationSystem,
  type Sequencer,
  type SkillCategory,
  type TimedProgress,
} from 'open-loop-engine';
import type { StatDef } from './content';

// ============================================================================
// Types
// ============================================================================

export interface IdleLoopsLoopState {
  mana: Resource<DecimalSource>;
  maxMana: Decimal;
  loop: Loop;
  loopLog: LoopLog;
  bestOf: BestOf;
  recommendations: RecommendationSystem;
}

export interface CreateLoopOptions {
  stats: SkillCategory<StatDef>;
  queue: Sequencer;
  progress: TimedProgress;
  /** Returns mana cost rate for the currently active action (mana/sec). */
  currentManaCostRate: () => number;
  registerTick: (callback: (dt: number) => void) => () => void;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_MANA = new Decimal(100);
const BASE_MANA_DRAIN_PER_SEC = 2;

// ============================================================================
// Factory
// ============================================================================

export function createIdleLoopsLoop(opts: CreateLoopOptions): IdleLoopsLoopState {
  const { stats, queue, progress, currentManaCostRate, registerTick } = opts;

  const mana = createResource<DecimalSource>(MAX_MANA, { displayName: 'Mana' });

  // Collect all accumulator skills for retention
  const allSkills = stats.getAll().map((e) => e.skill);
  const permanentBonuses = allSkills
    .filter((s) => s.permanentBonus != null)
    .map((s) => s.permanentBonus!);

  // --- Loop ---
  const loop = createLoop({
    id: 'il-loop',
    endCondition: () => Decimal.lte(mana.value, 0),
    resetModules: [],
    keep: permanentBonuses,
    thingsToReset: [mana],
    onBeforeRestart() {
      // Accumulate permanent stat bonuses before reset
      for (const skill of allSkills) {
        if (skill.accumulateBonus) skill.accumulateBonus();
      }
    },
    onRestart() {
      mana.value = MAX_MANA;
      // Reset stat XP (thingsToReset handles mana; XP lives inside
      // skill persistent contexts which resetModules:[] won't reach,
      // so we reset manually)
      for (const skill of allSkills) {
        skill.xp.value = 0;
      }
      queue.resetCursor();
      progress.reset();
    },
    registerTick,
  });

  // --- Mana drain tick ---
  registerTick((dt: number) => {
    if (!loop.running.value) return;
    // Base drain reduced by Con level, plus action-specific cost
    const conSkill = stats.getSkill('con');
    const conReduction = conSkill
      ? new Decimal(conSkill.level.value).toNumber() * 0.05
      : 0;
    const baseDrain = Math.max(0.5, BASE_MANA_DRAIN_PER_SEC - conReduction);
    const actionCost = currentManaCostRate();
    const totalDrain = (baseDrain + actionCost) * dt;
    mana.value = Decimal.max(Decimal.sub(mana.value, totalDrain), 0);
  });

  // --- LoopLog ---
  const loopLog = createLoopLog({
    loop,
    metrics: {
      'str-xp': () => stats.getSkill('str')!.xp.value,
      'int-xp': () => stats.getSkill('int')!.xp.value,
      'dex-xp': () => stats.getSkill('dex')!.xp.value,
      'con-xp': () => stats.getSkill('con')!.xp.value,
    },
    maxLogs: 10,
  });

  // --- BestOf with captureStrategy ---
  // Metric keys must match LoopLog keys for auto-submission via finalize.
  // Snapshots the sequencer's action list when a new best is recorded.
  const bestOf = createBestOf({
    id: 'il-best',
    metrics: {
      'str-xp': { mode: 'absolute' },
      'int-xp': { mode: 'absolute' },
      'dex-xp': { mode: 'absolute' },
      'con-xp': { mode: 'absolute' },
    },
    loopLog,
    captureStrategy: () => queue.items.value.map((item) => ({ id: item.id })),
  });

  // --- RecommendationSystem (wiring only, no strategies) ---
  const recommendations = createRecommendationSystem({
    id: 'il-advisor',
    loop,
    loopLog,
    bestOf,
    getCurrentSnapshot: () => ({
      queue: queue.items.value.map((item) => ({ id: item.id })),
    }),
    applySnapshot: (snap: State) => {
      const obj = snap as { queue?: Array<{ id: string }> } | undefined;
      const items = obj?.queue;
      if (!Array.isArray(items)) return;
      queue.clear();
      for (const item of items) {
        queue.enqueue({ id: item.id, metadata: undefined });
      }
    },
    strategies: [],
  });

  loop.run();

  return { mana, maxMana: MAX_MANA, loop, loopLog, bestOf, recommendations };
}
