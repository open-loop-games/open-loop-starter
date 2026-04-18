/**
 * BalanceWorkbench hooks for creep-vs-creep (OL-529).
 *
 * Three bits of creep-specific glue the workbench composable takes via its
 * `prepare` / `tick` / `analyzerPack` options:
 *
 * 1. **Prepare** seeds each per-run engine with the harness `ctx.seed` by
 *    round-resetting: `endRound()` → assign seed → `startNextRound()`. That
 *    regenerates the symmetric map with a shuffled spawn-corner assignment
 *    for this seed, so per-seed trajectories actually diverge. Runs on BOTH
 *    baseline and variant cells — if only the variant got the seed, the
 *    delta would conflate perturbation effects with seed differences.
 *
 * 2. **Tick** short-circuits once the round ends. Without this, the engine
 *    keeps stepping, `round.onEngineTick` runs the 30-second countdown to
 *    completion, and `startNextRound` fires mid-measurement — wiping the
 *    grid state the analyzer is about to sample. Freezing on `phase ===
 *    'ended'` holds the end-state for the analyzer to read.
 *
 * 3. **Analyzer pack** layers a `creep-outcome` analyzer on top of
 *    `defaultAnalyzerPack`. Default pack gives resource peaks (essence,
 *    meta-currency) for free; creep-outcome emits per-faction
 *    `territoryShare` + a `win.{faction}` 0/1 flag at finalize so the
 *    aggregator's `avg` across seeds reads directly as a win-rate. The
 *    harness aggregator filters non-numeric metric values (see
 *    `aggregate.ts:34`), which is why `win.{f}` is a number, not a boolean.
 *
 * Framing caveat: "win" here means "leader by territory at finalize" — the
 * default 200-tick budget at 20 Hz = 10 s of sim, nowhere near round
 * termination at 300 s. Calling it a win-rate distribution is slightly
 * aspirational for short runs; for real termination-based distributions the
 * user cranks `ticks` high enough that `round.isTerminated` fires.
 */

import {
  defaultAnalyzerPack,
  type Analyzer,
  type AnalyzerResult,
  type Engine,
  type RunContext,
} from 'open-loop-engine';
import { CreepWarfareKey } from './index';
import { FACTION_IDS, MAP_HEIGHT, MAP_WIDTH, type FactionId } from './content';

const TOTAL_CELLS = MAP_WIDTH * MAP_HEIGHT;

export function creepWorkbenchPrepare(engine: Engine, ctx: RunContext): void {
  const state = engine.tryInject(CreepWarfareKey);
  if (!state) return;
  // endRound is a no-op when phase is already 'ended', startNextRound is a
  // no-op when phase is 'active' — so this works from either starting state.
  state.round.endRound();
  state.round.seed.value = ctx.seed;
  state.round.startNextRound();
}

export function creepWorkbenchTick(engine: Engine, _dt: number): void {
  const state = engine.tryInject(CreepWarfareKey);
  if (state && state.round.phase.value === 'ended') return;
  engine.loop.stepOnce();
}

function countOwnership(engine: Engine): Record<FactionId, number> {
  const state = engine.tryInject(CreepWarfareKey)!;
  const counts = { red: 0, blue: 0, green: 0, yellow: 0 } as Record<FactionId, number>;
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const o = state.grid.grid.at(x, y).owner;
      if (o !== null) counts[o]++;
    }
  }
  return counts;
}

export function createCreepOutcomeAnalyzer(engine: Engine): Analyzer {
  const name = 'creep-outcome';
  return {
    name,
    summarize(): AnalyzerResult {
      const counts = countOwnership(engine);
      let leader: FactionId = FACTION_IDS[0];
      for (const f of FACTION_IDS) {
        if (counts[f] > counts[leader]) leader = f;
      }
      const metrics: Record<string, number> = {};
      for (const f of FACTION_IDS) {
        metrics[`territoryShare.${f}`] = counts[f] / TOTAL_CELLS;
        metrics[`win.${f}`] = f === leader ? 1 : 0;
      }
      const state = engine.tryInject(CreepWarfareKey);
      if (state) {
        metrics['elapsedAtFinalize'] = state.round.elapsed.value;
      }
      return { name, metrics, issues: [] };
    },
  };
}

export function creepAnalyzerPack(engine: Engine): Analyzer[] {
  const pack = defaultAnalyzerPack(engine);
  if (engine.tryInject(CreepWarfareKey)) {
    pack.push(createCreepOutcomeAnalyzer(engine));
  }
  return pack;
}
