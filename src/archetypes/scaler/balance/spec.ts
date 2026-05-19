/**
 * Scaler engine-as-oracle helpers — methodology #2 spec layer.
 *
 * Frozen-state queries against the scaler engine + closed-form predictors
 * per subsystem. The engine is the math; the spec doesn't reimplement
 * cost / rate composition.
 *
 * Per `archetypes/BALANCING.md § Engine as oracle`: build the engine once,
 * mutate persistent refs into hypothetical states, query engine accessors
 * for the live values. Spec walkers consume those values plus closed-form
 * algebra to predict beat timing without driving the gameplay loop.
 *
 * Sections per subsystem:
 *   - Runes — Pure log-curve via canonical `computeEXPToLevel` inversion.
 *   - ECC — Piecewise regime walker over the transcend-tier softcap splice.
 */

import { Decimal, type Engine } from '@open-loop/engine';
import type { RuneId } from '../data';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import { computeEXPToLevel, getRuneDefs, getRuneEffects } from '../modules';

let counter = 0;
let cachedEngine: Engine | undefined;

/**
 * Cache one engine instance for frozen-state queries. Spec walkers mutate
 * refs to hypothetical states between queries; mid-walker reset to a
 * known baseline lives at each section's local helper.
 */
function getSpecEngine(): Engine {
  if (cachedEngine) return cachedEngine;
  const { engine } = createScalerEngine({
    persistenceNamespace: `scaler-spec-${++counter}`,
  });
  engine.selectMod(SCALER_MOD_ID);
  engine.start();
  engine.stop();
  cachedEngine = engine;
  return engine;
}

// ─── Runes — Pure log-curve closed form ──────────────────────────────────────

/**
 * Canonical level-from-EXP inversion (`Runes.ts:874-885`):
 *
 *   level(EXP) = floor(levelsPerOOM × log10(EXP / costCoefficient + 1))
 *
 * Inverted to "EXP needed for level N" (`computeEXPToLevel`, engine-side):
 *
 *   EXP(level) = costCoefficient × (10^(level / levelsPerOOM) − 1)
 *
 * Both functions are pure algebra over the per-rune (costCoefficient,
 * levelsPerOOM) tuple — the engine owns the closed form. The spec walker
 * queries the engine and composes the offering-accrual schedule on top.
 */
export interface RunePrediction {
  runeId: RuneId;
  costCoefficient: number;
  levelsPerOOM: number;
  /** EXP threshold for level 1 — `computeEXPToLevel(rune, 1)` engine query. */
  expForLevel1: number;
  /** Prestige firings required to accumulate enough offerings for level 1,
   *  assuming the entire offering pool funnels into this rune. Speed
   *  hits 1 in one firing; downstream runes need many. */
  prestigeFiringsToLevel1: number;
}

export interface RunesSpec {
  /** Canonical offerings accrued per prestige `afterReset` event at SI level 0.
   *  `offeringBaseGain × SI.offeringMult(0) = 2 × 1 = 2` at first arc. */
  offeringsPerFirstPrestige: number;
  /** Per-rune predictions in canonical sacrifice order (Speed → Dup → Prism
   *  → Thrift → SI). The autobuyer rounds-robin lowest-level; ties resolve
   *  by canonical order, so the first sacrifice always lands on Speed. */
  predictions: RunePrediction[];
}

/**
 * Build the runes spec from engine-as-oracle reads. SI offering multiplier
 * is queried from the live `getRuneEffects('superiorIntellect')` computed
 * at SI level 0 (the runes spec engine is fresh — no sacrifices have fired).
 *
 * The offering base gain is the canonical `2` from the `tunable()` default
 * at `modules/runes.ts § install`. The walker uses the canonical-port value
 * directly — fork perturbation enters through the picker at the consumer's
 * solver site, not here.
 */
export function buildRunesSpec(): RunesSpec {
  getSpecEngine();

  const offeringBaseGain = 2; // canonical default at `modules/runes.ts:216`
  const siOffMult = getRuneEffects('superiorIntellect').value.offeringMult;
  const offeringsPerFirstPrestige = offeringBaseGain * siOffMult;

  const defs = getRuneDefs();
  const predictions: RunePrediction[] = defs.map((def) => {
    const exp1 = Decimal.fromValue(computeEXPToLevel(def.id, 1)).toNumber();
    const firings = Math.max(1, Math.ceil(exp1 / offeringsPerFirstPrestige));
    return {
      runeId: def.id,
      costCoefficient: Decimal.fromValue(def.costCoefficient).toNumber(),
      levelsPerOOM: def.levelsPerOOM,
      expForLevel1: exp1,
      prestigeFiringsToLevel1: firings,
    };
  });

  return { offeringsPerFirstPrestige, predictions };
}

