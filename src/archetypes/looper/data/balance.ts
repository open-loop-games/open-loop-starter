import type { LooperBalance } from './types';

// Vanilla canonical magnitudes. Anchored to `idle-loops-ng` — the live
// engine-ported vanilla idle-loops port — over `reference-code/`.

export const LOOPER_BALANCE: LooperBalance = {
  /** Vanilla canonical: 250 ticks (~12.5 sim-seconds at 20 TPS). */
  initialMana: 250,
  /** Vanilla canonical: cost = base × (weight / (1 + level / costDivisor)). */
  costDivisor: 100,
  /**
   * Vanilla canonical: 1% of every Level XP gain accrues to Talent XP.
   * `idle-loops-ng/src/modules/stats.ts` applies this in the stat-XP path.
   */
  talentAccrualRatio: 0.01,
  /** Demo always ships with reset enabled. */
  loopResetEnabled: true,
};
