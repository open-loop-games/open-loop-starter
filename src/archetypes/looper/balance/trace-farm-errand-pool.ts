/**
 * Per-loop trace — farm-errand-pool strategy under canonical content.
 *
 * One-off discovery script. Replays the strategy loop-by-loop and prints,
 * for each loop:
 *
 *   - the reconciled queue (what the planner emitted + reconciled into the
 *     queue at loop start)
 *   - LoopLog deltas (manaAdded, goldAccumulated, loopElapsed)
 *   - per-action timesCompleted deltas (especially `trade`, `run`, `slip`)
 *   - per-progressVar level (roam, acquaint, …) — gates trade visibility
 *   - per-regularVar checked / total / good / goodTemp (errand pool feeds
 *     gold-source candidates in the planner's unified harvest pass)
 *   - planner action-vector projections for `trade` + gold sources (visible /
 *     productive flags, projected goldPerCompletion × rewardRatio)
 *
 * Run: `pnpm exec vite-node src/archetypes/looper/balance/trace-farm-errand-pool.ts`
 */

import { runUntil, type Engine } from 'open-loop-engine';
import {
  ActionsKey,
  CapabilitiesKey,
  GoldKey,
  LoopKey,
  ManaAddedKey,
  ProgressVarsKey,
  QueueKey,
  RegularVarsKey,
} from '../modules';
import {
  buildLooperSimEngine,
  BalanceBotLoopLogKey,
  BalanceBotParamsKey,
  BalanceBotRecommendationKey,
} from './bot';
import { generatePlan, projectActionVectors, type PlannerParams } from './planner';

// ─── Strategy params (mirrors bot.ts FARM_ERRAND_POOL_PARAMS) ─────────────

const FARM_ERRAND_POOL_PARAMS: PlannerParams = {
  progressionTarget: { acquaint: 2, roam: 3, trail: 0, mark: 0 },
  manaUpOversupplyFactor: 1.0,
  progressionChunkTicks: 200,
  talentOverflowThreshold: 0,
};

const TRACE_LOOPS = 12;
const MAX_SIM_SEC = 60 * 60 * 3; // 3h ceiling — beat-6 lands at ~2h13m
const TICK_DELTA = 1;

// ─── Per-loop sample ─────────────────────────────────────────────────────

interface QueueRow {
  actionId: string;
  loops: number;
  adjustedTicks: number;
  totalCost: number;
}

interface LoopSample {
  loopNumber: number;
  loopElapsed: number;
  manaAdded: number;
  goldAccumulated: number;
  // queue at start of this loop (post-reconcile, pre-tick)
  plan: QueueRow[];
  // selected action timesCompleted DELTA over this loop
  timesCompletedDelta: Record<string, number>;
  // per-progressVar level at end-of-loop
  progressVarLevels: Record<string, number>;
  // per-regularVar pool state at end-of-loop
  regularVars: Record<string, { total: number; checked: number; good: number; goodTemp: number }>;
  // planner-vector view of trade + gold sources at start of loop
  vectorSnapshot: {
    tradeVisible: boolean;
    tradeAdjustedTicks: number;
    tradeExchangeMult: number;
    goldSources: Array<{
      id: string;
      visible: boolean;
      productive: boolean;
      poolCapacity: number;
      lifetimeChecked: number;
      knownGoodCount: number;
      goldPerReward: number; // rewardAmount per fired reward (not per completion)
      adjustedTicks: number;
    }>;
    plannerEmittedTrade: boolean; // generatePlan output contains a trade item
    projectedGoldFromPlan: number; // goldPerCompletion × rewardRatio × loops summed across goldSources in plan
    planDecomposition: {
      harvestCost: number; // cost of mana + gold (regular) items
      progressionCost: number; // cost of progress-type items
      trainerCost: number; // cost of expMult≥4 basic-type items
      tradeCost: number; // cost of trade item (basic with exchange-gold-to-mana)
      totalCost: number;
    };
    progressionVectors: Array<{
      pvId: string;
      pvAdjTicks: number; // current adjusted-ticks-to-complete one progress-action
      currentLevel: number;
      targetWeight: number; // from FARM_ERRAND_POOL_PARAMS.progressionTarget
    }>;
  };
  strategyId: string; // recommendation winner for this loop
}

