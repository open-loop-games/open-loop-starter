/**
 * Scaler beat spec — the Lane-3 lock's measured anchors + predicates.
 *
 * The measurement anchors below are **read-off points**: scaler is a
 * canonical-port (Synergism numbers carry 1:1, see `../IDENTITY.md`), so each
 * predicate fires under canonical autobuyer play at a sim-time the math
 * determines — not a bisection target. `tuningWindow` is a wide sanity band
 * (existing discovery-script measurement ± a generous margin), surfaced so the
 * `sim/*-beat.test.ts` locks catch silent drift without pretending to be a
 * tuned target. The identity that these windows measure — phase order,
 * subsystem bucket-walk, canonical-port posture — is prose in `../IDENTITY.md`,
 * never authored here.
 *
 * Algorithmic surfaces alongside:
 *   bot.ts          — sim-engine builder + accessor for stasis-aware-tick
 *   spec.ts         — closed-form walkers (ECC piecewise, runes log-curve,
 *                     prestige Bellman, transcend Bellman)
 *   solve-probe.ts  — vite-node discovery drivers per sub-pass
 *   verify-probe.ts — spec-vs-sim diff per sub-pass
 */

import { Decimal, type BeatProbe } from '@open-loop/engine';
import {
  eccTranscend,
  getCoinsThisPrestige,
  getCoinsThisTranscension,
  getPrestigeCount,
  getRuneLevel,
  getTranscendCount,
} from '../modules';

// ─── Measurement anchors ─────────────────────────────────────────────────────

/**
 * Read-off measurement points the canonical economy produces. Not solver
 * targets — predicates fire when the math says they fire under canonical
 * numbers. `tuningWindow` is a wide sanity-check band (existing discovery-
 * script measurements ± a generous margin), surfaced so regression locks
 * catch silent drift but don't pretend to be tuned targets.
 *
 * Predictor walkers in `spec.ts` sharpen each anchor's window to within a few
 * percent of the predicted fire time; the `verify-probe.ts` spec-vs-sim diff
 * catches divergence between the closed-form prediction and the simulated
 * trajectory.
 */
export const SCALER_MEASUREMENT_ANCHORS: readonly BeatProbe[] = [
  {
    id: 'coin-1-owned',
    // Within the first minute under canonical autobuyer + starter coins.
    tuningWindow: [0, 60],
    predicate: () => coinProducerCountAtLeast('coin-1', 1),
  },
  {
    id: 'accelerator-1-bought',
    // Accelerator-1 fires inside the first 5 minutes per canonical price.
    tuningWindow: [0, 5 * 60],
    predicate: () => acceleratorBoughtAtLeast(1),
  },
  {
    id: 'first-prestige',
    // Canonical first-prestige fires ~57min under autobuyer at canonical
    // 1e16 threshold; predictor (`spec.ts predictPrestigeAtCanonical
    // Threshold`) confirms `prestigePointGain = 100` at threshold exactly,
    // making the `anyOf` disjunction structurally a single condition.
    // Window: ±5min around observed 3405s closure.
    tuningWindow: [54 * 60, 62 * 60],
    predicate: () => getPrestigeCount().value >= 1,
  },
  {
    id: 'first-rune-speed-level-1',
    // Fires same engine tick as first prestige: the autobuyer's onTick
    // sacrifice consumes the 2 offerings accrued by the prestige reset's
    // afterReset, and Speed's level-1 threshold (≈0.77 EXP) clears in one
    // pass. Window mirrors first-prestige; `spec.ts`
    // `predictFirstSpeedLevel1Sec` returns `firstPrestigeAt` exactly.
    tuningWindow: [30 * 60, 90 * 60],
    predicate: () => getRuneLevel('speed').value >= 1,
  },
  {
    id: 'first-diamond-owned',
    // Diamond-1 auto-purchases inside seconds of first-prestige firing —
    // tier-presence gate opens, autobuyer sweeps cheap producer.
    tuningWindow: [30 * 60, 95 * 60],
    predicate: () => diamondProducerCountAtLeast('diamond-1', 1),
  },
  {
    id: 'first-transcend',
    // First transcend fires ~285min under first-arc 5e16 tunables (canonical
    // 1e100 unreachable pre-cube/hepteract). Predictor (`spec.ts
    // predictTranscendAtCanonicalThreshold`) confirms `transcendPointGain = 1`
    // at threshold exactly — the layered anyOf disjunction collapses under
    // canonical-port discipline. Window ±25min around observed closure.
    tuningWindow: [260 * 60, 310 * 60],
    predicate: () => getTranscendCount().value >= 1,
  },
  {
    id: 'first-mythos-owned',
    // Mythos-1 auto-purchases inside seconds of first-transcend firing.
    tuningWindow: [260 * 60, 310 * 60 + 5 * 60],
    predicate: () => mythosProducerCountAtLeast('mythos-1', 1),
  },
];

// ─── ECC piecewise-regime sample points ──────────────────────────────────────

/**
 * Completion counts the ECC piecewise walker samples in the ECC sub-pass.
 * Includes regime breakpoints (100, 1000) ± 1 on either side to exercise
 * the splice math, plus interior points to catch interpolation errors.
 *
 * The walker reports `eccTranscend(count)` at each point; the verifier
 * diffs spec-walker output against engine `eccTranscend()` reads (exact
 * match — both are closed-form, no tolerance needed).
 */
export const ECC_SAMPLE_COMPLETIONS: readonly number[] = [
  0, 1, 50, 99, 100, 101, 500, 999, 1000, 1001, 1500, 2000,
];

/**
 * Re-export `eccTranscend` for spec.ts and verify-probe.ts so they read the
 * canonical-port closed form from the module that owns it. Spec walker
 * computes the same value via its own piecewise expression; verify diffs.
 */
export { eccTranscend };

// ─── Predicate helpers ───────────────────────────────────────────────────────

import {
  getCoinProducers,
  getDiamondProducers,
  getMythosProducers,
  getAccelerator,
} from '../modules';

function coinProducerCountAtLeast(id: string, n: number): boolean {
  const p = getCoinProducers().getProducer(id);
  return p ? Decimal.gte(p.count.value, n) : false;
}

function diamondProducerCountAtLeast(id: string, n: number): boolean {
  const p = getDiamondProducers().getProducer(id);
  return p ? Decimal.gte(p.count.value, n) : false;
}

function mythosProducerCountAtLeast(id: string, n: number): boolean {
  const p = getMythosProducers().getProducer(id);
  return p ? Decimal.gte(p.count.value, n) : false;
}

function acceleratorBoughtAtLeast(n: number): boolean {
  return Decimal.gte(getAccelerator().amount.value, n);
}

export {
  coinProducerCountAtLeast,
  diamondProducerCountAtLeast,
  mythosProducerCountAtLeast,
  acceleratorBoughtAtLeast,
};

// Re-export accessors for spec.ts / solve-probe.ts / verify-probe.ts walkers so
// they query engine-as-oracle through the same accessors the measurement-anchor
// predicates use.
export { getCoinsThisPrestige, getCoinsThisTranscension };
