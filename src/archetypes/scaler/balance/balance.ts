/**
 * Scaler archetype — declarative balance surface.
 *
 * Identity, per-subsystem bucket-walk, and measurement-anchor predicates for
 * the canonical-port reference implementation. Scaler is a canonical-port
 * archetype: Synergism numbers carry 1:1 with file-header citations, so the
 * methodology pass *instruments* the math rather than tuning beats. Anchors
 * below are **read-off points** — the predicate fires under canonical play
 * at a sim-time the math determines — not bisection targets.
 *
 * The declared-invention surface (transcend thresholds lowered 84 OOMs from
 * canonical, offering-base-gain stub) lives at `tunable()` reader sites
 * against `ScalerTuningRegistryKey` (`modules/tuning.ts`). Forks tune that
 * surface as additional canonical compounding sources (cube upgrades,
 * hepteract effects, shop upgrades) port in.
 *
 * Algorithmic surfaces live alongside:
 *   bot.ts     — sim-engine builder + accessor for stasis-aware-tick
 *   spec.ts    — closed-form walkers (ECC piecewise, runes log-curve,
 *                prestige Bellman, transcend Bellman). Lands per sub-pass.
 *   solve.ts   — vite-node discovery drivers per sub-pass.
 *   verify.ts  — spec-vs-sim diff per sub-pass.
 *
 * Worked example for cross-reference: `src/archetypes/producer/balance/` for
 * the predictor-seed shape; `src/archetypes/ambient/balance/` for the
 * direct-bisect shape. Scaler is closer to producer (the Bellman recursion
 * earns a spec walker) but with ambient-style minimal `bot.ts` (autobuyer
 * only, zero click).
 */

import { Decimal } from '@open-loop/engine';
import type { BeatProbe } from '@/balance';
import {
  eccTranscend,
  getCoinsThisPrestige,
  getCoinsThisTranscension,
  getPrestigeCount,
  getRuneLevel,
  getTranscendCount,
} from '../modules';

// ─── Identity ────────────────────────────────────────────────────────────────

export interface PhaseIntent {
  id: string;
  /** Strict position in the canonical Synergism arc. */
  order: number;
  /** One-line player-experience description. */
  intent: string;
  /** Measurement-anchor id below that observes this phase firing. */
  measurementAnchorId: string | null;
}

/**
 * Scaler identity points (vs Producer / Ambient):
 *   - Multi-subsystem (vs Producer's single Pure / Ambient's single Pure).
 *     Coin / Accelerator / Multiplier / Upgrades / Runes / Prestige /
 *     Challenges / Transcend / Achievements each carry their own rate-
 *     function bucket per `SCALER_SUBSYSTEMS` below.
 *   - Cascade-reset cycles. Prestige zeros coin tier; transcend zeros
 *     prestige tier; the multiplier chain compounds across cycles via
 *     persistent currencies + rune EXP + transcend boosts. Bellman optimal-
 *     stopping decides *when* to cycle.
 *   - Canonical-port: Synergism numbers carry 1:1 with citations. Solvers
 *     operate on the declared-invention surface (transcend thresholds,
 *     offering base gain) per BALANCING.md § Canonical numbers are not
 *     tunable.
 *   - Zero-click autobuyer-driven arc. All income surfaces through
 *     `Producer.getTotalRate` — stasis-aware-tick adopts cleanly.
 *
 * Forks changing the cascade structure or the canonical-port posture are
 * no longer the Scaler archetype — they've forked into a sibling.
 */
export const SCALER_IDENTITY = {
  archetypeId: 'scaler' as const,
  /**
   * Cumulative sim-time budget for the headless reference arc. Covers
   * first-prestige (~58min canonical), runes Speed level-1 (same cycle),
   * first-transcend (~290min canonical, 84-OOM-lowered first-arc),
   * and a few prestige/transcend cycles past the first.
   */
  arcBudgetSec: 12 * 60 * 60,
  /**
   * Signature climax metric. The transcend cycle is the archetype center-
   * piece: prestige multiplier compounds inside it, transcend multiplier
   * compounds across it, the whole economy resets at the top.
   */
  signatureMetric: 'first-transcend-completes AND transcend-multiplier-applied',
  /**
   * Canonical-port posture flag. The methodology pass instruments the math
   * rather than tuning beats; solver perturbation is restricted to the
   * declared-invention surface.
   */
  posture: 'canonical-port' as const,
} as const;

// ─── Subsystem bucket-walk per BALANCING.md § Theme 2 ────────────────────────

/**
 * Per-subsystem classification against the BALANCING.md Theme 2 nine-bucket
 * vocabulary. The methodology a sub-pass reaches for follows from the bucket
 * — § Bucket → methodology lookup.
 *
 * Sub-passes shipped in this leaf: ECC (Piecewise closed-form), prestige
 * (Optimal stopping), transcend (Optimal stopping, layered), runes
 * (Pure closed-form). The other subsystems below are read-off canonical-
 * port — no solver pass under this leaf; the bucket label records the
 * classification for future fork work.
 */