// ─── Trace ────────────────────────────────────────────────────────────────

function snapshotQueue(engine: Engine): QueueRow[] {
  const queue = engine.tryInject(QueueKey)!;
  const actions = engine.tryInject(ActionsKey)!;
  const rows: QueueRow[] = [];
  for (const item of queue.items.value) {
    const state = actions.getState(item.id);
    const adjustedTicks = state ? Number(state.adjustedTicks.value) : 0;
    const loops = item.metadata?.loops ?? 0;
    rows.push({
      actionId: item.id,
      loops,
      adjustedTicks,
      totalCost: adjustedTicks * loops,
    });
  }
  return rows;
}

function snapshotTimesCompleted(engine: Engine): Record<string, number> {
  const actions = engine.tryInject(ActionsKey)!;
  const out: Record<string, number> = {};
  for (const def of actions.getAll()) {
    out[def.id] = actions.getTimesCompleted(def.id);
  }
  return out;
}

function snapshotProgressVarLevels(engine: Engine): Record<string, number> {
  const progressVars = engine.tryInject(ProgressVarsKey)!;
  const out: Record<string, number> = {};
  for (const entry of progressVars.getAll()) {
    out[entry.def.id] = Number(entry.state.level.level.value);
  }
  return out;
}

function snapshotRegularVars(
  engine: Engine,
): Record<string, { total: number; checked: number; good: number; goodTemp: number }> {
  const regularVars = engine.tryInject(RegularVarsKey)!;
  const out: Record<string, { total: number; checked: number; good: number; goodTemp: number }> =
    {};
  for (const s of regularVars.getAll()) {
    out[s.def.id] = {
      total: Number(s.total.value),
      checked: s.checked.value,
      good: s.good.value,
      goodTemp: s.goodTemp.value,
    };
  }
  return out;
}

function snapshotVectorView(engine: Engine, params: PlannerParams): LoopSample['vectorSnapshot'] {
  const vectors = projectActionVectors(engine);
  const byId = new Map(vectors.map((v) => [v.def.id, v]));
  const trade = byId.get('trade');
  const goldVectors = vectors.filter((v) => v.passSegment === 'gold' && v.def.type === 'regular');
  const plannedItems = generatePlan(engine, params);
  const plannerEmittedTrade = plannedItems.some((p) => p.actionId === 'trade');

  let projectedGoldFromPlan = 0;
  for (const item of plannedItems) {
    const v = byId.get(item.actionId);
    if (!v || v.def.type !== 'regular' || v.passSegment !== 'gold') continue;
    projectedGoldFromPlan += v.goldPerCompletion * item.loops;
  }

  const tradeAdjustedTicks = trade?.adjustedTicks ?? 0;
  const tradeExchangeMult = Number(trade?.def.type === 'basic' ? (trade.def.exchangeMult ?? 0) : 0);

  // ── Plan-cost decomposition ──
  let harvestCost = 0;
  let progressionCost = 0;
  let trainerCost = 0;
  let tradeCost = 0;
  for (const item of plannedItems) {
    const v = byId.get(item.actionId);
    if (!v) continue;
    const cost = v.adjustedTicks * item.loops;
    if (v.def.type === 'progress') {
      progressionCost += cost;
    } else if (v.passSegment === 'trade') {
      tradeCost += cost;
    } else if (
      v.def.type === 'basic' &&
      v.passSegment === 'capability' &&
      Number(v.def.expMult) >= 4
    ) {
      trainerCost += cost;
    } else {
      harvestCost += cost;
    }
  }
  const totalCost = harvestCost + progressionCost + trainerCost + tradeCost;

  // Per-progressVar projection — pvAdjTicks is the cost of one progress-action
  // completion. Used downstream to compute candidate chunk sizes.
  const progressionVectors = vectors
    .filter((v) => v.def.type === 'progress' && v.visible)
    .map((v) => {
      const pvId = v.def.type === 'progress' ? v.def.progressVarId : '';
      return {
        pvId,
        pvAdjTicks: v.adjustedTicks,
        currentLevel: 0, // filled at sample-time when ProgressVarsKey is read
        targetWeight: params.progressionTarget[pvId] ?? 1,
      };
    });

  return {
    tradeVisible: trade?.visible ?? false,
    tradeAdjustedTicks,
    tradeExchangeMult,
    goldSources: goldVectors.map((v) => ({
      id: v.def.id,
      visible: v.visible,
      productive: v.productive,
      poolCapacity: v.poolCapacity,
      lifetimeChecked: v.lifetimeChecked,
      knownGoodCount: v.knownGoodCount,
      goldPerReward: v.goldPerCompletion * v.rewardRatio,
      adjustedTicks: v.adjustedTicks,
    })),
    plannerEmittedTrade,
    projectedGoldFromPlan,
    planDecomposition: { harvestCost, progressionCost, trainerCost, tradeCost, totalCost },
    progressionVectors,
  };
}

