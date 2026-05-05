/**
 * <Archetype> balance solver — methodology #1 (spec/calibrate/lock).
 *
 * Scaffold for the Gauss-Seidel + scope-push bisection pattern, per
 * `archetypes/BALANCING.md § Theme 3 #1`. Each beat gets bisected against
 * the bot-driven engine by pushing the candidate value onto the
 * archetype's tuning `OverrideRegistry` and running `runUntil`. One engine
 * per solve-pass — bisection iterations reset state via
 * `saveManager.importSave(initialBlob)` instead of rebuilding.
 *
 * Methodology #1 vs #2: this file runs the bot via `runUntil` per
 * bisection sample (slow but correct). For archetypes with closed-form
 * predictors (#2 in `predict.ts`), `BALANCING.md § Engine as oracle`
 * describes a future bridge that bisects against the predictor instead,
 * with sim runs only at verify (`verify.ts`). For now, this solver
 * remains the production loop; #2 is additive.
 *
 * Invoke as a vite-node script: `pnpm exec vite-node
 * src/archetypes/<archetype>/balance/solve.ts`. Prints a proposed-patch
 * report. Does NOT mutate data files — the human picks and edits
 * scaffolding based on the output, per `archetypes/BALANCING.md`.
 *
 * Worked example: `src/archetypes/producer/balance/solve.ts`. Read it for
 * the concrete bracket sizing (bisectTuner `lo`/`hi` per beat), chained
 * proposal state, and verifyAll reporter.
 */

import {
  bisectTuner,
  runUntil,
  type DecimalSource,
  type Engine,
  type OverrideRegistry,
  type TunerResult,
} from 'open-loop-engine';
import { ARC_BEATS, BEAT_WINDOWS } from './beats';
import { buildSimEngine } from './bot';

// TODO(fill-in): import your archetype's tuning registry key and tunables
// type. Model after `producer/modules/producers.ts` — the tunable registry
// is a scaffold the modules expose; solver writes into it via pushScope.
//
// import { <Archetype>TuningRegistryKey, type <Archetype>Tunables } from '../modules/<...>';

// Placeholder; replace with the archetype-specific type.
type Tunables = Record<string, unknown>;

const BUDGET_SEC = Math.max(...Object.values(BEAT_WINDOWS).flat()) * 2.5;

// ─── Proposal state ────────────────────────────────────────────────────
//
// Accumulated per-beat proposals. Re-pushed as part of every sampler's
// scope so later beats see earlier beats' solutions. When a sampler
// bisects a new candidate for its own beat, that key overwrites the
// accumulated value inside the single per-sample scope.

type Proposed = Partial<Record<keyof Tunables, DecimalSource>>;

function toScope(p: Proposed): Partial<Tunables> {
  const scope = {} as Record<string, () => DecimalSource>;
  for (const [key, value] of Object.entries(p) as Array<[string, DecimalSource]>) {
    scope[key] = () => value;
  }
  return scope as Partial<Tunables>;
}

// ─── Sampler ───────────────────────────────────────────────────────────

interface SamplerContext {
  engine: Engine;
  registry: OverrideRegistry<Tunables>;
  initialBlob: string;
  proposed: Proposed;
}

/**
 * One sample under a candidate override. Invariants:
 *
 *   1. `importSave(initialBlob)` resets engine state AND bot-accumulator
 *      `persistent()` refs in one pass.
 *   2. Exactly one scope is pushed per sample — accumulated proposal +
 *      this beat's candidate merged into a single `{...toScope, [k]: v}`.
 *   3. `cleanup()` runs in `finally`, and `scopeDepth === 0` is asserted
 *      after. A scope leak here silently contaminates the next iteration.
 */