export type SubsystemBucket =
  | 'pure'
  | 'piecewise'
  | 'coupled-state-deterministic'
  | 'strategy-space-integration'
  | 'stochastic'
  | 'discrete-event-coupled'
  | 'network-topological'
  | 'optimal-stopping'
  | 'combinatorial-selection'
  | 'discrete-planning';

export interface SubsystemClassification {
  id: string;
  bucket: SubsystemBucket;
  /** Primary methodology key from BALANCING.md § Theme 3 (#1–#7). */
  methodology: '#1' | '#2' | '#3' | '#4' | '#5' | '#6' | '#7';
  /** What the subsystem produces and which other subsystems compose with it. */
  note: string;
  /** Sub-pass that ships under this leaf, or null for canonical-port read-off only. */
  subPass: 'runes' | 'ecc' | 'prestige' | 'transcend' | null;
}

export const SCALER_SUBSYSTEMS: readonly SubsystemClassification[] = [
  {
    id: 'coin',
    bucket: 'pure',
    methodology: '#1',
    note: 'Geometric base-cost ladder × modifier chain. Canonical Synergism cost / rate functions, no perturbation surface — solvers read off the rate trajectory under canonical numbers.',
    subPass: null,
  },
  {
    id: 'accelerator',
    bucket: 'piecewise',
    methodology: '#2',
    note: 'Cumulative-buy cost piecewise: geometric ≤125, geometric×factorial >125, ×1.25^(n−1000) under Ch4. Canonical-port, no solver.',
    subPass: null,
  },
  {
    id: 'multiplier',
    bucket: 'piecewise',
    methodology: '#2',
    note: 'Cumulative-buy cost piecewise: geometric ≤75, geometric×factorial >75, ×1.25^(n−1000) under Ch4. Canonical-port, no solver.',
    subPass: null,
  },
  {
    id: 'upgrades',
    bucket: 'pure',
    methodology: '#1',
    note: 'One-time per-row buys at canonical 10^costLog. Modifier chain binds; no solver.',
    subPass: null,
  },
  {
    id: 'runes',
    bucket: 'pure',
    methodology: '#1',
    note: 'EXP→level via canonical log curve `floor(levelsPerOOM × log10(EXP/costCoefficient + 1))`. Closed-form predictor walker validates the scaffolding under the easiest math.',
    subPass: 'runes',
  },
  {
    id: 'challenges (ECC)',
    bucket: 'piecewise',
    methodology: '#2',
    note: 'ECC softcap is piecewise-spliced (linear ≤100 / ÷20 [100,1000] / ÷100 above). Closed-form regime walker; in-tree exemplar for BALANCING.md Piecewise closed-form row.',
    subPass: 'ecc',
  },
  {
    id: 'prestige',
    bucket: 'optimal-stopping',
    methodology: '#5',
    note: 'When-to-prestige decision under autobuyer policy. Per-fixed-strategy ROI closes (canonical disjunctive gate); optimal threshold solved by Bellman value iteration against engine-as-oracle. First in-tree consumer of optimal-stopping math.',
    subPass: 'prestige',
  },
  {
    id: 'transcend',
    bucket: 'optimal-stopping',
    methodology: '#5',
    note: 'Same Bellman shape one layer up. Continue branch invokes prestige value function; reset cascade collapses coin + prestige tier state. Threshold parameters are declared-invention `tunable()` surface.',
    subPass: 'transcend',
  },
  {
    id: 'achievements',
    bucket: 'coupled-state-deterministic',
    methodology: '#1',
    note: 'Predicate-watch flips, AP curve binds. Coupled to coin/prestige/transcend via free-X aggregator chains. Canonical-port, no solver — locks are mechanical state-transition checks in sim/achievement-beat.test.ts.',
    subPass: null,
  },
] as const;

// ─── Canonical-arc player-experience phases ──────────────────────────────────

/**
 * Ordered phases the canonical Synergism arc walks. Phase intents are
 * identity; the measurement-anchor predicate firing under canonical play
 * lives in `SCALER_MEASUREMENT_ANCHORS` below.
 */
