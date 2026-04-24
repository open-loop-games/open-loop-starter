/**
 * OL-673 — profile `eventDrivenProbe` wall time on Producer never-fires legs.
 *
 * Targeted bench, not part of the solver. Compares `runProbe` against an
 * instrumented event-stepping loop (lifted from `harness/probe/event.ts`)
 * so we can count advances, refuses, min/max advance distance, and
 * decompose wall time into walker-snapshot vs simulateTick components.
 *
 * Scenarios cover the bisection endpoints the solver actually calls —
 * each is a bracket where beat predicate never fires inside the budget,
 * so runProbe ticks all ~30000 seconds and eventDriven should skip most
 * of it. If it doesn't, the per-phase numbers tell us why.
 */

import {
  advanceToNextEvent,
  buildTransitionSnapshot,
  runProbe,
  seedRNG,
  type Engine,
  type GameStateAccessor,
} from 'open-loop-engine';
import { ARC_BEATS } from './beats';
import { buildProducerAccessor, buildProducerSimEngine } from './bot';
import type { ProducerOverrides } from '..';

const BUDGET_SEC = 200 * 60 * 2.5;

interface Scenario {
  label: string;
  beatId: string;
  overrides: ProducerOverrides;
}

// Each is a bisection-endpoint case the solver exercises. All chosen to
// push the beat past the budget so we measure the never-fires regime
// where the 50–1000× speedup is supposed to live.
const SCENARIOS: Scenario[] = [
  {
    label: 'b2 — cursor unreachable (cost=400 > click-taper cap of 48)',
    beatId: 'beat-2',
    overrides: { producers: [{ id: 'cursor', purchase: { baseCost: 400, costScaling: 1.15 } }] },
  },
  {
    label: 'b3 — grandma unreachable (cost=5000, cursor cost default)',
    beatId: 'beat-3',
    overrides: { producers: [{ id: 'grandma', purchase: { baseCost: 5000, costScaling: 1.15 } }] },
  },
  {
    label: 'b7 — milestoneBonusPerTier=1.1 pushes compound ramp past budget',
    beatId: 'beat-7',
    overrides: { balance: { milestoneBonusPerTier: 1.1 } },
  },
];

interface EventStats {
  advances: number;
  zeroTies: number;
  refusesOpaque: number;
  refusesNoFinite: number;
  fastTicks: number;
  stasisRebuilds: number;
  totalAdvanceSec: number;
  minAdvanceSec: number;
  maxAdvanceSec: number;
  walkerMs: number;
  tickMs: number;
  simTimeReached: number;
  terminated: 'predicate' | 'maxSimTime';
}

const STASIS_PROBE_INTERVAL = 100;

function isNoFiniteTransition(snapshot: ReturnType<typeof buildTransitionSnapshot>): boolean {
  for (const t of snapshot.all) {
    if (t.distance.reason === 'opaque-predicate') return false;
    if (t.distance.seconds !== null) return false;
  }
  return true;
}

