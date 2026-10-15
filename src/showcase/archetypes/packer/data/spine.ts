// ─── Skeleton ───
// The spine's home in `data/`. Every economy number in Hardpoint derives from the named
// anchors below, in plain arithmetic with no engine. Modules read these values at their
// `tunable()` reader sites and never re-author them; the projection
// (`../balance/packer-projection.ts`) prints them, and the arc probe contradicts them.
//
// Piecewise closed form, three regimes:
//  - the opening fit: one bare Pulse Cannon grows to a fully fitted corvette core, with
//    income exponential between the two closed-form rates;
//  - the main arc: twelve authored beats on a geometric gap ladder, with income
//    exponential from the opening rate toward the closed-form full-hull rate;
//  - a step at the Railgun beat, where rail adoption multiplies income at once.
// Every gate and price is read off the scheduled income or cumulative curve at its beat,
// so a beat lands on schedule only if the content delivers the growth the reference
// packing claims.

import { HULL_MAP } from './hull';

// ─── Balance ───
// === ANCHORS ===

/** Pulse Cannon damage per second — the unit of the whole economy. */
export const PULSE_DPS = 1;
/** Salvage recovered per point of damage dealt. Unit conversion, held at 1. */
export const SALVAGE_PER_DAMAGE = 1;
/** Seconds of one bare cannon's output that buy the next cannon. */
export const FIRST_BEAT_S = 10;
/** Copies of one piece type after which its price has doubled (pacing: d = ln2/ln m). */
export const DOUBLING_PURCHASES = 5;
/** Weapons a booster must touch to be worth the cell a cannon would have used. */
export const LINK_BREAK_EVEN = 2;
/** Most weapons an orthogonal or diagonal ring can touch. Structural. */
export const MAX_RING_LINKS = 4;
/** Pulse copies at which a Railgun's dps-per-cell matches what the cannon ladder charges. */
export const RAIL_PARITY_COPIES = 15;
/** First and last gap of the main-arc beat ladder (flow band → flow-upper band). */
export const FIRST_GAP_S = 40;
export const LAST_GAP_S = 150;
/** Weapons an average booster touches, for pricing the Coolant Manifold's gain. */
export const COOLANT_REF_LINKS = 2.5;
/** Seconds a newly unlocked piece type's first copy takes to pay back at per-cell income. */
export const PIECE_PAYBACK_S = 30;
/** Seconds a refit takes to pay back its own price at its scheduled income. */
export const REFIT_PAYBACK_S = 90;

// Reference packing — what an arrangement of the finished hull reaches. Claims,
// re-checked by every arc-probe run, which prints each beside its measurement.
/** Share of hull cells holding weapons (the rest hold boosters, beacons, coolant). */
export const REF_WEAPON_SHARE = 0.25;
/**
 * Share of weapons that are Railguns on the finished hull. Derived, not fitted: a
 * rail out-fires a cannon eightfold in the same cell, and cells are what the hull
 * rations, so a fitter converts every weapon it can afford to. It cannot be fitted,
 * because it sets the rail price that sets it.
 */
export const REF_RAIL_SHARE = 1;
/**
 * Mean firepower multiplier per weapon (Σ firepower / Σ dps) on the finished hull.
 * Fitted, not derived: the best weapons sit where links and stamps overlap, so the
 * mean of the product runs above the product of the means. Receipt: arc probe, one
 * deterministic run, measured 9.0.
 */
export const REF_WEAPON_MULT = 10;
/** Share of a section's gap earnings that go to plating it; the rest goes to fitting. */
export const SECTION_SHARE = 0.5;

// === STRUCTURE ===

const cellsMarked = (mark: string) =>
  HULL_MAP.join('')
    .split('')
    .filter((c) => c === mark).length;
/** Cells open at the start: the corvette core. */
export const CORE_CELLS = cellsMarked('0');
/** Cells each hull section plates, in section order. */
export const SECTION_CELLS = [1, 2, 3, 4, 5, 6].map((i) => cellsMarked(String(i)));
/** Cells open once every section is plated. */
export const FULL_CELLS = CORE_CELLS + SECTION_CELLS.reduce((a, b) => a + b, 0);

// === DERIVED: prices and strengths ===

/** Per-type price ratio: doubles every DOUBLING_PURCHASES copies. 2^(1/5) ≈ 1.149. */
export const PRICE_RATIO = Math.pow(2, 1 / DOUBLING_PURCHASES);
/** First Pulse Cannon: FIRST_BEAT_S of one cannon's salvage. = 10. */
export const PULSE_COST0 = FIRST_BEAT_S * PULSE_DPS * SALVAGE_PER_DAMAGE;
/** Boost per link: break-even at LINK_BREAK_EVEN links means LINK_BREAK_EVEN · b = 1. = 0.5. */
export const LINK_BOOST = 1 / LINK_BREAK_EVEN;
/**
 * Arc Beacon gain per stamp, same break-even against a boosted weapon. = 0.5.
 * Stamps sum within their family, then multiply the boosted weapon: × (1 + Σ stamps).
 * They sum because a weapon can sit a knight's move from eight beacons, and stamps that
 * multiplied one by one would build one gun ringed by beacons.
 */
