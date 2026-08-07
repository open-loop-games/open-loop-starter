// ─── Skeleton ───
// Blank-game balance data — the pure-config form of the spine (see
// `.claude/rules/archetype-authoring.md` § Balance — where each surface lands,
// and `../IDENTITY.md`).
//
// This is a DELETE-OR-RESHAPE example, the config counterpart to
// `sim/example.test.ts`: the single most neutral mechanic an incremental can
// have — one tracked number rising at a fixed rate. It exists so a clean fork
// inherits the balance scaffold already wired and green; swap
// `ratePerSecond` (and this whole file) for your own economy's constants.
//
// Perturbable values are wrapped in `tunable()` at their module reader sites
// (`modules/core.ts`), keyed in `modules/tuning.ts` — the one perturbation
// path. There is no parallel `data/balance.ts` override file.

export interface GameBalance {
  /** Units of `count` accrued per game-second. The one perturbable constant. */
  ratePerSecond: number;
  /**
   * Accrual multiplier while the `assisted` automation tier is unlocked AND the
   * player toggle is on. `1` everywhere else, so a locked ladder leaves the
   * linear spine exactly as written.
   */
  autoBoostMultiplier: number;
}

export const GAME_BALANCE: GameBalance = {
  ratePerSecond: 1,
  autoBoostMultiplier: 2,
};

// ─── Balance ───
// Rate-function bucket: LINEAR ACCUMULATION — the trivial base case. Every
// archetype replaces this with its own spine (geometric cost-scaling,
// saturating capacity, log-frontier, phase-alternation, …); the blank base
// carries the simplest one so the spine → projection → probe pipeline is
// demonstrated end-to-end without committing the fork to any archetype shape.
//
// Closed form (the whole spine — see `balance/game-projection.ts`):
//     count(t) = ratePerSecond · t
//
// Gated automation makes that piecewise. With the `assisted` tier unlocked at
// time `tU` and the toggle on, accrual runs at `ratePerSecond ·
// autoBoostMultiplier` thereafter:
//     count(t) = ratePerSecond · (t + autoBoostMultiplier · max(0, t − tU))
// The blank base ships the ladder LOCKED, so `tU = ∞` and the linear form
// above is the whole story until a fork unlocks it. That is the point of
// carrying the example: a tier gate is a balance change, and the projection
// has to grow the second branch when you open it.
//
// One design number to author: `ratePerSecond`. The projection predicts
// `count(t)` on paper; the probe (`balance/game-probe.ts`) drives the shipping
// module on the real engine and prints the drift against it. When you give the game a real economy,
// this section carries the closed-form expressions that justify each constant
// before it is measured, each naming its coupling and its re-tune target.
