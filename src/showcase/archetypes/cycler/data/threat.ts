// ─── Skeleton ───
// Phase-B (pressure) constants for Cycler — the exogenous operating burn and the
// difficulty surface it defines.
//
// SUPERSEDED AND UNWIRED. No module imports this file. The per-TIME burn below
// was reindexed to a per-WAVE salvo in `data/defense.ts` (`SALVO_POSTURES`,
// `salvoBase`), which is what the kernel actually reads; `balance/cycler-
// projection.ts` says the same. What survives here is the derivation of the
// corrected spine, kept because the reasoning is load-bearing and documented
// nowhere else — not because anything runs on it. Do not tune these values
// expecting an effect, and do not add a `tunable()` binding: a tunable nothing
// reads is worse than a plain constant, because it looks live. The corrected spine (multiverse-hr #17, Increlution drain-to-death
// shape): the pressure is an escalating burn that debits the Fragments amount on a
// time/cycle schedule and must be outpaced by the saturated capacity D_max
// (`data/build.ts`). It is EXOGENOUS and time-driven — never derived from
// within-run state — which is exactly what guarantees termination and keeps the
// crossing closed-form.

export interface ThreatBalance {
  /** Headroom H = D_max / W₀ under the peg — the DIFFICULTY constant; sets run length directly. */
  headroom: number;
  /** Burn escalation base g — the burn ×g every escalationTimescale. The PACE constant (curve-bending). */
  escalationBase: number;
  /** Escalation timescale T_g (minutes): the burn multiplies by g every T_g. */
  escalationTimescale: number;
  /** Setup grace τ_setup (minutes): the board-rebuild window before the burn bites. */
  setupGrace: number;
}

export const THREAT_BALANCE: ThreatBalance = {
  headroom: 4,
  escalationBase: 2,
  escalationTimescale: 6,
  setupGrace: 4,
};

// ─── Balance ───
// Tuned by `balance/cycler-projection.ts` (§ pegged run length) toward: an
// ~16-minute authored run at the illustrative constants.
// Closed-form skeleton (rate-function pass, 2026-07; corrected against
// multiverse-hr #17 — this RETIRES the earlier μ = g/d model):
//   • The burn is an exogenous time schedule W(t) = W₀ · g^(t/T_g). Capacity
//     saturates to D_max, so the run ends when the burn crosses the ceiling:
//         N* = τ_setup + T_g · log_g( D_max / W₀ )       (LOGARITHMIC in capacity).
//     This is Increlution's t ≈ T·log_g(M): run length is log in permanent power,
//     not a geometric μ = g/d crossing (that described only the early rising ramp).
//   • THE PEG. W₀ is not fixed — it tracks lifetime power, W₀ = D_max / H, so
//     D_max/W₀ = H always and N* = τ_setup + T_g · log_g(H): CONSTANT across the
//     arc, and run length is a DIRECTLY AUTHORED number (pick H). The peg
//     re-baselines only at prestige (see `data/prestige.ts`), exactly like a
//     content-rung multiplier — so within a run the burn stays exogenous and the
//     algebra stays closed. (A burn coupled to within-run state — payroll ∝ live
//     headcount — would fall to optimal-stopping, composition.mdx § Sum. Don't.)
//   • The whole difficulty surface is (H, g). H is the difficulty/run-length
//     constant; g is the pace constant and the highest-leverage one (attacking the
//     escalation base bends the curve — Increlution Part 3). Capacity (D_max)
//     upgrades re-peg and do NOT move run length — put a reach threshold on a
//     g-bender permanent, never on a power one.
//   Illustrative H=4, g=2, T_g=6, τ_setup=4 → N* = 4 + 6·log₂4 = 16 min. Grounding
//   reference (WIP, un-calibrated, multiverse-hr drain-projection.ts): H=8, g=2,
//   T_g=15, τ_setup=10. Absolute calibration is a probe measurement (multiverse-hr #17).

