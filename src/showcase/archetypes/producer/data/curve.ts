// ─── Skeleton ───
// The spine's home in `data/`. Producer authors BEAT TIMES and derives its cost
// ratio from them; it does not author a ratio. Everything else in `data/` hangs
// off the four constants at the top of this file.
//
// Nothing here is a costume knob. `./classes.ts` carries the ladder's names.

/**
 * Time to afford the first unit of the opening class, hand-launching only.
 * Authored. Jointly realized by `CLICK_BASE_YIELD`, `classes[0].baseCost` and
 * an assumed launch cadence — see § Balance, coupling 1.
 */
export const OPENING_BEAT_SECONDS = 8;

/** Authored target: what a purchase should cost in wall-clock at `TARGET_BEAT_LEVEL`. */
export const TARGET_BEAT_SECONDS = 60;

/** The level the target beat is authored against. */
export const TARGET_BEAT_LEVEL = 15;

/**
 * DERIVED, not chosen — `m` in `c_i(n) = a_i · m^n`. Recompute it from the
 * three constants above; never edit it directly.
 */
export const COST_RATIO = 1.1548;

/** Cost of a class's zeroth unit, as a factor of the class below it. */
export const CLASS_COST_STEP = 10;

/** Per-unit rate of a class, as a factor of the class below it. */
export const CLASS_RATE_STEP = 8;

/** Cost of the opening class's zeroth unit — the ladder's cost anchor, `a_0`. */
export const OPENING_CLASS_COST = 15;

/** Per-unit rate of the opening class — the ladder's rate anchor, `r_0`. */
export const OPENING_CLASS_RATE = 0.1;

/**
 * The ladder generators. `./classes.ts` writes its values out longhand so the
 * file reads as data; these are the contract those values must satisfy, and
 * what anything sizing against a class (refinement prices, projections) uses
 * rather than re-deriving the formula.
 */
export const classBaseCost = (index: number): number =>
  OPENING_CLASS_COST * CLASS_COST_STEP ** index;

export const classBaseRate = (index: number): number =>
  OPENING_CLASS_RATE * CLASS_RATE_STEP ** index;

/** Mass per hand-launch, before the click refinement chain. */
export const CLICK_BASE_YIELD = 1;

/** The `generation` chain: `(1 + step)^(distinct classes deployed)`. */
export const GENERATION_STEP = 0.05;

/**
 * Longest absence a return replays, in seconds; time away past it is lost.
 * Sized by how long the returning player waits, not by the arc — catch-up
 * blocks the load. See § Balance, the offline window.
 */
export const OFFLINE_WINDOW_SECONDS = 8 * 3600; // replays in ~4.5 s at ~0.55 ms per second (balance/offline-probe.ts § 3)