function sampleBeat(
  ctx: SamplerContext,
  beatId: string,
  candidateKey: keyof Tunables,
  candidateValue: number,
): number {
  const beat = ARC_BEATS.find((b) => b.id === beatId);
  if (!beat) throw new Error(`no beat ${beatId} in ARC_BEATS`);

  const result = ctx.engine.saveManager!.importSave(ctx.initialBlob);
  if (!result.success) throw new Error(`importSave failed for beat ${beatId}`);

  const cleanup = ctx.registry.pushScope(`solver:${beatId}`, {
    ...toScope(ctx.proposed),
    [candidateKey]: () => candidateValue,
  } as Partial<Tunables>);

  let fireTime: number;
  try {
    const { terminated, elapsedSimulated } = runUntil({
      engine: ctx.engine,
      until: () => beat.predicate(ctx.engine),
      maxSimTime: BUDGET_SEC,
      tickDelta: 1,
    });
    fireTime = terminated === 'predicate' ? elapsedSimulated : Infinity;
  } finally {
    cleanup();
  }
  if (ctx.registry.scopeDepth !== 0) {
    throw new Error(`scope leak after ${beatId} sampler: depth=${ctx.registry.scopeDepth}`);
  }
  return fireTime;
}

// ─── Per-beat solvers ──────────────────────────────────────────────────
//
// One function per beat you want to solve. Each picks a single 1-D tunable
// and a bracket for it. Bracket sizing: wide enough that the true answer is
// strictly inside, narrow enough that bisection converges in ≤ 22 iters
// (bisectTuner's default cap). When `lo` / `hi` both give "unreachable",
// the content layer is wrong — reshape, don't widen the bracket further.
//
// Direction is auto-detected by `bisectTuner` from the two-endpoint
// calibration: cost-like knobs go forward (higher value → later fire),
// multiplier-like knobs go inverted. Callers don't need to know which.
//
// TODO(fill-in): one solveBeatN per beat you're tuning.
//
// function solveBeatN(ctx: SamplerContext, targetSec: number): TunerResult {
//   return bisectTuner({
//     lo: <low>, hi: <high>, targetSec,
//     sampler: (v) => sampleBeat(ctx, 'beat-N', '<tunable-key>', v),
//   });
// }

// ─── Gauss-Seidel orchestrator ─────────────────────────────────────────
//
// Solve beats in ORDER against the accumulated proposal. Each beat's
// sampler reads all earlier beats' proposed values via `toScope(proposed)`,
// so beat-N's solution depends on beats 1..N-1. Run multiple passes if
// coupling is significant — convergence when pass-to-pass deltas fall
// below tolerance. Producer's default is 1 pass (chained beats converge in
// a single sweep); archetypes with stronger coupling may need more.

interface BeatSolve {
  beatId: string;
  field: string;
  proposed: number;
  proposedFireTime: number;
  direction: 'forward' | 'inverted';
  iterations: number;
  window: [number, number];
}

function solvePass(proposed: Proposed): {
  proposed: Proposed;
  solves: BeatSolve[];
} {
  // TODO(fill-in):
  //   1. `const engine = buildSimEngine();`
  //   2. `const registry = engine.tryInject(<Archetype>TuningRegistryKey)!;`
  //   3. `const initialBlob = engine.saveManager!.exportSave();`
  //   4. Build SamplerContext. For each beat: solveBeatN → accumulate into
  //      `ctx.proposed[key] = value` → push a BeatSolve row.
  //   5. Return { proposed: ctx.proposed, solves }.
  void proposed;
  void sampleBeat;
  void bisectTuner;
  throw new Error('template — replace with archetype-specific pass');
}

function main(): void {
  let proposed: Proposed = {};
  let solves: BeatSolve[] = [];
  const MAX_PASSES = 3;
  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    const next = solvePass(proposed);
    proposed = next.proposed;
    solves = next.solves;
    // TODO(fill-in): break early once pass-to-pass delta < tolerance.
    void pass;
  }
  // TODO(fill-in): render a proposal table. See producer's solve.ts for a
  // concrete renderer printing current/proposed + direction + iterations +
  // in-window classification.
  console.log(solves);
}

// Intentional top-level execution: this file is invoked via vite-node.
main();

// Silence the placeholder-types unused warning outside typecheck runs.
void (null as unknown as TunerResult);