export const BEACON_GAIN = 1 / LINK_BREAK_EVEN;
/**
 * Coolant gain on a booster's outgoing links. Break-even: a manifold against
 * LINK_BREAK_EVEN boosters, each touching COOLANT_REF_LINKS weapons, adds one
 * weapon's worth → gain · LINK_BREAK_EVEN · COOLANT_REF_LINKS · LINK_BOOST = 1. = 0.4.
 */
export const COOLANT_GAIN = 1 / (LINK_BREAK_EVEN * COOLANT_REF_LINKS * LINK_BOOST);
/** Capacitor's first copy: priced at its full-ring worth in base cannons (4 · 0.5 · 10). = 20. */
export const CAPACITOR_COST0 = MAX_RING_LINKS * LINK_BOOST * PULSE_COST0;
/** Railgun dps: the cannon ladder's price ratio over RAIL_PARITY_COPIES rungs. 2^3 = 8. */
export const RAIL_DPS = PULSE_DPS * Math.pow(PRICE_RATIO, RAIL_PARITY_COPIES);

// === DERIVED: the opening fit ===

/**
 * The corvette core (3×3) at reference packing: cannons on the corners and centre,
 * capacitors on the edges. Centre touches 4 capacitors, each corner 2:
 * (1 + 4b) + 4(1 + 2b) = 5 + 12b. = 11 at b = 0.5.
 */
export const OPENING_RATE = (5 + 12 * LINK_BOOST) * PULSE_DPS * SALVAGE_PER_DAMAGE;

const geometricSum = (first: number, ratio: number, n: number) =>
  ratio === 1 ? first * n : (first * (Math.pow(ratio, n) - 1)) / (ratio - 1);

/** Salvage the opening fit costs: five cannons and four capacitors up their ladders. */
export const OPENING_SPEND =
  geometricSum(PULSE_COST0, PRICE_RATIO, 5) + geometricSum(CAPACITOR_COST0, PRICE_RATIO, 4);

/**
 * Opening duration under exponential growth 1 → OPENING_RATE while spending
 * OPENING_SPEND: spend = (R1 − R0)/λ, so λ = (R1 − R0)/spend and t = ln(R1/R0)/λ.
 * The first cannon is bought from the starting purse, so R0 = one cannon.
 */
export const OPENING_GROWTH = (OPENING_RATE - PULSE_DPS) / (OPENING_SPEND - PULSE_COST0);
export const OPENING_S = Math.log(OPENING_RATE / PULSE_DPS) / OPENING_GROWTH;

// === DERIVED: the main arc ===

/** The twelve authored beats, in schedule order. Ids match the content that fires them. */
export const BEATS = [
  'unlock:targeting',
  'section:1',
  'section:2',
  'refit:fire-control',
  'unlock:beacon',
  'section:3',
  'unlock:rail',
  'section:4',
  'unlock:coolant',
  'refit:overcharge',
  'section:5',
  'section:6',
] as const;
export type BeatId = (typeof BEATS)[number];

/** Gap growth across the ladder: (LAST/FIRST)^(1/(n−1)). */
export const GAP_RATIO = Math.pow(LAST_GAP_S / FIRST_GAP_S, 1 / (BEATS.length - 1));
/** Main-arc length: the geometric sum of the gaps. */
export const ARC_S = geometricSum(FIRST_GAP_S, GAP_RATIO, BEATS.length);

/** Refit multiplier: one beacon stamp's worth, applied to every weapon at once. */
export const REFIT_MULT = 1 + BEACON_GAIN;
const REFIT_COUNT = BEATS.filter((b) => b.startsWith('refit:')).length;

/**
 * Full hull at reference packing:
 *   weapons · base-dps mix · mean weapon multiplier · refits
 * = FULL_CELLS·REF_WEAPON_SHARE · ((1−ρ)·PULSE_DPS + ρ·RAIL_DPS) · REF_WEAPON_MULT · REFIT_MULT^n
 */
export const FINAL_RATE =
  FULL_CELLS *
  REF_WEAPON_SHARE *
  ((1 - REF_RAIL_SHARE) * PULSE_DPS + REF_RAIL_SHARE * RAIL_DPS) *
  REF_WEAPON_MULT *
  Math.pow(REFIT_MULT, REFIT_COUNT) *
  SALVAGE_PER_DAMAGE;

/**
 * Railguns arrive as a step, not a slope: each is an eight-cannon upgrade of a cell
 * that is already buffed, so adoption multiplies income by the rail mix within a
 * gap or two. Step = (1 − ρ) + ρ · RAIL_DPS / PULSE_DPS. = 8 at ρ = 1.
 */
