// ─── Skeleton ───
// Time-Systems constants for Cycler — the rhythm the build/pressure alternation
// runs on, and how hard the phase boundary is. Plain values. Run length is
// DERIVED from the burn/capacity peg (N* = τ_setup + T_g·log_g(H), see
// `data/threat.ts`); this file records the target band N* is solved toward and
// the phase-boundary style, which is costume/scope, not spine.

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
  phaseBoundary: 'soft',
};

// ─── Balance ───
// Tuned by `balance/cycler-projection.ts` (§ pegged run length) and
// `sim/cadence.probe.test.ts` (measured lock) toward: a run inside the target
// band at the shipped headroom.
// Closed-form skeleton (rate-function pass, 2026-07): session length IS the run
// length under the peg, N* = τ_setup + T_g · log_g(H) (see `data/threat.ts`). At
// the illustrative H=4, g=2, T_g=6, τ_setup=4 → 16 min, inside [12,20]. To move
// run length, move H (or g); do NOT reach for capacity — under the peg it doesn't
// touch pacing. The band is re-measured after any change to H, g, T_g, or τ_setup.
// The soft-boundary default matches the grounded exemplar (multiverse-hr's
// continuous drain); a fork wanting discrete day/night sets 'hard' and keeps the
// same spine. Identity guard (multiverse-hr concept): the burn must DRIVE
// rearrangement, not compress it out — the late run stays a placement puzzle, not
// a survival reflex.
