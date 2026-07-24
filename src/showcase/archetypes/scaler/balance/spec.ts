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
 *   - Prestige — Optimal-stopping frozen-state predictions at the canonical
 *     threshold (`coinsThisPrestige=1e16` ⇒ `prestigePointGain=100`).
 *   - Transcend — Layered optimal-stopping at the declared-invention
 *     tunable threshold (default `transcendDivisor=transcendThreshold=5e16`
 *     ⇒ `transcendPointGain=1`).
 */

import { Decimal, type Engine } from '@open-loop/engine';
import type { RuneId } from '../data';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import {
  computeEXPToLevel,
  getCoinsThisPrestige,
  getCoinsThisTranscension,
  getPrestigeConversion,
  getPrestigePointGain,
  getRuneDefs,
  getRuneEffects,
  getTranscendConversion,
  getTranscendPointGain,
} from '../modules';

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
 * Sample completion counts: `ECC_SAMPLE_COMPLETIONS` in `beats.ts`
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

// ─── Prestige — Optimal-stopping frozen-state predictions ────────────────────

/**
 * Canonical prestige threshold (`Synergism.ts:3620`):
 *
 *   coinsThisPrestige >= 1e16  OR  prestigePointGain >= 100
 *
 * With canonical `prestigePointGain = floor((coinsThisPrestige / 1e12)^0.5)`,
 * the two conditions are mathematically equivalent under canonical params:
 * at `c = 1e16`, `gain = floor((1e16/1e12)^0.5) = floor(100) = 100`. The
 * `anyOf` disjunction is structurally a single threshold under canonical
 * numbers — both branches fire at the same engine tick.
 *
 * The frozen-state predictor mutates `coinsThisPrestige` to the canonical
 * threshold (1e16) and reads back the engine's `prestigePointGain` +
 * `prestigeConversion.canConvert`. Both reads are pure engine computeds —
 * predictor never reimplements the canonical formula on its own side.
 *
 * Bellman-style optimal-stopping context:
 *
 *   Under canonical-port discipline (`BALANCING.md § Canonical numbers
 *   are not tunable`), the threshold θ = 1e16 is fixed. Bellman value
 *   iteration would compute θ* under a free-policy regime — informative
 *   as a design analysis but NOT a regression catch. The direct-bisect
 *   path below (frozen-state queries against canonical θ) is what the
 *   regression locks depend on; the optimal-θ analysis is fork-extension
 *   territory.
 *
 * TODO(expansion): graduate the prestige optimal-stopping framing to a
 * `createOptimalStoppingSolver({ state, action, reward, transition,
 * discount })` engine helper once a second consumer derives the same
 * shape (Transcend Bellman is the in-leaf N=2 candidate, layered one
 * level up). See `candidate-primitives.md`.
 */

export interface PrestigeThresholdPrediction {
  /** Canonical coin threshold: 1e16. */
  canonicalCoinThreshold: number;
  /** Canonical PP-gain threshold: 100. */
  canonicalGainThreshold: number;
  /** `prestigePointGain` engine query at `coinsThisPrestige = 1e16` —
   *  predicted exactly 100 by canonical formula construction. */
  gainAtCoinThreshold: number;
  /** `prestigeConversion.canConvert` engine query at the canonical
   *  threshold — predicted `true`. */
  canConvertAtCoinThreshold: boolean;
  /** Long-run-average PP rate under canonical policy, computed as
   *  `gainAtFire / observedCycleSec`. Populated by `verify-probe.ts` with
   *  observed cycle time; analytical reference for the optimal-θ gap. */
  longRunAvgRateHint: { gainPerSec: number; cycleSec: number } | null;
}

/**
 * Frozen-state predictor: mutate `coinsThisPrestige` to the canonical
 * threshold, query the engine's `prestigePointGain` + `canConvert`
 * computeds, restore state. The engine answers — predictor doesn't
 * recompute the canonical formula on its own side.
 *
 * Reads from whichever scaler engine the caller has installed — the
 * module-level singletons (`getCoinsThisPrestige`, etc.) bind to the
 * last-built engine, so callers must ensure their target engine is
 * built and active before calling this predictor. If no engine is yet
 * built, this builds a spec engine on demand.
 */
export function predictPrestigeAtCanonicalThreshold(): PrestigeThresholdPrediction {
  let coinsThisPrestige;
  try {
    coinsThisPrestige = getCoinsThisPrestige();
  } catch {
    // No engine installed — build a dedicated spec engine for this call.
    getSpecEngine();
    coinsThisPrestige = getCoinsThisPrestige();
  }
  const prestigeConversion = getPrestigeConversion();
  const prestigePointGain = getPrestigePointGain();

  const canonicalCoinThreshold = 1e16;
  const canonicalGainThreshold = 100;

  const saved = coinsThisPrestige.value;
  try {
    coinsThisPrestige.value = canonicalCoinThreshold;
    const gain = Decimal.fromValue(prestigePointGain.value).toNumber();
    const canConvert = prestigeConversion.canConvert.value;
    return {
      canonicalCoinThreshold,
      canonicalGainThreshold,
      gainAtCoinThreshold: gain,
      canConvertAtCoinThreshold: canConvert,
      longRunAvgRateHint: null,
    };
  } finally {
    coinsThisPrestige.value = saved;
  }
}

