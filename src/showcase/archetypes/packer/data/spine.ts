// ─── Skeleton ───
// The spine's home in `data/`. Every economy number in Hardpoint derives from the named
// anchors below, in plain arithmetic with no engine. Modules read these values at their
// `tunable()` reader sites and never re-author them; the projection
// (`../balance/packer-projection.ts`) prints them, and the arc probe contradicts them.
//
// The board binds income: it is full from about a minute in, so salvage has nowhere to go
// but the next plate, refit or schematic. So income is piecewise constant by board stage,
// the rate the stage's best packing fires at, and the arc composes stage by stage
// (`incremental-math/…/rate-functions/composition.mdx`):
//  - the opening fit: one bare Pulse Cannon grows to a fully fitted corvette core, with
//    income exponential between the two closed-form rates;
//  - each later stage opens with an adoption ramp, the modules its packing adds bought
//    from savings and then from income as it rises (the opening's closed form again), and
//    then saves at the stage's rate until the next beat;
//  - a plate or refit lands when the salvage saved reaches its price, and a schematic
//    when lifetime salvage reaches its gate.
// Prices and gates are solved from that walk so each beat lands on an authored gap ladder.

import { HULL_MAP, PIECES, type PieceId } from './hull';

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
/** First and last gap of the beat ladder (flow band → flow-upper band). */
export const FIRST_GAP_S = 40;
export const LAST_GAP_S = 150;
/** Seconds a newly unlocked piece type's first copy takes to pay back its worth in weapons. */
export const PIECE_PAYBACK_S = 30;
/** Each refit's multiplier on the firepower chain: one beacon stamp's worth, on every weapon. */
export const REFIT_MULT = 1.5;

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

// === DERIVED: strengths ===

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
 * Coolant gain on a booster's outgoing links. Solved, not derived: the smallest gain at
 * which manifolds raise the coolant stage's best packing by one weapon's share of it, on
 * the rail board they arrive into. Receipt: `balance/packing-probe.ts` § coolant.
 */
export const COOLANT_GAIN = 0.8;
/** Capacitor's first copy: priced at its full-ring worth in base cannons (4 · 0.5 · 10). = 20. */
export const CAPACITOR_COST0 = MAX_RING_LINKS * LINK_BOOST * PULSE_COST0;
/** Railgun dps: the cannon ladder's price ratio over RAIL_PARITY_COPIES rungs. 2^3 = 8. */
export const RAIL_DPS = PULSE_DPS * Math.pow(PRICE_RATIO, RAIL_PARITY_COPIES);
/** A Railgun's worth in weapons, as an upgrade over the cannon it replaces. */
export const RAIL_WORTH = RAIL_DPS / PULSE_DPS - 1;

// === DERIVED: the opening fit ===

const geometricSum = (first: number, ratio: number, n: number) =>
  ratio === 1 ? first * n : (first * (Math.pow(ratio, n) - 1)) / (ratio - 1);

/** Salvage for copies `from` … `to − 1` of a ladder whose first copy costs `cost0`. */
export const ladderSpend = (cost0: number, from: number, to: number) =>
  to <= from ? 0 : Math.pow(PRICE_RATIO, from) * geometricSum(cost0, PRICE_RATIO, to - from);

/**
 * Seconds to raise income from `r0` to `r1` by spending `spend` on modules out of that
 * income. Each salvage spent adds (r1 − r0)/spend to the rate, so income grows at
 * λ = (r1 − r0)/spend and takes ln(r1/r0)/λ.
 */
export function adoptionSeconds(r0: number, r1: number, spend: number): number {
  if (r1 <= r0 || spend <= 0) return 0;
  return (Math.log(r1 / r0) * spend) / (r1 - r0);
}

/**
 * The corvette core (3×3) at reference packing: cannons on the corners and centre,
 * capacitors on the edges. Centre touches 4 capacitors, each corner 2:
 * (1 + 4b) + 4(1 + 2b) = 5 + 12b. = 11 at b = 0.5.
 */
export const OPENING_RATE = (5 + 12 * LINK_BOOST) * PULSE_DPS * SALVAGE_PER_DAMAGE;

/** Salvage the opening fit costs: five cannons and four capacitors up their ladders. */
export const OPENING_SPEND = ladderSpend(PULSE_COST0, 0, 5) + ladderSpend(CAPACITOR_COST0, 0, 4);

/** The opening's growth rate. The first cannon is the starting purse, so R0 is one cannon. */
export const OPENING_GROWTH = (OPENING_RATE - PULSE_DPS) / (OPENING_SPEND - PULSE_COST0);
/** Seconds from a cold start to a fully fitted corvette core. */
export const OPENING_S = adoptionSeconds(PULSE_DPS, OPENING_RATE, OPENING_SPEND - PULSE_COST0);

// === DERIVED: the beat ladder ===

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
/** The ladder's length: the geometric sum of the gaps. */
export const ARC_S = geometricSum(FIRST_GAP_S, GAP_RATIO, BEATS.length);

