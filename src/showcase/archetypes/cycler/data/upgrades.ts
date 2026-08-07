// ─── Skeleton ───
// Upgrade constants for Cycler — the within-run reinvestment that builds toward
// the capacity ceiling, and the permanent power that carries across prestige.
// Plain values; `modules/upgrades.ts` binds the perturbable ones through
// `tunable()` against the registry in `modules/tuning.ts`. `gBendGateStep` stays
// plain — it indexes the power ladder rather than pricing anything. The corrected model
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
  /** g-bender approach ratio r_bend ∈ (0,1): g_eff = 1 + (g−1)·r_bend^L_bend. Toward the g=1 asymptote. */
  gBendRatio: number;
  /** g-bender Fragments cost of the first bend level. */
  gBendBaseCost: number;
  /** g-bender geometric cost growth per bend level. */
  gBendCostRatio: number;
  /** g-bender reach gate: bend level L_bend requires permanent power L ≥ L_bend · gBendGateStep. */
  gBendGateStep: number;
}

export const UPGRADE_BALANCE: UpgradeBalance = {
  reinvestCostRatio: 3,
  reinvestOutputExponent: 0.369,
  powerUpgradeCostRatio: 2,
  gBendRatio: 0.7,
  gBendBaseCost: 6,
  gBendCostRatio: 2,
  gBendGateStep: 2,
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

// ─── Skeleton (upgrade catalog) ───
// The permanent catalog (`addUpgrade`, IDENTITY § Growth ports): permanents on
// the prestige wallet (Fragments), built on the engine's `createPurchasableCategory`.
// Two entries:
//   • reach — freely-sold permanent power level L (D_max ×producerUpgradeRatio^L).
//     Under the peg this RE-BASELINES W₀ = D_max/H, so it adds ZERO run length — it
//     buys reach (deeper content, more sublinear currency). Cost = mergeQuorum ·
//     powerUpgradeCostRatio^L (the quorum is the L=0 price the first competent run
//     banks; the geometric ratio makes later levels save-across-runs). Effect
//     delegates to build (`raisePower`), which OWNS L — build is self-bootable
//     without this module, so the catalog drives + prices L, it does not own it.
//   • g-bender — the sole PACE lever (§ Balance (g-bender) below). Reach-gated;
//     lowers g toward a g>1 asymptote, lengthening every run.

export type UpgradeKind = 'reach' | 'g-bender';

export interface UpgradeDef {
  /** Stable persistence id (the purchasable's save context is `cycler/upgrades/{id}`). */
  id: string;
  /** Which permanent this is — the catalog's `mapPurchasable` branches on it. */
  kind: UpgradeKind;
  /** Player-facing name (costume). */
  title: string;
  /** Player-facing description. */
  description: string;
}

export const CYCLER_UPGRADES: UpgradeDef[] = [
  {
    id: 'reach',
    kind: 'reach',
    title: 'Reinforce',
    description:
      'Raise permanent power (D_max). Under the peg the burn re-baselines to match — pure reach, +0 run length.',
  },
  {
    id: 'g-bender',
    kind: 'g-bender',
    title: 'Dampen',
    description:
      'Bend the escalation base g toward 1 — the sole pace lever. Reach-gated; each level lengthens every run.',
  },
];

// ─── Balance (g-bender) ───
// The sole PACE lever on the upgrade side (`addUpgrade`, IDENTITY § Growth ports:
// "only a g/H upgrade moves pacing, and gets gated"). It is the mirror of the
// burn-tier ladder (`data/threat.ts`): burn tiers RAISE g (shorter, sharper runs —
// difficulty/content); the g-bender LOWERS the operative g back down (pace relief).
// Closed-form skeleton (rate-function pass, 2026-07; Increlution Part 3 — attacking
// the escalation base is the high-leverage lever):
//   • The bend is MULTIPLICATIVE toward the g=1 asymptote, never crossing it:
//         g_eff = 1 + (g − 1) · gBendRatio^L_bend            (gBendRatio ∈ (0,1))
//     so g_eff > 1 always — termination stays guaranteed — and each level moves
//     g_eff a fixed FRACTION of the remaining distance to 1 (diminishing, like a
//     half-life). L_bend = 0 leaves g untouched (g_eff = g).
//   • Run length under the shared peg (H, τ_setup), with the active burn-tier T_g:
//         N*(L_bend) = τ_setup + T_g · log_{g_eff}(H)         (LENGTHENS as g_eff→1)
//     This is the one upgrade that moves pacing — it lengthens the run, unlike a
//     power (reach) permanent which re-pegs to +0. At the illustrative g=2, H=4,
//     T_g=6, τ_setup=4 and gBendRatio=0.7:
//         L_bend=0  g_eff=2.00 → 16.0 m     L_bend=1  g_eff=1.70 → 19.7 m
//         L_bend=2  g_eff=1.49 → 24.9 m     L_bend=3  g_eff=1.34 → 32.2 m
//         L_bend=4  g_eff=1.24 → 42.7 m     (asymptote g→1 ⇒ N* → ∞, never reached)
//   • REACH-GATED. Because g is high-leverage (a runaway toward g=1 would balloon
//     run length), each bend level is gated on permanent power: L_bend requires
//     L ≥ L_bend · gBendGateStep. Comparable to the burn-tier gates, so the pace
//     lever tracks the reach that has to clear the board — you can only buy back
//     pace once you have the power to justify it.
//   • Cost is geometric in Fragments: gBendBaseCost · gBendCostRatio^L_bend — a
//     long-term sink for the sublinear prestige currency, priced above the reach
//     permanent (a pace move is worth more than a reach step).
//   • The bend applies through the cycle kernel's FROZEN schedule getter (composed
//     over the active burn-tier schedule in `modules/index.ts`): read at run start
//     and held for the run, so buying a level lands on the NEXT run and the
//     crossing stays closed-form — exactly like a burn-tier switch or the W₀ peg.