// ─── Balance ────────────────────────────────────────────────────────────────
// Rate-function bucket: EXPONENTIAL FAMILY under piecewise × modifier-product
// composition (`../IDENTITY.md` § Rate-function spine). This file is the
// closed form's first home; `balance/producer-projection.ts` is the same math
// in runnable form.
//
//   cost of unit n of class i     c_i(n) = a_i · m^n
//   purchases affordable on C     N(C)   = log_m( C(m−1)/a + 1 ) − 1
//   beat time at level n          T(n)   = T_1 · m^(n−1)
//
// ── The one derived number ──────────────────────────────────────────────────
// `pacing.mdx` § Targeting a beat time directly inverts the ladder, so the
// authored inputs are beat times a designer can actually reason about:
//
//   m = ( T_n / T_1 )^(1/(n−1))
//     = ( 60 / 8 )^(1/14)
//     = 7.5^0.0714286
//     = 1.15480
//
// CONVERGENCE RECEIPT, not a lift. The cut port took Cookie Clicker's 1.15
// verbatim; this reproduces it to 0.3% from an 8-second opener and a
// mid-Flow beat at level 15. The corpus constant turns out to ENCODE that
// pair, which is why it survived a decade of copying. Re-tune target: change
// a beat time, recompute `m`, never the reverse.
//
// Doubling time: d = ln2 / ln(m) = 0.6931 / 0.1439 = 4.82 purchases.
//
// ── Flow-channel map — ISOLATED LADDER, not felt cadence ────────────────────
// `pacing.mdx` § What beat time should I target names the bands; T(n) crosses
// them at these levels (T_1 = 8s, m = 1.1548):
//
//   n  1–10   Arousal      ( <30s )   T(10) =  29s
//   n 11–19   FLOW         (30s–2m)   T(15) =  60s  ← the authored target
//   n 20–26   Flow-upper   ( 2–5m )   T(20) = 123s
//   n 27+     Boredom      ( 5–15m )  T(27) = 337s
//
// READ THIS AS COST ESCALATION MEASURED IN SECONDS OF A FIXED RATE, which is
// what `T(n) = T_1 · m^(n−1)` is: it holds income constant across the
// purchases it spans. That makes it the right instrument for CHOOSING `m` —
// two candidate ratios are compared on one axis — and the wrong one for
// predicting where the player actually sits.
//
// In a producer, income is not constant: the thing you buy raises the rate.
// Realized beat is `a·m^n / (n · r · Π μ)`, and both the `n` and the modifier
// product flatten it by orders of magnitude. Measured on the first arc
// walkthrough, an 8h run ends holding 152 Seeds — where the isolated curve
// would price beat 152 at ~2×10^10 s, the realized average is ~190 s. The
// isolated reading is off by eight orders of magnitude as a predictor of felt
// cadence, and correctly sized `m` regardless.
//
// FALSIFIED by that same run: this file previously predicted that a class must
// hand off before its ~27th unit or the player falls into Boredom. It does not.
// Measured final depths under the shipping dispatcher run
// 152/136/120/104/88/73/57/41 across the ladder — every class far past 27, none
// of it Boredom, because income climbs with the purchases. The prediction was
// the isolated curve mistaken for the realized one.
//
// What remains true, and is the whole reason the boundary is drawn where it is:
// realized depth falls out of the ALLOCATION RULE, the combinatorial-selection
// edge the spine declares (`../IDENTITY.md` § Where the closed form stops). It
// is measured, never authored, and a fork that pins it as a constant has
// mis-read the spine.
//
// ── The offline window ──────────────────────────────────────────────────────
// An absence is a time-base map, not a rate term (`../IDENTITY.md` § Offline is
// a time-base map): catch-up replays the absence through the live loop, so the
// arc in sim time is untouched. The window is therefore not a pacing number at
// all. It is a WAIT BUDGET — catch-up runs before the game screen appears, at a
// measured ~0.55 ms per replayed second, so the window prices the longest load
// a returning player sits through:
//
//   window = wait budget / replay cost  =  ~4.5 s / ~0.55 ms  ≈  8 h
//
// Eight hours covers a night away. The engine's own default (three days) held
// the load for ~40 s on the same probe. The replay cost is machine- and fleet-dependent;
// `balance/offline-probe.ts` § 3 re-measures it, and the slow end of the line
// (`../../_docs/producer.md`) is where a longer window — and a longer wait —
// belongs, as a tuning choice rather than a default.
//
// ── Ladder structure ────────────────────────────────────────────────────────
// Each class costs ×10 and produces ×8 of the one below, so cost-per-unit-rate
// decays by 10/8 = 1.25 per class; Shell's zeroth unit is 1.25^7 = 4.77× less
// efficient than Seed's. That is the point and it matches the corpus (Cookie
// Clicker's Factory is ~3.3× worse than its Cursor across five tiers): a later
// class is never bought because it is intrinsically better, but because the
// class below has climbed its own geometric ladder past it. The whole
// payback dynamic lives in that gap.
//
// ── Couplings ───────────────────────────────────────────────────────────────
// 1. OPENING_BEAT_SECONDS is not independently settable. It is realized by
//    `CLICK_BASE_YIELD` (1) × an assumed cadence (~2 launches/s) against
//    `classes[0].baseCost` (15) → 15 launches ≈ 7.5s. Move any of the three
//    and the opening beat moves; `m` then has to be re-derived because T_1 is
//    its denominator.
// 2. `TARGET_BEAT_LEVEL` and `TARGET_BEAT_SECONDS` set `m` TOGETHER. Raising
//    the level while holding the beat flattens the curve; both change the
//    channel map above.
// 3. `CLASS_COST_STEP / CLASS_RATE_STEP` is the only thing setting how far a
//    class outlives the class above it. Changing either without the other
//    silently moves every handoff depth, and no test reds.
// 4. `GENERATION_STEP` compounds over 8 classes to (1.05)^8 = 1.48× at full
//    breadth — deliberately the smallest of the four chains, so breadth is
//    worth something without competing with depth. Provisional; sized against
//    the other three chains in the balance pass.