/** Each beat's target time: the opening, then the gap ladder. */
export const BEAT_TIME: Record<BeatId, number> = Object.fromEntries(
  BEATS.map((id, i) => [id, OPENING_S + geometricSum(FIRST_GAP_S, GAP_RATIO, i + 1)]),
) as Record<BeatId, number>;

// === STAGES ===

/** What the board can hold between two beats. */
export interface BoardStage {
  /** the beat that opened the stage; `opening` for the fitted corvette */
  after: BeatId | 'opening';
  /** hull sections plated */
  sections: number;
  cells: number;
  types: readonly PieceId[];
  refits: number;
}

/** Stage 0 is the fitted corvette; stage j is the board after beat j − 1. */
export const STAGES: readonly BoardStage[] = (() => {
  const out: BoardStage[] = [];
  let sections = 0;
  let refits = 0;
  const types: PieceId[] = PIECES.filter((p) => !p.unlock).map((p) => p.id);
  const cells = () => CORE_CELLS + SECTION_CELLS.slice(0, sections).reduce((a, b) => a + b, 0);
  out.push({ after: 'opening', sections, cells: cells(), types: [...types], refits });
  for (const b of BEATS) {
    if (b.startsWith('section:')) sections++;
    else if (b.startsWith('refit:')) refits++;
    else types.push(PIECES.find((p) => p.unlock === b)!.id);
    out.push({ after: b, sections, cells: cells(), types: [...types], refits });
  }
  return out;
})();

/** A stage's best packing: what it fires and the modules it fields. */
export interface StagePacking {
  /** board firepower, dps before the refits */
  rate: number;
  counts: Partial<Record<PieceId, number>>;
}

/**
 * Each stage's best packing, in STAGES order. Claims, measured on the shipping evaluator by
 * `balance/packing-probe.ts`, which prints this table and flags a claim that drifts.
 */
export const STAGE_PACKING: readonly StagePacking[] = [
  { rate: 11, counts: { pulse: 5, capacitor: 4 } },
  { rate: 11, counts: { pulse: 5, capacitor: 4 } },
  { rate: 14, counts: { pulse: 7, capacitor: 4 } },
  { rate: 17.5, counts: { pulse: 10, capacitor: 4 } },
  { rate: 17.5, counts: { pulse: 10, capacitor: 4 } },
  { rate: 25, counts: { beacon: 3, targeting: 3, pulse: 5, capacitor: 3 } },
  { rate: 35.5, counts: { beacon: 5, targeting: 3, capacitor: 5, pulse: 5 } },
  { rate: 284, counts: { beacon: 5, targeting: 3, capacitor: 5, rail: 5 } },
  { rate: 368, counts: { beacon: 7, targeting: 3, capacitor: 5, rail: 7 } },
  { rate: 420.4, counts: { beacon: 7, rail: 6, targeting: 3, coolant: 4, capacitor: 2 } },
  { rate: 420.4, counts: { beacon: 7, rail: 6, targeting: 3, coolant: 4, capacitor: 2 } },
  { rate: 538.4, counts: { beacon: 8, rail: 6, targeting: 6, coolant: 6 } },
  { rate: 568.8, counts: { targeting: 5, rail: 11, beacon: 7, coolant: 4, capacitor: 2 } },
];

// === DERIVED: the stage walk ===

/** One stage as the walk plays it. */
export interface StageWalk {
  stage: BoardStage;
  /** sim-seconds the stage opens and closes; the last closes when its adoption ends */
  from: number;
  to: number;
  /** salvage a second entering the stage, and at its packing once adopted */
  rateIn: number;
  rate: number;
  /** salvage the copies its packing adds cost, the part savings pay, and the ramp's seconds */
  spend: number;
  fromSavings: number;
  adoption: number;
  /** salvage saved when the stage closes, before its beat is paid */
  saved: number;
  /** lifetime salvage when the stage closes */
  cumulative: number;
}

const WORTH: Record<PieceId, number> = {
  pulse: 1,
  capacitor: 1,
  targeting: 1,
  beacon: 1,
  rail: RAIL_WORTH,
  coolant: 1,
};

/**
 * Walk the stages from the fitted corvette, solving each beat's price or gate so it lands
 * on BEAT_TIME:
 * - a new type's first copy costs its worth in weapons × one weapon's income entering its
 *   unlock × PIECE_PAYBACK_S;
 * - a stage opens by buying the copies its packing adds over those owned, from savings
 *   first and then out of income as it rises (`adoptionSeconds`);
 * - it then saves at its rate. A plate or refit costs what is saved by its beat; a
 *   schematic's gate is lifetime salvage at its beat.
 */