/**
 * Predict first-Speed-level-1 sim-time given the observed first-prestige
 * time. The autobuyer's `ctx.onTick` callback fires inside the same engine
 * tick that the prestige reset's `afterReset` event accrues offerings —
 * Speed jumps from level 0 to its first-sacrifice level in lockstep with
 * the first prestige firing.
 *
 * Speed level 1 needs `≈0.77` EXP (`50 × (10^(1/150) − 1)`); 2 offerings in
 * the first sacrifice clears the threshold by ~2.5×, so the firing is
 * deterministic on the first sacrifice tick.
 *
 * Returned time equals `firstPrestigeAtSec` exactly — no tick padding —
 * because both events fire on the same engine tick by construction.
 */
export function predictFirstSpeedLevel1Sec(firstPrestigeAtSec: number): number {
  const spec = buildRunesSpec();
  const speed = spec.predictions.find((p) => p.runeId === 'speed');
  if (!speed) throw new Error('runes spec: missing speed prediction');
  if (speed.prestigeFiringsToLevel1 !== 1) {
    throw new Error(
      `runes spec: Speed needs ${speed.prestigeFiringsToLevel1} prestige firings for level 1 — ` +
        'predictor assumes 1. Update the predictor (and the regression lock) if the ' +
        'tunable offering-base-gain has lowered below Speed level-1 threshold.',
    );
  }
  return firstPrestigeAtSec;
}

// ─── ECC — Piecewise transcend-tier softcap regime walker ────────────────────

/**
 * Canonical ECC softcap (`Challenges.ts:599-617` `case 'transcend'`):
 *
 *   eccTranscend(n) = min(100, n)
 *                   + (1/20)  × (min(1000, max(100, n))  − 100)
 *                   + (1/100) × (max(1000, n)            − 1000)
 *
 * Three regimes spliced at breakpoints 100 and 1000. The walker below
 * computes the same piecewise expression independently of the engine's
 * `eccTranscend()` — both sides are closed-form, both compute in IEEE 754,
 * verify diffs exact equality at every sample point.
 *
 * Sample completion counts: `ECC_SAMPLE_COMPLETIONS` in `balance.ts`
 * spans the regime breakpoints (100, 1000) ± 1 plus interior points to
 * exercise both splice junctions and within-regime interpolation.
 */

/**
 * Per-regime breakpoints. Independent of `modules/challenges.ts`'s
 * `CANONICAL_*` consts — the spec walker is the second source of truth
 * that the verify diff compares against.
 */
const ECC_LINEAR_CAP = 100;
const ECC_SOFT_BREAKPOINT = 1000;
const ECC_SOFT_DIVISOR = 20;
const ECC_HARD_DIVISOR = 100;

/**
 * Spec-walker piecewise expression. Re-derives the canonical regime
 * splice independently — verify diffs against `eccTranscend()`.
 */
export function specEccTranscend(completions: number): number {
  const linearCap = ECC_LINEAR_CAP;
  const softBreakpoint = ECC_SOFT_BREAKPOINT;
  const softDivisor = ECC_SOFT_DIVISOR;
  const hardDivisor = ECC_HARD_DIVISOR;

  const linearPart = Math.min(linearCap, completions);
  const softPart =
    (1 / softDivisor) * (Math.min(softBreakpoint, Math.max(linearCap, completions)) - linearCap);
  const hardPart = (1 / hardDivisor) * (Math.max(softBreakpoint, completions) - softBreakpoint);
  return linearPart + softPart + hardPart;
}

export interface EccSamplePoint {
  completions: number;
  predicted: number;
}

/**
 * Sample the spec walker across the regime-spanning completion counts.
 * Output pairs with the verify driver's engine read at each point.
 */
export function buildEccSpec(sampleCompletions: readonly number[]): EccSamplePoint[] {
  return sampleCompletions.map((c) => ({ completions: c, predicted: specEccTranscend(c) }));
}
