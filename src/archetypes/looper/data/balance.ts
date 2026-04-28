import type { LooperBalance } from './types';

// ─── Balance ───
// Plain constants — `tunable()` opt-ins are wrapped at consumer sites in
// `modules/`. Solver bisects against these via `pushScope` against the keys
// `balance/timeResourcePoolBase`, `balance/skillLevelDivisor`,
// `balance/instinctXpRatio`, `balance/retentionDivisor`,
// `balance/retentionExponent`. Placeholder numbers; OL-737 re-pins after
// solver convergence against beat windows.

export const LOOPER_BALANCE: LooperBalance = {
  /** idle-loops-ng baseline; OL-737 may bisect for beat-2 window. */
  timeResourcePoolBase: 4000,
  /** cost = baseCost / (1 + genLevel / 100). */
  skillLevelDivisor: 100,
  /** 1% of gen XP carries to instinct (PK / incloneution baseline). */
  instinctXpRatio: 0.01,
  /** Retention multiplier shape: 1 + (instinct / 30) ^ 0.8. */
  retentionDivisor: 30,
  retentionExponent: 0.8,
  /** Demo always ships with reset enabled. */
  loopResetEnabled: true,
};
