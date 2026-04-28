import type { LooperBalance } from './types';

// ─── Balance ───
// Plain constants — `tunable()` opt-ins are wrapped at consumer sites in
// `modules/`. Solver bisects via `pushScope` against the keys
// `balance/initialMana`, `balance/costDivisor`, `balance/talentAccrualRatio`.
// Magnitudes here are vanilla canonical defaults; the balance leaf may retune
// per beat-window solver convergence but the role-separated shape stays.

export const LOOPER_BALANCE: LooperBalance = {
  /** Vanilla canonical 250 ticks (~12.5 sim-seconds at engine 20 TPS). */
  initialMana: 250,
  /** Vanilla canonical: cost = base × (weight / (1 + level / 100)). */
  costDivisor: 100,
  /** Vanilla canonical: 1% of every Level XP gain accrues to Talent XP. */
  talentAccrualRatio: 0.01,
  /** Demo always ships with reset enabled. */
  loopResetEnabled: true,
};
