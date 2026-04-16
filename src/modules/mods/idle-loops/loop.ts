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
  createBestReplayStrategy,
  type Resource,
  type DecimalSource,
  type State,
  type Loop,
  type LoopLog,
  type BestOf,
  type RecommendationSystem,
  type RecommendationStrategyDef,
  type Sequencer,
  type SkillCategory,
  type TimedProgress,
} from 'open-loop-engine';
import type { StatDef } from './content';
import { createMutateBestStrategy, type MutateBestHandle } from './workbench/mutate-best-strategy';

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
  /** Handle for the MutateBest strategy — call setSensitivity() to install the Tier 3b scratch-engine config. */
  mutateBest: MutateBestHandle;
}

export interface CreateLoopOptions {
  stats: SkillCategory<StatDef>;
  queue: Sequencer;
  progress: TimedProgress;
  /** Returns mana cost rate for the currently active action (mana/sec). */
  currentManaCostRate: () => number;
  registerTick: (callback: (dt: number) => void) => () => void;
  /** Number of earned achievements, used to gate recommendation tiers. */
  earnedCount: () => number;
  /** All action IDs eligible for MutateBest insertion mutations. */
  actionPool: () => string[];
  /** Player-selected goal metric for the Tier 4 GoalStrategy. */
  selectedGoalMetric: () => string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Wrap a strategy's canApply with an additional predicate (AND semantics). */
function gateStrategy(
  inner: RecommendationStrategyDef,
  gate: () => boolean,
): RecommendationStrategyDef {
  return {
    id: inner.id,
    canApply: (ctx) => gate() && inner.canApply(ctx),
    score: inner.score,
    recommend: inner.recommend,
  };
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
  const {
    stats,
    queue,
    progress,
    currentManaCostRate,
    registerTick,
    earnedCount,
    actionPool,
    selectedGoalMetric,
  } = opts;

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

  // --- RecommendationSystem ---
  // Tier 1: BestReplay advisory (gated on earnedCount >= 1). Replays the
  // best-known str-xp queue when the player has earned at least one achievement.
  const bestReplayStrategy = gateStrategy(
    createBestReplayStrategy('str-xp', { id: 'il-best-replay' }),
    () => earnedCount() >= 1,
  );

  // Tier 3a: MutateBest blind (gated on earnedCount >= 5). Proposes random
  // queue mutations and evaluates them over a two-loop cadence. Scores
  // higher than BestReplay so it wins arbitration once applicable.
  //
  // Tier 3b: once earnedCount >= 6 and a sensitivity config has been
  // installed via mutateBest.setSensitivity(...), the strategy upgrades
  // to scratch-engine-scored variant selection.
  const mutateBest = createMutateBestStrategy({
    metricKey: 'str-xp',
    earnedCount,
    actionPool,
    threshold: 5,
  });

  // Tier 4: GoalStrategy with a player-selectable metric. Hand-rolled (not
  // createGoalStrategy) because the built-in freezes `metric` at
  // construction, and we want the player's dropdown pick to take effect
  // without re-registering. Reads selectedGoalMetric on every call.
  const goalStrategy: RecommendationStrategyDef = {
    id: 'il-goal',
    canApply: (ctx) => {
      if (earnedCount() < 8) return false;
      const entry = ctx.bestOf.entries.value[selectedGoalMetric()];
      return entry != null && entry.status === 'valid' && entry.strategySnapshot != null;
    },
    score: (ctx) => {
      const entry = ctx.bestOf.entries.value[selectedGoalMetric()];
      if (!entry) return 0;
      const ps = new Decimal(entry.perSecond).toNumber();
      // +2 to edge out MutateBest's +1 — Tier 4 is the highest active tier.
      const base = Number.isFinite(ps) ? ps : new Decimal(entry.value).toNumber();
      return base + 2;
    },
    recommend: (ctx) => {
      const metric = selectedGoalMetric();
      const entry = ctx.bestOf.entries.value[metric]!;
      const history = ctx.loopLog.history.value;
      const lastEntry = history.length > 0 ? history[history.length - 1]! : null;
      const lastDelta = lastEntry?.deltas.find((d) => d.key === metric);
      const current = lastDelta?.delta ?? new Decimal(0);
      const projected = entry.projected ?? entry.value;
      return {
        snapshot: entry.strategySnapshot!,
        rationale: {
          strategyId: 'il-goal',
          metrics: {
            [metric]: {
              current,
              projected,
              delta: Decimal.sub(projected, current),
            },
          },
          summary: `Goal (${metric}): replay best run (${entry.value} in ${entry.elapsed.toFixed(1)}s, loop #${entry.loopNumber})`,
        },
      };
    },
  };

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
    strategies: [bestReplayStrategy, mutateBest.strategy, goalStrategy],
  });

  // Tier 2: Optimizer. Once earnedCount reaches 3, flip autoApply so the
  // recommendation produced on afterRestart is applied to the queue
  // immediately. Set on beforeRestart so the flag is live before the
  // recommendation system's own afterRestart handler runs evaluate().
  loop.on('beforeRestart', () => {
    recommendations.autoApply.value = earnedCount() >= 3;
  });

  loop.run();

  return { mana, maxMana: MAX_MANA, loop, loopLog, bestOf, recommendations, mutateBest };
}