function instrumentedEventLoop(
  engine: Engine,
  accessor: GameStateAccessor,
  predicate: (engine: Engine) => boolean,
  maxSimTime: number,
  tickDelta: number,
): EventStats {
  const stats: EventStats = {
    advances: 0,
    zeroTies: 0,
    refusesOpaque: 0,
    refusesNoFinite: 0,
    fastTicks: 0,
    stasisRebuilds: 0,
    totalAdvanceSec: 0,
    minAdvanceSec: Infinity,
    maxAdvanceSec: 0,
    walkerMs: 0,
    tickMs: 0,
    simTimeReached: 0,
    terminated: 'maxSimTime',
  };

  let simTime = 0;
  while (true) {
    if (predicate(engine)) {
      stats.terminated = 'predicate';
      break;
    }
    if (simTime >= maxSimTime) break;

    const t0 = performance.now();
    const snapshot = buildTransitionSnapshot(engine, accessor);
    stats.walkerMs += performance.now() - t0;

    const t1 = performance.now();
    const result = advanceToNextEvent(engine, snapshot);

    if ('fired' in result && result.advanced > 0) {
      const advanced = result.advanced;
      stats.tickMs += performance.now() - t1;
      stats.advances++;
      stats.totalAdvanceSec += advanced;
      if (advanced < stats.minAdvanceSec) stats.minAdvanceSec = advanced;
      if (advanced > stats.maxAdvanceSec) stats.maxAdvanceSec = advanced;
      simTime += advanced;
    } else if ('reason' in result && result.reason === 'no-finite-transition') {
      // Stasis fast-tick (OL-675). Mirror `eventDrivenProbe`: tick at
      // `tickDelta` without rebuilding the walker each iteration; rebuild
      // every STASIS_PROBE_INTERVAL ticks to detect exit-from-stasis.
      stats.refusesNoFinite++;
      while (simTime < maxSimTime) {
        const remaining = maxSimTime - simTime;
        const dt = Math.min(tickDelta, remaining);
        if (dt <= 0) break;
        const tTick = performance.now();
        engine.loop.simulateTick(dt);
        stats.tickMs += performance.now() - tTick;
        simTime += dt;
        stats.fastTicks++;
        if (predicate(engine)) {
          stats.terminated = 'predicate';
          break;
        }
        if (stats.fastTicks % STASIS_PROBE_INTERVAL === 0) {
          const w1 = performance.now();
          const probeSnap = buildTransitionSnapshot(engine, accessor);
          stats.walkerMs += performance.now() - w1;
          stats.stasisRebuilds++;
          if (!isNoFiniteTransition(probeSnap)) break;
        }
      }
      if (stats.terminated === 'predicate') break;
      if (simTime >= maxSimTime) break;
      continue;
    } else if ('reason' in result && result.reason === 'opaque-present') {
      stats.refusesOpaque++;
      const remaining = maxSimTime - simTime;
      const dt = Math.min(tickDelta, remaining);
      if (dt <= 0) break;
      engine.loop.simulateTick(dt);
      stats.tickMs += performance.now() - t1;
      simTime += dt;
    } else {
      // Zero-distance tie: `{ advanced: 0, fired: [...] }`. OL-676 territory.
      stats.zeroTies++;
      const remaining = maxSimTime - simTime;
      const dt = Math.min(tickDelta, remaining);
      if (dt <= 0) break;
      engine.loop.simulateTick(dt);
      stats.tickMs += performance.now() - t1;
      simTime += dt;
    }
  }

  stats.simTimeReached = simTime;
  return stats;
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtSimSec(s: number): string {
  if (!isFinite(s)) return '∞';
  if (s < 60) return `${s.toFixed(1)}s`;
  if (s < 3600) return `${(s / 60).toFixed(1)}m`;
  return `${(s / 3600).toFixed(2)}h`;
}

function runOne(scenario: Scenario): void {
  const beat = ARC_BEATS.find((b) => b.id === scenario.beatId)!;
  console.log(`\n## ${scenario.label}`);
  console.log(`   beat: ${scenario.beatId} — predicate-fire condition`);

  // runProbe baseline
  const t0 = performance.now();
  seedRNG(0);
  const baseRes = runProbe({
    seeds: [0],
    beats: [{ id: beat.id, predicate: beat.predicate }],
    buildEngine: () => buildProducerSimEngine(scenario.overrides),
    maxSimTime: BUDGET_SEC,
    tickDelta: 1,
  });
  const baseMs = performance.now() - t0;
  const baseCounts = baseRes[0]!.counts;
  const baseFire = baseRes[0]!.terminationTime?.p50 ?? Infinity;

  console.log(
    `   runProbe       : ${fmtMs(baseMs)} wall, fired=${baseCounts.predicate}/1, ` +
      `sim-reached=${fmtSimSec(isFinite(baseFire) ? baseFire : BUDGET_SEC)}`,
  );

  // eventDrivenProbe (instrumented, inlined)
  const t1 = performance.now();
  seedRNG(0);
  const engine = buildProducerSimEngine(scenario.overrides, { maxDeltaTime: BUDGET_SEC });
  const accessor = buildProducerAccessor(engine);
  const buildMs = performance.now() - t1;
  const t2 = performance.now();
  const stats = instrumentedEventLoop(engine, accessor, beat.predicate, BUDGET_SEC, 1);
  const evLoopMs = performance.now() - t2;
  const evTotalMs = evLoopMs + buildMs;

  const avgAdvance = stats.advances > 0 ? stats.totalAdvanceSec / stats.advances : 0;

  console.log(
    `   eventDriven    : ${fmtMs(evTotalMs)} wall (build=${fmtMs(buildMs)} + loop=${fmtMs(evLoopMs)})`,
  );
  console.log(
    `     advances=${stats.advances}, ties=${stats.zeroTies}, ` +
      `refuses=(opaque=${stats.refusesOpaque} noFinite=${stats.refusesNoFinite}), ` +
      `fastTicks=${stats.fastTicks} (stasisRebuilds=${stats.stasisRebuilds})`,
  );
  console.log(
    `     advance dist: avg=${fmtSimSec(avgAdvance)}, min=${fmtSimSec(stats.minAdvanceSec)}, max=${fmtSimSec(stats.maxAdvanceSec)}`,
  );
  console.log(
    `     walker=${fmtMs(stats.walkerMs)} (${((stats.walkerMs / evLoopMs) * 100).toFixed(0)}%), ` +
      `simulateTick=${fmtMs(stats.tickMs)} (${((stats.tickMs / evLoopMs) * 100).toFixed(0)}%)`,
  );
  console.log(
    `     sim-reached=${fmtSimSec(stats.simTimeReached)}, terminated=${stats.terminated}`,
  );
  console.log(
    `   ratio eventDriven/runProbe = ${(evTotalMs / baseMs).toFixed(2)}× ` +
      `(target: ≤0.1× = 10× speedup; ≤0.01× = 100× speedup)`,
  );
}

function main(): void {
  console.log('# OL-673 — eventDrivenProbe wall-time bench on Producer never-fires legs');
  console.log(
    `# maxSimTime budget: ${fmtSimSec(BUDGET_SEC)} (~${Math.round(BUDGET_SEC)} ticks at 1Hz)\n`,
  );
  for (const s of SCENARIOS) {
    runOne(s);
  }
}

main();