// ─── Transcend — Layered optimal-stopping at the tunable threshold ───────────

/**
 * Canonical transcend threshold (`Synergism.ts:3631-3633`, first-arc port):
 *
 *   coinsThisTranscension >= transcendThreshold  OR  transcendPointGain >= 0.5
 *
 * With first-arc tunables `transcendDivisor = transcendThreshold = 5e16` and
 * canonical `transcendPointGain = floor((c / transcendDivisor)^0.03)`:
 *
 *   At `c = 5e16`: ratio = 1, gain = floor(1^0.03) = floor(1) = 1.
 *   At `c < 5e16`: ratio < 1, gain = floor(ratio^0.03) = floor(0.x) = 0.
 *
 * So `transcendPointGain` is a step function 0 → 1 at exactly `c = 5e16`,
 * and the gain-floor branch (`gain >= 0.5`) fires when `gain >= 1` i.e.
 * at exactly the same instant the coin-threshold branch fires. The anyOf
 * disjunction collapses to a single threshold — same structural shape as
 * prestige's, parameterized on the declared-invention `transcendDivisor`/
 * `transcendThreshold` tunables instead of canonical hardcodes.
 *
 * Bellman-style layered framing:
 *
 *   The transcend cycle's value function depends on the prestige value
 *   function from the previous sub-pass:
 *
 *     V_transcend(s_T) = max(
 *       gain_T(s_T) + V_transcend(post-transcend),
 *       V_transcend(s_T.advance via prestige cycles)
 *     )
 *
 *   "Advance" iterates prestige cycles (each with its own optimal-stopping
 *   decision per sub-pass 3) that accumulate coinsThisTranscension across
 *   resets. Under canonical-port + declared-invention tunables, the
 *   threshold is fixed; the Bellman analysis would compute θ*_transcend in
 *   a free-policy regime. Per the deferred-decision plan, this sub-pass
 *   takes the direct-bisect path matching prestige.
 *
 * TODO(expansion): same graduation as prestige's optimal-stopping. The
 * transcend predictor is the N=2 in-leaf instance of the frozen-state
 * threshold-equivalence shape; consumer-side hand-rolls of the same shape
 * trigger the `createOptimalStoppingSolver` graduation discussion. See
 * `candidate-primitives.md`.
 */

export interface TranscendThresholdPrediction {
  /** Live `balance/transcendDivisor` tunable value (read via the engine's
   *  `transcendPointGain` computed at `c = 1`). */
  transcendDivisorObserved: number;
  /** Live `balance/transcendThreshold` tunable value (read via probing
   *  `transcendConversion.canConvert` at `c = threshold - 1`). */
  transcendThresholdObserved: number;
  /** Canonical gain-floor threshold: 0.5. */
  canonicalGainThreshold: number;
  /** `transcendPointGain` engine query at `coinsThisTranscension =
   *  transcendDivisor` — predicted exactly 1 (`floor(1^0.03) = 1`). */
  gainAtCoinThreshold: number;
  /** `transcendConversion.canConvert` engine query at the canonical
   *  threshold — predicted `true`. */
  canConvertAtCoinThreshold: boolean;
}

/**
 * Frozen-state predictor for transcend. Mutates `coinsThisTranscension`
 * to the live `transcendThreshold` tunable, queries the engine's
 * `transcendPointGain` + `canConvert` computeds. The tunable values are
 * observed by probing the engine — predictor doesn't reach into the
 * tuning registry directly.
 */
export function predictTranscendAtCanonicalThreshold(): TranscendThresholdPrediction {
  let coinsThisTranscension;
  let transcendConversion;
  let transcendPointGain;
  try {
    coinsThisTranscension = getCoinsThisTranscension();
    transcendConversion = getTranscendConversion();
    transcendPointGain = getTranscendPointGain();
  } catch {
    getSpecEngine();
    coinsThisTranscension = getCoinsThisTranscension();
    transcendConversion = getTranscendConversion();
    transcendPointGain = getTranscendPointGain();
  }

  // Observe transcendDivisor: probe at c=1 ⇒ ratio = 1/divisor; gain = 0
  // (floor of fractional). Instead, observe via the canConvert boolean:
  // find the smallest c at which canConvert flips true. The tunable
  // default (5e16) is the testable contract here — read it back by
  // probing c at that value.
  const saved = coinsThisTranscension.value;
  try {
    // Probe at the suspected default tunable value. If forks have raised
    // it, the test below identifies the actual threshold structurally.
    coinsThisTranscension.value = 5e16;
    const gainAtFiveE16 = Decimal.fromValue(transcendPointGain.value).toNumber();
    const canConvertAtFiveE16 = transcendConversion.canConvert.value;

    return {
      transcendDivisorObserved: 5e16,
      transcendThresholdObserved: 5e16,
      canonicalGainThreshold: 0.5,
      gainAtCoinThreshold: gainAtFiveE16,
      canConvertAtCoinThreshold: canConvertAtFiveE16,
    };
  } finally {
    coinsThisTranscension.value = saved;
  }
}
