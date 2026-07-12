// ─── Skeleton ───
// Phase-A (build) constants for Cycler — the saturating production/defense
// capacity. Plain values; the build module wraps the perturbable ones in
// `tunable()`. The load-bearing correction (from the multiverse-hr Cycler pivot,
// `/work/studio/multiverse-hr` #17): within-run capacity does NOT grow
// geometrically without bound — every reinvestment ladder is convergent (pull
// cost ratio > log output, income ∝ C^p with p<1, base output hard-capped, and
// Placement-Adjacency board-fill saturating on a finite grid). So production is
// CONCAVE and saturates to a within-run ceiling D_max. That saturation is what
// makes the run-end a *logarithmic* crossing, not a geometric one (see the
// Balance lens, and `data/threat.ts`).

export interface BuildBalance {
  /** Placement-grid cells. Finite → the primary saturation source (adjacency runs out of neighbours). */
  boardCells: number;
  /** Hard cap on per-unit output at the top tier — the convergent ladders' ceiling. */
  baseOutputCeiling: number;
  /** Effective average adjacency synergy at board-fill. Saturates (stack-vs-spread; boosters run out of coverage). */
  adjacencyBoost: number;
  /** Permanent power multiplier per producer-upgrade level: D_max scales ·producerUpgradeRatio^L. */
  producerUpgradeRatio: number;
}

export const BUILD_BALANCE: BuildBalance = {
  boardCells: 16,
  baseOutputCeiling: 50,
  adjacencyBoost: 2.5,
  producerUpgradeRatio: 2,
};

// ─── Balance ───
// Tuned by `balance/cycler-projection.ts` toward: a saturated ceiling the pegged
// burn crosses at an authored run length (see `data/threat.ts`).
// Closed-form skeleton (rate-function pass, 2026-07; corrected against
// multiverse-hr #17):
//   • Within-run capacity SATURATES to D_max = boardCells · baseOutputCeiling ·
//     adjacencyBoost · producerUpgradeRatio^L. It is concave, not geometric —
//     grounded in multiverse-hr's data sweep: cells [4,6,9,12,16]
//     (grid-tiers.ts), per-tier baseOutput ceiling ≈ [1,4,10,30,50]
//     (you-types.ts), ~2.5 avg adjacency (adjacency.ts, structural not capped),
//     producer upgrade 2^L (upgrades.ts "Institutional Knowledge"). Their product
//     is the tier ladder D_max ≈ [10,60,225,900,2000]·2^L. The archetype's numbers
//     here are a clean illustrative point; a fork grounds D_max in its own economy.
//   • Placement-Adjacency is still load-bearing — but for the SATURATION, not for
//     compounding. Adjacency BUILDS the ceiling; finite board-fill CAPS it. That
//     cap is why production is concave, which is why the crossing is log_g(D_max/W₀).
//   • D_max is the "reach" axis. Under the peg (threat.ts) it does NOT set run
//     length — permanent power re-pegs the burn (see `data/upgrades.ts`). Raising
//     D_max buys deeper content and more prestige currency, not longer runs.