function diffTimesCompleted(
  pre: Record<string, number>,
  post: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of Object.keys(post)) {
    const d = post[id]! - (pre[id] ?? 0);
    if (d !== 0) out[id] = d;
  }
  return out;
}

// ─── Reporter ────────────────────────────────────────────────────────────

function fmtTime(sec: number): string {
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m${String(s).padStart(2, '0')}s`;
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

function reportLoop(s: LoopSample): void {
  console.log(
    `## Loop ${s.loopNumber} — strategy=${s.strategyId} elapsed=${fmtTime(s.loopElapsed)} manaAdded=${s.manaAdded.toFixed(1)} goldAccumulated=${s.goldAccumulated.toFixed(1)}\n`,
  );

  // Reconciled queue (what executed)
  console.log('Reconciled queue:');
  if (s.plan.length === 0) {
    console.log('  (empty)\n');
  } else {
    console.log(
      renderTable(
        ['#', 'actionId', 'loops', 'adjTicks', 'totalCost'],
        s.plan.map((r, i) => [
          String(i),
          r.actionId,
          String(r.loops),
          String(r.adjustedTicks),
          String(r.totalCost),
        ]),
      ),
    );
    const totalCost = s.plan.reduce((a, r) => a + r.totalCost, 0);
    console.log(`  Σ totalCost = ${totalCost}`);
    console.log();
  }

  // timesCompleted deltas
  const tcKeys = Object.keys(s.timesCompletedDelta).sort();
  if (tcKeys.length > 0) {
    console.log(
      'timesCompleted deltas: ' + tcKeys.map((k) => `${k}=${s.timesCompletedDelta[k]}`).join(', '),
    );
  } else {
    console.log('timesCompleted deltas: (none)');
  }

  // progressVar levels
  console.log(
    'progressVar levels: ' +
      Object.entries(s.progressVarLevels)
        .map(([id, lvl]) => `${id}=${lvl}`)
        .join(', '),
  );

  // regularVar state — only show non-zero pools to keep output tight
  const rvNonZero = Object.entries(s.regularVars).filter(([, v]) => v.total > 0 || v.checked > 0);
  if (rvNonZero.length > 0) {
    console.log(
      'regularVars: ' +
        rvNonZero
          .map(
            ([id, v]) =>
              `${id}{total=${v.total},checked=${v.checked},good=${v.good},goodTemp=${v.goodTemp}}`,
          )
          .join(', '),
    );
  }

  // Vector view — trade visibility + gold-source projection
  console.log(
    `vectors: trade.visible=${s.vectorSnapshot.tradeVisible} trade.adjTicks=${s.vectorSnapshot.tradeAdjustedTicks} plannerEmittedTrade=${s.vectorSnapshot.plannerEmittedTrade} projectedGoldFromPlan=${s.vectorSnapshot.projectedGoldFromPlan.toFixed(2)}`,
  );
  for (const gs of s.vectorSnapshot.goldSources) {
    console.log(
      `  gold-source ${gs.id}: visible=${gs.visible} productive=${gs.productive} poolCapacity=${gs.poolCapacity} lifetimeChecked=${gs.lifetimeChecked} knownGood=${gs.knownGoodCount} goldPerReward=${gs.goldPerReward} adjTicks=${gs.adjustedTicks}`,
    );
  }

  // Plan-cost decomposition + per-progressVar chunk view.
  const v = s.vectorSnapshot;
  const initialMana = 250;
  const oversupply = 1.0;
  const budgetCap = initialMana * oversupply + s.manaAdded;
  const decomp = v.planDecomposition;
  console.log(
    `  budget: initialMana×${oversupply}=${initialMana * oversupply} + manaAdded=${s.manaAdded.toFixed(1)} → cap=${budgetCap.toFixed(1)} | decomp: harvest=${decomp.harvestCost} progression=${decomp.progressionCost} trainer=${decomp.trainerCost} trade=${decomp.tradeCost} (Σ=${decomp.totalCost})`,
  );
  for (const pv of v.progressionVectors) {
    if (pv.targetWeight <= 0) continue;
    const loopsPerChunk = Math.floor(200 / pv.pvAdjTicks);
    console.log(
      `  pv-chunk ${pv.pvId} (target=${pv.targetWeight}, pvAdjTicks=${pv.pvAdjTicks}): loopsPerChunk=${loopsPerChunk}`,
    );
  }

  console.log();
}

