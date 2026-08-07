// ─── Skeleton ───
// The economy half of the RTS macro loop — the guns-versus-butter split the
// spine is built on (`../IDENTITY.md` § Rate-function spine). A faction owns
// `workers`, workers produce supply, and supply buys either more workers
// (compounding) or army (consumed). Pure config; `../modules/economy.ts` reads
// it at construction.

export interface EconomyBalance {
  /** `E₀` — workers a faction opens with. Sets the whole curve's scale. */
  startingWorkers: number;
  /** `ρ` — supply per worker per game-second. */
  incomePerWorker: number;
  /** `c` — supply cost of one worker. Flat: see § Balance on why not scaling. */
  workerCost: number;
  /** Ceiling on owned workers. Structural, not a curve knob — see § Balance. */
  maxWorkers: number;
}

export const ECONOMY_BALANCE: EconomyBalance = {
  startingWorkers: 4,
  incomePerWorker: 2.5,
  workerCost: 40,
  maxWorkers: 40,
};

/** `r = ρ/c` — the economy's growth constant, per game-second. Derived, never
 *  authored: it is what `φ` multiplies in the closed form below. */
export const GROWTH_CONSTANT = ECONOMY_BALANCE.incomePerWorker / ECONOMY_BALANCE.workerCost;

// ─── Balance ────────────────────────────────────────────────────────────────
// Rate-function bucket: EXPONENTIAL FAMILY — guns-versus-butter allocation
// (`../IDENTITY.md` § Rate-function spine; `incremental-math/…/rate-functions/
// exponential`). A faction directs a fraction `φ` of income into workers and
// `1 − φ` into army.
//
//   income(t)  = ρ · E(t)                            supply per second
//   dE/dt      = φ · ρ · E / c  =  φ · r · E         with r = ρ/c
//   E(t)       = E₀ · e^(φ · r · t)                  economy, compounding
//   Aˢ(t)      = ((1−φ)/φ) · c · E₀ · (e^(φ·r·t) − 1)   army SUPPLY spent by t
//   A(t)       = Aˢ(t) / unitCost                    army UNITS fielded by t
//
// `Aˢ` is in supply and carries the `c` factor; `IDENTITY.md` states the same
// relation in economy-equivalents (units of `c·E₀`), which is the same curve
// read on a different axis. Divide by `TROOPER.cost` (`./tactical.ts`) for units.
//
// At φ = 0 the economy is flat and A grows linearly at ρ·E₀/unitCost — the
// degenerate case, and what shipped before this file existed.
//
// ─── Why these four numbers ───
//
// `r = ρ/c = 0.0625/s` is the load-bearing one: it sets how fast an investment
// decision pays back, and everything else is scale. At φ = 1 the economy
// doubles every ln2/r ≈ 11s; at φ = 0.5 every ~22s. Those are deliberately
// fast against a match that runs minutes — an RTS opening has to resolve its
// split inside the first engagement or the decision is not a decision, it is a
// preamble. Re-tune `r` to move the whole game's tempo; re-tune `E₀` to move
// only the opening.
//
// `c / (ρ · unitCost)`: a worker costs 4 troopers and repays its own cost in
// c/ρ = 16s. A faction that buys one worker instead of four troopers is down
// four troopers for sixteen seconds and ahead forever after — that is the
// tension the archetype is made of, and it is why `c` is FLAT rather than
// cost-scaling. Cost scaling would make the split self-limiting, and the point
// is that over-investment must be punished by the *opponent*, not by an
// arithmetic wall. Coupling: raising `c` without raising `ρ` lengthens payback
// and pushes every persona toward army.
//
// `maxWorkers` is a sim guard, not pacing — unbounded exponential growth in a
// match with no clock would run the field out of memory before the base fell.
// It sits far above where any viable `φ` lands inside the time limit; a probe
// that reports factions pinned at the cap is reporting that the cap became
// balance, which is a defect.
//
// ─── Coupling: investment must withhold ───
//
// `c > unitCost` makes a worker a LUMP against a continuous income stream, and
// that is the whole reason `modules/automation.ts` reserves the worker price
// before committing its remainder to army. A policy that spends what is left
// each slot never banks `c`, so income loses the race to its own spending and
// `φ` silently realizes as 0 no matter what a persona asked for — the symptom
// is a seat whose `workers` never leaves `startingWorkers`.
//
// The constraint is `c > unitCost`, not the current 4× ratio. Drop `c` below
// `unitCost` and the reserve becomes a no-op that costs nothing; raise the
// ratio and the reserve withholds a bigger share of each decision slot, which
// slows the army *more* than `φ` alone predicts. The closed form above assumes
// continuous reinvestment and so does not see this at all — it is a discrete
// artifact, and it is why the projection is a bound rather than a prediction.