export const RAIL_STEP = 1 - REF_RAIL_SHARE + (REF_RAIL_SHARE * RAIL_DPS) / PULSE_DPS;

/** Main-arc income growth rate: OPENING_RATE → FINAL_RATE across ARC_S, net of the rail step. */
export const ARC_GROWTH = Math.log(FINAL_RATE / (OPENING_RATE * RAIL_STEP)) / ARC_S;

/** Predicted income (salvage/s) at sim-time t. */
export function predictedIncome(t: number): number {
  if (t <= OPENING_S) return PULSE_DPS * Math.exp(OPENING_GROWTH * t);
  const step = t >= BEAT_TIME['unlock:rail'] ? RAIL_STEP : 1;
  return OPENING_RATE * Math.exp(ARC_GROWTH * (t - OPENING_S)) * step;
}

/** Predicted cumulative salvage earned by sim-time t (the starting purse included). */
export function predictedCumulative(t: number): number {
  const opening = (to: number) =>
    (PULSE_DPS * (Math.exp(OPENING_GROWTH * to) - 1)) / OPENING_GROWTH;
  if (t <= OPENING_S) return PULSE_COST0 + opening(t);
  // ∫ OPENING_RATE·e^{λ(u − t0)} du over [from, to], scaled by the regime's step.
  const arc = (from: number, to: number) =>
    (OPENING_RATE *
      (Math.exp(ARC_GROWTH * (to - OPENING_S)) - Math.exp(ARC_GROWTH * (from - OPENING_S)))) /
    ARC_GROWTH;
  const tRail = BEAT_TIME['unlock:rail'];
  const before = arc(OPENING_S, Math.min(t, tRail));
  const after = t > tRail ? RAIL_STEP * arc(tRail, t) : 0;
  return PULSE_COST0 + opening(OPENING_S) + before + after;
}

/** Scheduled sim-time of each beat: the opening, then the gap ladder. */
export const BEAT_TIME: Record<BeatId, number> = Object.fromEntries(
  BEATS.map((id, i) => [id, OPENING_S + geometricSum(FIRST_GAP_S, GAP_RATIO, i + 1)]),
) as Record<BeatId, number>;

/** Cumulative-salvage gate for an unlock beat: what the schedule says has been earned by then. */
export const unlockGate = (beat: BeatId) => predictedCumulative(BEAT_TIME[beat]);
/**
 * Hull section price: SECTION_SHARE of what the schedule earns between the
 * previous section's beat and this one, so a section lands on its beat rather
 * than whenever a fixed save-up allows.
 */
export const sectionPrice = (beat: BeatId) => {
  const sections = BEATS.filter((b) => b.startsWith('section:'));
  const i = sections.indexOf(beat);
  const from = i <= 0 ? 0 : BEAT_TIME[sections[i - 1]];
  return SECTION_SHARE * (predictedCumulative(BEAT_TIME[beat]) - predictedCumulative(from));
};
/** Hull cells open at a beat: the core plus every section scheduled at or before it. */
export const openCellsAt = (beat: BeatId) =>
  CORE_CELLS +
  BEATS.slice(0, BEATS.indexOf(beat) + 1)
    .filter((b) => b.startsWith('section:'))
    .reduce((n, b) => n + SECTION_CELLS[Number(b.slice('section:'.length)) - 1], 0);
/**
 * First-copy price of a newly unlocked piece type. A booster, beacon or manifold
 * is built to be worth one weapon at break-even (LINK_BREAK_EVEN); a Railgun is
 * worth RAIL_DPS/PULSE_DPS − 1 weapons as an upgrade. One weapon's worth at a beat
 * is income entering the beat ÷ (open cells · REF_WEAPON_SHARE). Price = worth · PIECE_PAYBACK_S.
 */
export const pieceEntryPrice = (beat: BeatId, weaponsWorth: number) =>
  ((weaponsWorth * incomeEntering(beat)) / (openCellsAt(beat) * REF_WEAPON_SHARE)) *
  PIECE_PAYBACK_S;
/** Income the economy has as a beat arrives — before any step the beat itself causes. */
const incomeEntering = (beat: BeatId) => predictedIncome(BEAT_TIME[beat] - 1e-6);
/** A Railgun's worth in weapons, as an upgrade over the cannon it replaces. */
export const RAIL_WORTH = RAIL_DPS / PULSE_DPS - 1;
/** Refit price: pays back in REFIT_PAYBACK_S at scheduled income — income·(m−1)·payback. */
export const refitPrice = (beat: BeatId) =>
  predictedIncome(BEAT_TIME[beat]) * (REFIT_MULT - 1) * REFIT_PAYBACK_S;
/** A refit is shown a little before it is affordable: one gap ahead of its beat. */
export const refitGate = (beat: BeatId) => predictedCumulative(BEAT_TIME[beat] - FIRST_GAP_S);