// ─── Main ────────────────────────────────────────────────────────────────

function main(): void {
  const t0 = Date.now();
  console.log('# Looper farm-errand-pool per-loop trace\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log(`Strategy: farm-errand-pool (override seeded at engine build)`);
  console.log(`Trace loops: ${TRACE_LOOPS} (or until ${fmtTime(MAX_SIM_SEC)} cap)`);
  console.log(`tickDelta: ${TICK_DELTA}s\n`);
  console.log(
    `Params: progressionTarget=${JSON.stringify(FARM_ERRAND_POOL_PARAMS.progressionTarget)} ` +
      `progressionChunkTicks=${FARM_ERRAND_POOL_PARAMS.progressionChunkTicks} ` +
      `oversupply=${FARM_ERRAND_POOL_PARAMS.manaUpOversupplyFactor}\n`,
  );

  const engine = buildLooperSimEngine(undefined, {
    plannerParamsOverride: FARM_ERRAND_POOL_PARAMS,
  });

  // Force the farm-errand-pool strategy to win every loop. Without this, the
  // recommendation system would arbitrate between farm-mana-pool (loops 1-4)
  // and farm-errand-pool (loops 5-9) per the canonical phase windows. We
  // want a clean trace under farm-errand-pool's params from loop 1, so we
  // disable autoApply and write the params manually each restart.
  const rec = engine.tryInject(BalanceBotRecommendationKey)!;
  rec.autoApply.value = false;
  const paramsHandle = engine.tryInject(BalanceBotParamsKey)!;
  paramsHandle.write(FARM_ERRAND_POOL_PARAMS);

  const loop = engine.tryInject(LoopKey)!;
  const manaAdded = engine.tryInject(ManaAddedKey)!;
  const gold = engine.tryInject(GoldKey)!;
  const loopLog = engine.tryInject(BalanceBotLoopLogKey)!;
  // Touch capabilities to surface a missing-dep error early.
  engine.tryInject(CapabilitiesKey)!;

  const samples: LoopSample[] = [];
  let pendingPlan: QueueRow[] = snapshotQueue(engine);
  let pendingVectorSnapshot = snapshotVectorView(engine, FARM_ERRAND_POOL_PARAMS);
  let preTimesCompleted = snapshotTimesCompleted(engine);

  // beforeRestart fires at end-of-loop, before the loop counter advances.
  // We use it to capture per-loop deltas for the loop that just finished.
  loop.on('beforeRestart', () => {
    const post = snapshotTimesCompleted(engine);
    const tcDelta = diffTimesCompleted(preTimesCompleted, post);
    const lastEntry = loopLog.history.value[loopLog.history.value.length - 1];
    // LoopLog finalize fires from beforeRestart too — emitter ordering is
    // registration-order. The bot's loopLog was created in install() before
    // we attached here, so loopLog.history already has this loop's entry.
    const manaAddedDelta = lastEntry?.deltas.find((d) => d.key === 'manaAdded');
    const goldDelta = lastEntry?.deltas.find((d) => d.key === 'goldAccumulated');
    const loopElapsedDelta = lastEntry?.deltas.find((d) => d.key === 'loopElapsed');
    samples.push({
      loopNumber: lastEntry?.loopNumber ?? loop.count.value,
      loopElapsed: Number(loopElapsedDelta?.delta ?? 0),
      manaAdded: Number(manaAddedDelta?.delta ?? 0),
      goldAccumulated: Number(goldDelta?.delta ?? 0),
      plan: pendingPlan,
      timesCompletedDelta: tcDelta,
      progressVarLevels: snapshotProgressVarLevels(engine),
      regularVars: snapshotRegularVars(engine),
      vectorSnapshot: pendingVectorSnapshot,
      strategyId: 'farm-errand-pool',
    });
    preTimesCompleted = post;
  });

  // afterRestart fires after the bot's applyPlan has reconciled the queue
  // for the *next* loop. Snapshot the planned queue + vector projection then.
  loop.on('afterRestart', () => {
    // Re-pin params each loop in case anything tries to overwrite via
    // recommendation. (autoApply is off, but defense in depth.)
    paramsHandle.write(FARM_ERRAND_POOL_PARAMS);
    pendingPlan = snapshotQueue(engine);
    pendingVectorSnapshot = snapshotVectorView(engine, FARM_ERRAND_POOL_PARAMS);
  });

  const result = runUntil({
    engine,
    until: () => loop.count.value >= TRACE_LOOPS,
    maxSimTime: MAX_SIM_SEC,
    tickDelta: TICK_DELTA,
  });

  for (const s of samples) reportLoop(s);

  // ─── Summary ────────────────────────────────────────────────────────────
  console.log('## Summary\n');
  const tradeCompleted = samples.reduce((a, s) => a + (s.timesCompletedDelta.trade ?? 0), 0);
  console.log(`Loops sampled: ${samples.length}`);
  console.log(`Total trade completions: ${tradeCompleted}`);
  console.log(
    `Final state: mana=${Number(manaAdded.value).toFixed(1)} gold=${Number(gold.value).toFixed(1)} loop.count=${loop.count.value}`,
  );
  console.log(
    `runUntil terminated: ${result.terminated} after ${fmtTime(result.elapsedSimulated)}`,
  );

  // First loop where roam ≥ 3 (trade visibility threshold)
  const tradeVisibleAt = samples.findIndex((s) => (s.progressVarLevels.roam ?? 0) >= 3);
  if (tradeVisibleAt >= 0) {
    console.log(
      `Trade visibility (roam ≥ 3) first reached at loop ${samples[tradeVisibleAt]!.loopNumber}.`,
    );
  } else {
    console.log(`Trade never reached visibility (roam ≥ 3) within ${samples.length} loops.`);
  }

  // First loop the planner emitted a trade item
  const plannerEmittedAt = samples.findIndex((s) => s.vectorSnapshot.plannerEmittedTrade);
  if (plannerEmittedAt >= 0) {
    console.log(
      `Planner first emitted a trade item at loop ${samples[plannerEmittedAt]!.loopNumber}.`,
    );
  } else {
    console.log(`Planner never emitted a trade item within ${samples.length} loops.`);
  }

  console.log(`\n(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