export const SCALER_PHASES: readonly PhaseIntent[] = [
  {
    id: 'first-coin-producer-purchased',
    order: 1,
    intent:
      'First coin producer (Worker) auto-purchased — autobuyer onboarding visible after the 100-coin starter kit drains',
    measurementAnchorId: 'coin-1-owned',
  },
  {
    id: 'modifier-chain-first-felt',
    order: 2,
    intent:
      'First Accelerator/Multiplier purchase modifies coin rate by a felt magnitude — modifier chain interactive',
    measurementAnchorId: 'accelerator-1-bought',
  },
  {
    id: 'first-prestige-fires',
    order: 3,
    intent:
      'First prestige conversion fires under autobuyer — coin tier resets, PP currency unlocks the prestige layer',
    measurementAnchorId: 'first-prestige',
  },
  {
    id: 'first-rune-level-1',
    order: 4,
    intent:
      'Speed rune reaches level ≥1 from accumulated offerings — rune-effect multiplier begins compounding into coin chain',
    measurementAnchorId: 'first-rune-speed-level-1',
  },
  {
    id: 'first-diamond-owned',
    order: 5,
    intent:
      'Diamond-1 auto-purchased post-prestige — prestige layer compounding visible (shards emit, rune offerings accrue per cycle)',
    measurementAnchorId: 'first-diamond-owned',
  },
  {
    id: 'first-transcend-fires',
    order: 6,
    intent:
      'First transcend conversion fires — prestige tier collapses, transcend layer carries forward, signature-metric climax',
    measurementAnchorId: 'first-transcend',
  },
  {
    id: 'first-mythos-owned',
    order: 7,
    intent:
      'Mythos-1 auto-purchased post-transcend — transcend layer compounding visible, second prestige cycle accelerates',
    measurementAnchorId: 'first-mythos-owned',
  },
] as const;

// ─── Measurement anchors ─────────────────────────────────────────────────────

/**
 * Read-off measurement points the canonical economy produces. Not solver
 * targets — predicates fire when the math says they fire under canonical
 * numbers. `expectedWindow` is a wide sanity-check band (existing discovery-
 * script measurements ± a generous margin), surfaced so regression locks
 * catch silent drift but don't pretend to be tuned targets.
 *
 * Predictor walkers in `spec.ts` (added per-sub-pass) sharpen the
 * `expectedWindow` per anchor to within a few percent of the predicted
 * fire time. The `verify.ts` spec-vs-sim diff catches divergence between
 * the closed-form prediction and the simulated trajectory.
 */
export const SCALER_MEASUREMENT_ANCHORS: readonly BeatProbe[] = [
  {
    id: 'coin-1-owned',
    // Within the first minute under canonical autobuyer + starter coins.
    targetWindow: [0, 60],
    predicate: () => coinProducerCountAtLeast('coin-1', 1),
  },
  {
    id: 'accelerator-1-bought',
    // Accelerator-1 fires inside the first 5 minutes per canonical price.
    targetWindow: [0, 5 * 60],
    predicate: () => acceleratorBoughtAtLeast(1),
  },
  {
    id: 'first-prestige',
    // Canonical first-prestige fires ~57min under autobuyer at canonical
    // 1e16 threshold; predictor (`balance/spec.ts predictPrestigeAtCanonical
    // Threshold`) confirms `prestigePointGain = 100` at threshold exactly,
    // making the `anyOf` disjunction structurally a single condition.
    // Window: ±5min around observed 3405s closure.
    targetWindow: [54 * 60, 62 * 60],
    predicate: () => getPrestigeCount().value >= 1,
  },
  {
    id: 'first-rune-speed-level-1',
    // Fires same engine tick as first prestige: the autobuyer's onTick
    // sacrifice consumes the 2 offerings accrued by the prestige reset's
    // afterReset, and Speed's level-1 threshold (≈0.77 EXP) clears in one
    // pass. Window mirrors first-prestige; `balance/spec.ts`
    // `predictFirstSpeedLevel1Sec` returns `firstPrestigeAt` exactly.
    targetWindow: [30 * 60, 90 * 60],
    predicate: () => getRuneLevel('speed').value >= 1,
  },
  {
    id: 'first-diamond-owned',
    // Diamond-1 auto-purchases inside seconds of first-prestige firing —
    // tier-presence gate opens, autobuyer sweeps cheap producer.
    targetWindow: [30 * 60, 95 * 60],
    predicate: () => diamondProducerCountAtLeast('diamond-1', 1),
  },
  {
    id: 'first-transcend',
    // Canonical first-transcend fires ~290min under first-arc 5e16 thresholds
    // (canonical 1e100 unreachable pre-cube/hepteract). Expected window
    // is the existing discovery-script ceiling (6h) with a floor matching
    // the prestige-cycle compounding floor. Sharpened by transcend spec.ts.
    targetWindow: [3 * 60 * 60, 6 * 60 * 60],
    predicate: () => getTranscendCount().value >= 1,
  },
  {
    id: 'first-mythos-owned',
    // Mythos-1 auto-purchases inside seconds of first-transcend firing.
    targetWindow: [3 * 60 * 60, 6 * 60 * 60 + 5 * 60],
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
 * Re-export `eccTranscend` for spec.ts and verify.ts so they read the
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

// Re-export accessors for spec.ts / solve.ts / verify.ts walkers so they
// query engine-as-oracle through the same accessors the measurement-anchor
// predicates use.
export { getCoinsThisPrestige, getCoinsThisTranscension };
