// ─── Skeleton ───
// Defense-Command concrete lens for Cycler — the realization the abstract spine
// (build.ts D_max / threat.ts per-time burn) concretizes INTO (IDENTITY § Cycler's
// realization). This file is the Lane-1 home for the concrete-spine numbers: the
// shared placement grid split into forward/back cells, the Lance clear-rate C that
// saturates on forward-cell fill, the MW economy that funds firing + repair, the
// exogenous salvo schedule, and the line-HP buffer that adds the Δ_wall tail.
//
// TRANSITIONAL: the current shipped modules still run on the abstract per-time
// spine (build.ts / threat.ts). This lens is the forward math the concretization
// wiring leaves (studio/open-loop-starter#21 leaves 2–4) fold those modules onto;
// `balance/cycler-projection.ts` reads it on paper NOW (the capture test, math
// before wiring). Where a term re-reads an abstract constant with a new meaning it
// says so — `salvoBase`/`headroom` here supersede the per-time `escalationBase`/
// `headroom` in threat.ts, which stay untouched until leaf 4 reconciles them.
//
// The load-bearing spine is unchanged (studio/open-loop-starter#6): saturating
// capacity vs an exogenous escalating burn, run length LOGARITHMIC in capacity,
// pegged so it is directly authored. The realization only re-indexes it by WAVE and
// adds a bounded Δ_wall tail — see the Balance lens below and IDENTITY § Cycler's
// realization for the full derivation.

export interface DefenseBalance {
  /** Forward cells B_f — the finite, salvo-ranged real estate Lances must occupy. Finite → C saturates (forward-cell fill). */
  forwardCells: number;
  /** Back cells B_b — safe reactor-only cells. forwardCells + backCells = build.boardCells (the one shared grid). */
  backCells: number;
  /** ι — warhead-units a single Lance clears per salvo, before adjacency (Relays) and permanent power (·producerUpgradeRatio^L). */
  lanceIntercept: number;
  /** ρ — MW a single Reactor yields per STANDBY, before adjacency and permanent power. The economy's source. */
  reactorOutput: number;
  /** δ — MW a Lance draws to FIRE during INBOUND. The within-run economic sink that makes Lances cut the economy. */
  lanceDraw: number;
  /** g per WAVE — the salvo grows ·salvoBase each wave: W_N = W₀·salvoBase^N. Supersedes threat.escalationBase (per-time) for the concrete spine. */
  salvoBase: number;
  /** H = C/W₀ under the peg — sets the crossing at log_g(H) waves. Supersedes threat.headroom (re-sized for the per-wave g). */
  headroom: number;
  /** L_HP — the defended line's HP buffer. Absorbs leak-through; its ratio to C sizes the Δ_wall tail (bounded, log in L_HP/C). */
  lineHP: number;
  /** STANDBY (build/calm) seconds per wave — the τ_setup grace where the board rebuilds and the line repairs. */
  standbySeconds: number;
  /** INBOUND (defend) seconds per wave — the salvo window where build locks and Lances fire. */
  inboundSeconds: number;
}

export const DEFENSE_BALANCE: DefenseBalance = {
  forwardCells: 6,
  backCells: 10,
  lanceIntercept: 40,
  reactorOutput: 20,
  lanceDraw: 30,
  salvoBase: 1.6,
  headroom: 16,
  lineHP: 500,
  standbySeconds: 90,
  inboundSeconds: 30,
};

// ─── Balance ───
// The concrete-spine closed form (rate-function pass, 2026-07; IDENTITY § Cycler's
// realization). Predicted by `balance/cycler-projection.ts`, verified later by a
// Lane-3 probe (studio/open-loop-starter#21 leaf 3). SAME log law as the abstract
// spine, re-indexed by wave, plus a bounded tail:
//
//   clear-rate  C     = forwardCells · lanceIntercept · adjacency · producerUpgradeRatio^L
//                       (SATURATED ceiling = all forward cells Lanced; finite B_f is the fill cap)
//   salvo N     W_N   = W₀ · salvoBase^N                       (exogenous per-wave schedule)
//   the peg     W₀    = C / H                                  (tracks the saturated ceiling)
//   crossing          W_N = C  ⇒  N = log_g(H)                 (DECOUPLED: allocation-/power-invariant)
//   line buffer       per wave absorbs max(0, W_N − C); repaired from MW surplus in STANDBY
//   run length  N*_waves = log_g(H) + Δ_wall                   (waves; ×(standby+inbound) → minutes)
//
//   • THE PEG, unchanged. W₀ tracks the permanent saturated C, frozen at Redeploy
//     (like the abstract W₀ = D_max/H). So the CROSSING is log_g(H) waves — a
//     directly-authored number, invariant to how many Lances vs Reactors fill the
//     forward cells and to permanent power. Power/allocation buy REACH (absolute C →
//     currency) and Δ_wall (via MW surplus → repair), never the base crossing. At
//     H=16, g=1.6: log_1.6(16) = 5.9 → the salvo overtakes C on wave 6.
//   • Δ_wall IS BOUNDED AND LOGARITHMIC. Past the crossing, leak = C·(g^j − 1) grows
//     geometrically, so each extra survived wave costs geometrically more line HP:
//     Δ_wall ≈ log_g(L_HP·(g−1)/(C·g)) — a short tail (≈2 waves at the shipped
//     constants) the player nudges by routing MW surplus to repair. It CANNOT be
//     pumped to survive forever; this is what keeps the terminating pressure
//     exogenous (the salvo), not a repair race.
//   • THE STRATEGIC TRIANGLE on one MW pool. Each forward cell is a Lance (raises C;
//     draws lanceDraw MW to fire; produces nothing) or a Reactor (raises MW output).
//     Back cells are Reactors. Relays (adjacency) boost BOTH — the bridge. The
//     allocation optimum is interior: enough Lances for a high C ceiling (reach),
//     enough Reactors to fund firing + repair (Δ_wall). `cycler-projection.ts`
//     § allocation sweeps forwardCells to show it. Grounded in multiverse-hr #17's
//     one-pool discipline; absolute calibration (ι, ρ, δ, L_HP) is a Lane-3 probe.
//   • RUN LENGTH IN MINUTES. N*_waves waves × (standbySeconds + inboundSeconds).
//     At H=16, g=1.6, Δ_wall≈2 → ~8 waves × 2 min = ~16 min, inside CADENCE's
//     [12,20] band. Move run length by H (waves-to-crossing) or the salvo posture g
//     (per-wave steepness), never by C — under the peg C is pure reach. Δ_wall (via
//     L_HP / repair) sizes only the tail. The wave-cycle time converts the authored
//     wave count into the felt session length; it is costume, re-measured per fork.