// ─── Skeleton (burn tiers) ───
// The escalation-content ladder (`addBurnTier`, IDENTITY § Growth ports): a
// reach-locked sequence of pressure presets, each authoring its own (g, T_g) — the
// PACE surface. THREAT_BALANCE above is the base burn; a tier overrides only g and
// T_g (H and τ_setup stay shared, so the peg is one constant across the whole ladder).
// Deeper tiers raise g — a steeper escalation, a shorter/sharper run (Increlution
// Part 3: attacking the escalation base has the highest leverage). Advancing is a
// deliberate, reach-locked step; it is what the later `addUpgrade` g-bender pushes
// back on. The burn schedule freezes into a run at its start (like the W₀ peg), so
// a tier switch applies to the NEXT run, never mid-run — the crossing stays closed-
// form. Reach threshold = permanent power level L (the prestige currency's sink), so the
// pace surface can't outrun the board-fill/power that has to clear it.

export interface BurnTier {
  /** Player-facing tier name (costume). */
  label: string;
  /** Burn escalation base g for this tier — steeper ⇒ shorter, sharper run. */
  escalationBase: number;
  /** Escalation timescale T_g (minutes) for this tier. */
  escalationTimescale: number;
  /** Reach threshold: the tier unlocks once permanent power level L ≥ this. Tier 0 = 0. */
  unlockPowerLevel: number;
}

// Tier 0 mirrors THREAT_BALANCE (the base burn) so the shipped default run is
// unchanged; deeper tiers step g up under a widening reach threshold.
export const BURN_TIERS: readonly BurnTier[] = [
  {
    label: 'Standard',
    escalationBase: THREAT_BALANCE.escalationBase, // g = 2
    escalationTimescale: THREAT_BALANCE.escalationTimescale, // T_g = 6
    unlockPowerLevel: 0,
  },
  { label: 'Accelerated', escalationBase: 3, escalationTimescale: 6, unlockPowerLevel: 2 },
  { label: 'Cascade', escalationBase: 4, escalationTimescale: 6, unlockPowerLevel: 4 },
  { label: 'Collapse', escalationBase: 6, escalationTimescale: 6, unlockPowerLevel: 6 },
];

// ─── Balance (burn tiers) ───
// The pace surface, closed-form (rate-function pass, 2026-07). Each tier's authored
// run length under the SHARED peg (H = headroom, τ_setup = setupGrace):
//     N*(tier) = τ_setup + T_g · log_g(H)          (the base formula, per-tier g/T_g)
// At the illustrative H=4, τ_setup=4, T_g=6:
//     Standard    g=2 → 4 + 6·log₂4 = 16.00 min   (unlock L≥0)
//     Accelerated g=3 → 4 + 6·log₃4 = 11.57 min   (unlock L≥2)
//     Cascade     g=4 → 4 + 6·log₄4 = 10.00 min   (unlock L≥4)
//     Collapse    g=6 → 4 + 6·log₆4 =  8.64 min   (unlock L≥6)
// Two invariants this ladder must preserve (tested in `modules/burn-tier.test.ts`):
//   • WITHIN a tier the peg still holds run length flat across all reach growth
//     (raising power re-pegs to +0 — the decoupling, `data/upgrades.ts`); only
//     CROSSING a tier moves run length, and only under the reach threshold.
//   • The step is discrete and one-way: `advanceTier` is a no-op until reach
//     unlocks the next rung.
// SCOPE: this port models the pace surface ONLY (g, T_g). A harder tier is shorter
// and sharper AND — since production ∫cap dt shrinks with N* — mints LESS sublinear
// currency per run, so on its own it is a pure difficulty step. The INCENTIVE to
// opt in (a per-tier yield multiplier, content or an upgrade unlocked by the tier) is a
// fork's to add, or the `addUpgrade` currency layer's — deliberately out of scope
// here. What this port guarantees is the mechanic: a reach-locked, peg-preserving
// step in the pace surface.