function walkStages() {
  const cost0: Record<PieceId, number> = {
    pulse: PULSE_COST0,
    capacitor: CAPACITOR_COST0,
    targeting: 0,
    beacon: 0,
    rail: 0,
    coolant: 0,
  };
  const price: Partial<Record<BeatId, number>> = {};
  const walk: StageWalk[] = [];
  const owned: Partial<Record<PieceId, number>> = { ...STAGE_PACKING[0]!.counts };
  let t = OPENING_S;
  let saved = 0;
  let cumulative = OPENING_SPEND;
  let rateIn = OPENING_RATE * SALVAGE_PER_DAMAGE;
  for (let j = 0; j < STAGES.length; j++) {
    const stage = STAGES[j]!;
    const packing = STAGE_PACKING[j]!;
    const rate = packing.rate * SALVAGE_PER_DAMAGE * Math.pow(REFIT_MULT, stage.refits);
    if (stage.after.startsWith('unlock:')) {
      const type = PIECES.find((p) => p.unlock === stage.after)!.id;
      const before = STAGE_PACKING[j - 1]!.counts;
      const weapons = (before.pulse ?? 0) + (before.rail ?? 0);
      cost0[type] = ((WORTH[type] * rateIn) / Math.max(1, weapons)) * PIECE_PAYBACK_S;
    }
    let spend = 0;
    for (const [type, n] of Object.entries(packing.counts) as [PieceId, number][]) {
      const have = owned[type] ?? 0;
      spend += ladderSpend(cost0[type], have, n);
      owned[type] = Math.max(have, n);
    }
    const fromSavings = Math.min(saved, spend);
    saved -= fromSavings;
    const lifted = rateIn + (spend > 0 ? ((rate - rateIn) * fromSavings) / spend : 0);
    const adoption = adoptionSeconds(lifted, rate, spend - fromSavings);
    const next = BEATS[j];
    const to = next ? BEAT_TIME[next] : t + adoption;
    const saving = Math.max(0, to - t - adoption);
    cumulative += spend - fromSavings + rate * saving;
    saved += rate * saving;
    walk.push({
      stage,
      from: t,
      to,
      rateIn,
      rate,
      spend,
      fromSavings,
      adoption,
      saved,
      cumulative,
    });
    if (next?.startsWith('unlock:')) price[next] = cumulative;
    else if (next) {
      price[next] = saved;
      saved = 0;
    }
    t = to;
    rateIn = rate;
  }
  return { walk, price, cost0 };
}

const SOLVED = walkStages();

/** The stage walk the prices are solved from, in STAGES order. */
export const WALK: readonly StageWalk[] = SOLVED.walk;
/** The arc's predicted end: the full hull fitted, once the last stage's adoption is done. */
export const ARC_END_S = WALK[WALK.length - 1]!.to;
/** Each type's first-copy price; a new type's is set at its unlock beat. */
export const PIECE_COST0: Readonly<Record<PieceId, number>> = SOLVED.cost0;

/** Lifetime-salvage gate for a schematic: what the walk has earned by its beat. */
export const unlockGate = (beat: BeatId) => SOLVED.price[beat]!;
/** A hull section's price: what the walk saves between the previous plate or refit and its beat. */
export const sectionPrice = (beat: BeatId) => SOLVED.price[beat]!;
/** A refit's price, solved the same way as a section's. */
export const refitPrice = (beat: BeatId) => SOLVED.price[beat]!;
/** A refit is shown a little before it is affordable: one first gap ahead of its beat. */
export const refitGate = (beat: BeatId) => predictedCumulative(BEAT_TIME[beat] - FIRST_GAP_S);

/** Predicted income (salvage/s) at sim-time t: the opening ramp, then each stage's ramp and rate. */
export function predictedIncome(t: number): number {
  if (t <= OPENING_S) return PULSE_DPS * Math.exp(OPENING_GROWTH * t);
  const w = WALK.find((s) => t <= s.to) ?? WALK[WALK.length - 1]!;
  const ramp = t - w.from;
  if (ramp >= w.adoption) return w.rate;
  const lifted = w.rateIn + (w.spend > 0 ? ((w.rate - w.rateIn) * w.fromSavings) / w.spend : 0);
  const lambda = (w.rate - lifted) / Math.max(1e-9, w.spend - w.fromSavings);
  return Math.min(w.rate, lifted * Math.exp(lambda * ramp));
}

/** Predicted lifetime salvage by sim-time t, the starting purse included. */
export function predictedCumulative(t: number): number {
  if (t <= OPENING_S) return PULSE_COST0 + (Math.exp(OPENING_GROWTH * t) - 1) / OPENING_GROWTH;
  let c = OPENING_SPEND;
  for (const w of WALK) {
    const end = Math.min(t, w.to);
    const ramp = Math.min(end - w.from, w.adoption);
    if (ramp > 0) {
      const lifted = w.rateIn + ((w.rate - w.rateIn) * w.fromSavings) / Math.max(1e-9, w.spend);
      const lambda = (w.rate - lifted) / Math.max(1e-9, w.spend - w.fromSavings);
      c += (lifted * (Math.exp(lambda * ramp) - 1)) / lambda;
    }
    c += w.rate * Math.max(0, end - w.from - w.adoption);
    if (t <= w.to) break;
  }
  return c;
}
