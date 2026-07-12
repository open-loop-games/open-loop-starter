// ─── Skeleton ───
// Phase-B (pressure) constants for Cycler — the exogenous operating burn and the
// difficulty surface it defines. Plain values; the burn module wraps them in
// `tunable()`. The corrected spine (multiverse-hr #17, Increlution drain-to-death
// shape): the pressure is an escalating burn that debits the wallet on a
// time/cycle schedule and must be outpaced by the saturated capacity D_max
// (`data/build.ts`). It is EXOGENOUS and time-driven — never derived from
// within-run state — which is exactly what guarantees termination and keeps the
// crossing closed-form.

export interface ThreatBalance {
  /** Headroom H = D_max / W₀ under the peg — the DIFFICULTY lever; sets run length directly. */
  headroom: number;
  /** Burn escalation base g — the burn ×g every escalationTimescale. The PACE lever (curve-bending). */
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
//     content-tier multiplier — so within a run the burn stays exogenous and the
//     algebra stays closed. (A burn coupled to within-run state — payroll ∝ live
//     headcount — would fall to optimal-stopping, composition.mdx § Sum. Don't.)
//   • The whole difficulty surface is (H, g). H is the difficulty/run-length
//     lever; g is the pace lever and the highest-leverage knob (attacking the
//     escalation base bends the curve — Increlution Part 3). Capacity (D_max)
//     upgrades re-peg and do NOT move run length — gate a g-bender permanent,
//     never a power one.
//   Illustrative H=4, g=2, T_g=6, τ_setup=4 → N* = 4 + 6·log₂4 = 16 min. Grounding
//   reference (WIP, un-calibrated, multiverse-hr drain-projection.ts): H=8, g=2,
//   T_g=15, τ_setup=10. Absolute calibration is a Lane-2 probe (multiverse-hr #17).
