// ─── Skeleton ───
// Time-Systems constants for Cycler — the rhythm the build/defend alternation runs
// on, and how hard the phase boundary is. Plain values. Run length is DERIVED from
// the wave-indexed peg (N*_waves = log_g(H) + Δ_wall, converted to minutes by the
// STANDBY+INBOUND wave-cycle time; see `data/defense.ts`); this file records the
// target band N* is solved toward and the phase-boundary style.

export interface CadenceBalance {
  /** Target run-length band (minutes) the headroom H is solved toward. Derived, not a source of truth. */
  runLengthTargetMinutes: readonly [number, number];
  /**
   * Phase-boundary hardness:
   *   'soft' — the burn runs continuously and escalates; the "build phase" is the
   *            comfortable pre-bite window (τ_setup). Multiverse-hr / Increlution.
   *   'hard' — discrete alternation: a full calm build phase, then a distinct
   *            pressure phase (day/night). Thronefall / Kingdom.
   * Same pegged-saturation math either way — this only shapes the felt rhythm.
   */
  phaseBoundary: 'soft' | 'hard';
}

export const CADENCE_BALANCE: CadenceBalance = {
  runLengthTargetMinutes: [12, 20],
  phaseBoundary: 'hard',
};

// ─── Balance ───
// Tuned by `balance/cycler-projection.ts` (§ pegged run length) and
// `balance/cycle-probe.ts` (measured, printed) toward: a run inside the target band at
// the shipped headroom.
// Closed-form skeleton (rate-function pass, 2026-07): session length IS the run
// length under the peg, N*_waves = log_g(H) + Δ_wall waves, ×(standbySeconds +
// inboundSeconds) → minutes (see `data/defense.ts`). At the shipped H=16, g=1.6,
// Δ_wall≈2, 2 min/wave → ~8 waves × 2 = ~16 min, inside [12,20]. To move run length,
// move H (waves-to-crossing) or the salvo posture g; do NOT reach for capacity —
// under the peg it doesn't touch pacing. The band is re-measured after any change to
// H, g, the wave-cycle time, or Δ_wall. Cycler's realization commits the HARD
// boundary (discrete STANDBY↔INBOUND alternation, Thronefall/Kingdom day/night); a
// fork wanting a continuous soft burn sets 'soft' and keeps the same spine. Identity
// guard (multiverse-hr concept): escalation must DRIVE rearrangement, not compress it
// out — the late run stays a placement puzzle, not a survival reflex.
