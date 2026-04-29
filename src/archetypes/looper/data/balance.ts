import type { LooperBalance } from './types';

// ─── Balance ───
// Plain constants — `tunable()` opt-ins are wrapped at consumer sites in
// `modules/`. Solver bisects via `pushScope` against the keys
// `balance/initialMana`, `balance/costDivisor`, `balance/talentAccrualRatio`.
// Magnitudes here are vanilla canonical defaults; the balance leaf may retune
// per beat-window solver convergence but the role-separated shape stays.

export const LOOPER_BALANCE: LooperBalance = {
  /**
   * 1025 ticks (~51 sim-seconds at 20 TPS). Bumped from vanilla canonical
   * 250 by OL-770's rung-1 retune to admit one roam-chunk per first loop
   * under OL-768's (γ) chunked Pass-5: trainers (300 ticks) + 1 roam-chunk
   * (600 ticks) = 900 ticks, leaving 125-tick margin. At the canonical
   * 250 baseline beat-3 (any progressVar level ≥ 1) and beat-6 (talent
   * accrual) never fire under farm-mana-pool because no progression
   * chunk fits the budget. Content-rebalance, not solver output —
   * `balance/initialMana` is verify-only under (γ) due to step-function
   * surface (see `balance/solve.ts:VERIFY_ONLY_BEATS`).
   */
  initialMana: 1025,
  /** Vanilla canonical: cost = base × (weight / (1 + level / 100)). */
  costDivisor: 100,
  /** Vanilla canonical: 1% of every Level XP gain accrues to Talent XP. */
  talentAccrualRatio: 0.01,
  /** Demo always ships with reset enabled. */
  loopResetEnabled: true,
};
