// ─── Skeleton ───
// Upgrade constants for Cycler — the within-run reinvestment that builds toward
// the capacity ceiling, and the permanent power that carries across prestige.
// Plain values; the upgrade module wraps them in `tunable()`. The corrected model
// (multiverse-hr #17): within-run reinvestment ladders are deliberately
// CONVERGENT (this is what makes capacity saturate to D_max), and permanent power
// upgrades re-peg the burn — so they buy REACH, not run length.

export interface UpgradeBalance {
  /** Geometric cost ratio of within-run reinvestment. Kept above the output gain so the ladder converges. */
  reinvestCostRatio: number;
  /** Concavity of reinvestment output (income ∝ spend^exponent, exponent < 1) — why capacity saturates. */
  reinvestOutputExponent: number;
  /** Cost ratio of a permanent power level (carried across prestige). Pairs with build.producerUpgradeRatio. */
  powerUpgradeCostRatio: number;
}

export const UPGRADE_BALANCE: UpgradeBalance = {
  reinvestCostRatio: 3,
  reinvestOutputExponent: 0.369,
  powerUpgradeCostRatio: 2,
};

// ─── Balance ───
// Tuned by `balance/cycler-projection.ts` (§ decoupling) toward: reinvestment that
// saturates cleanly, permanents that buy reach without bloating runs.
// Closed-form skeleton (rate-function pass, 2026-07; corrected against
// multiverse-hr #17):
//   • Within-run reinvestment is a CONVERGENT ladder — geometric cost
//     (reinvestCostRatio 3, grounded in multiverse-hr's pull cost ratio) against
//     concave output (∝ spend^0.369, grounded in Sales/Lab income). Convergence is
//     a feature, not a leak: it is what caps within-run capacity at D_max and
//     hands the run-end to the exogenous burn instead of an infinite race.
//   • Permanent power upgrades (build.producerUpgradeRatio^L, carried across
//     prestige) raise D_max — and under the peg (threat.ts) that RE-BASELINES W₀ =
//     D_max/H, so run length N* = τ_setup + T_g·log_g(H) is UNCHANGED. Power
//     decouples from pacing. This retires the earlier "M_b extends the run by
//     6.7 cyc/e-fold" claim entirely: with the peg, a base/power upgrade adds
//     ZERO run length — it converts to prestige currency and deeper content.
//   • The only run-length levers are H and g (threat.ts). If a fork wants an
//     upgrade to lengthen runs, it must touch H or g, and should be gated
//     accordingly (a g-bender is the high-leverage permanent to gate; a power
//     permanent is safe to sell freely).
