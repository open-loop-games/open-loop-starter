// ─── Skeleton ───
// Prestige (Merge) constants for Cycler — the meta-layer that re-pegs the burn
// and banks currency. Plain values; the prestige module reads them at its reader
// sites. Corrected shape (multiverse-hr #17): prestige is where the peg
// re-baselines. On run-end (the crossing / insolvency) the run PAYS OUT a
// sublinear currency; cumulative currency buys permanents that raise capacity
// D_max; and because the burn re-pegs to the new D_max/H at prestige, run length
// stays authored while REACH climbs. Matched reach, realized as the peg.

export interface PrestigeBalance {
  /** cbrt scale for the primary source (∫ capacity dt): fragments += floor(cbrt(total / scale)). */
  fragmentScalePrimary: number;
  /** cbrt scale for the secondary source (∫ burn dt) — summed independently, not pooled before the cbrt. */
  fragmentScaleSecondary: number;
  /** Merge quorum: the L=0 power price and the minimum bank to raise power (a competent first run pays it). */
  mergeQuorum: number;
}

export const PRESTIGE_BALANCE: PrestigeBalance = {
  fragmentScalePrimary: 2500,
  fragmentScaleSecondary: 5000,
  mergeQuorum: 3,
};

// ─── Balance ───
// Tuned by `balance/cycler-projection.ts` (§ the currency + § the arc) toward:
// run length flat across merges while D_max and banked currency climb; a first
// competent run banks exactly the quorum (a 2-primary + 1-secondary split).
// Closed-form skeleton (rate-function pass, 2026-07; SHAPE grounded in
// multiverse-hr merge.ts — cbrt-per-source, quorum 3, a 2+1 first-merge split):
//   • Currency is a SUBLINEAR (power-law, p=1/3) transform of RUN OUTPUT:
//     fragments = ⌊∛(production/Sp)⌋ + ⌊∛(endurance/Ss)⌋, summed PER SOURCE, not
//     pooled — the cube root is the diminishing-returns transform (power-law.mdx)
//     that keeps late runs' huge output from minting proportionally huge currency.
//     The two run outputs are RUN-LONG ACCUMULATORS (not board snapshots — the
//     mv-hr identity guard): production = ∫ capacity dt (throughput), endurance =
//     ∫ burn dt (pressure weathered). Both ∝ D_max, so currency climbs ∝ ∛D_max
//     across merges — sublinear in the reach it buys.
//   • Scale VALUES are cycler-calibrated, not lifted: mv-hr's S_C=280 / S_I=350
//     were sized to ITS Council-Value / Influence accumulators (~2268 / ~365 at
//     the first merge). Cycler's ∫capacity dt / ∫burn dt accumulators run ~32k /
//     ~15k at L=0, so Sp=2500 / Ss=5000 reproduce the same 2+1 first-merge split
//     (⌊∛(32000/2500)⌋=2, ⌊∛(14984/5000)⌋=1) and quorum-3 affordability. A fork
//     re-sizes both to its own economy's magnitudes (`balance/cycler-projection.ts`).
//   • THE RE-PEG is the whole point. Prestige carries permanent power (raises
//     D_max), and the burn re-baselines W₀ = D_max/H at the Merge boundary. So
//     D_max climbs run-over-run but N* = τ_setup + T_g·log_g(H) stays constant —
//     the "matched reach" shape, now realized as the peg rather than a hand-tuned
//     S = R. Magnitude is exponential in merges; the layer count is its log
//     (log-frontier reading, one level up — Cycler × Scaler).
//   • Run-end PAYS OUT (Fragments bank on the crossing) — it is a Merge bell, not
//     a fail state (Industry-Idle, not Thronefall). This is what lets the exogenous
//     burn guarantee termination without punishing the player: the run always ends,
//     and the ending is always progress. Payout AUTO-BANKS on the crossing; the
//     player spends the banked currency between runs (studio/open-loop-starter#7).
//   • The next power level costs mergeQuorum · powerUpgradeCostRatio^L
//     (`data/upgrades.ts`): the quorum is the L=0 price (paid by the first run),
//     the geometric ratio makes later levels save-across-runs (decelerating
//     prestige). Power permanents buy REACH here, never run length — under the peg
//     raising D_max re-baselines W₀ (see `data/upgrades.ts`); only H and g
//     (threat.ts) move pacing. The BASE power buy lives in the prestige layer (the
//     minimal spend that closes the loop); the later `addUpgrade` port adds a
//     CATALOG on this wallet, including the gated g-bender — the sole pace lever.
