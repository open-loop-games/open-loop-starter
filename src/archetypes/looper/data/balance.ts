import type { LooperBalance } from './types';

// Plain constants — `tunable()` opt-ins are wrapped at consumer sites in
// `modules/`. Vanilla canonical magnitudes; content-magnitude bisection
// reshapes these against beat fire-times.

export const LOOPER_BALANCE: LooperBalance = {
  /** Vanilla canonical: 250 ticks (~12.5 sim-seconds at 20 TPS). */
  initialMana: 250,
  /** Vanilla canonical: cost = base × (weight / (1 + level / costDivisor)). */
  costDivisor: 100,
  /** Vanilla canonical: 1% of every Level XP gain accrues to Talent XP. */
  talentAccrualRatio: 0.01,
  /** Demo always ships with reset enabled. */
  loopResetEnabled: true,
};
