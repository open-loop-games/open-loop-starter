import type { LooperBalance } from './types';

// ─── Balance ───
// Plain constants — `tunable()` opt-ins are wrapped at consumer sites in
// `modules/`. Solver bisects via `pushScope` against the keys
// `balance/initialMana`, `balance/costDivisor`, `balance/talentAccrualRatio`.
// Magnitudes here are vanilla canonical defaults; the balance leaf may retune
// per beat-window solver convergence but the role-separated shape stays.

export const LOOPER_BALANCE: LooperBalance = {
  /**
   * 250 ticks (~12.5 sim-seconds at 20 TPS) — vanilla canonical baseline.
   *
   * The OL-770 rung-1 retune bumped this to 1025 to compensate for
   * planner correctness gaps that made farm-mana-pool's bootstrap
   * impossible: Pass-1 unconditionally pushed trainers regardless of
   * strategy, Pass-3 only emitted full-rewardRatio crack cycles ignoring
   * lifetime `checked` accumulation, and Pass-6 trim dropped progression
   * before trainers — every loop's plan was trainers + maybe-progression,
   * with crack never enqueued. The 1025 baseline papered over the bug.
   *
   * OL-782 fixed the planner (mana-gen-first ordering, closed-form chunk
   * decomposition, trainers as opt-in via `talentOverflowThreshold > 0`,
   * tail explores that bank lifetime checked across loops). With the
   * planner correct, the canonical 250 baseline matches design reality:
   * bootstrap is a multi-loop arc — early loops grow `cache.total` past
   * `rewardRatio`, mid loops bank lifetime checked toward the first
   * boundary crossing, later loops cash in goodTemp cheaply and the
   * flywheel builds.
   */
  initialMana: 250,
  /** Vanilla canonical: cost = base × (weight / (1 + level / 100)). */
  costDivisor: 100,
  /** Vanilla canonical: 1% of every Level XP gain accrues to Talent XP. */
  talentAccrualRatio: 0.01,
  /** Demo always ships with reset enabled. */
  loopResetEnabled: true,
};
