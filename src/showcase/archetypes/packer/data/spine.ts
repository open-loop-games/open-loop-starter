// ─── Skeleton ───
// The spine's home in `data/`. Every economy number in Hardpoint derives from the named
// anchors below, in plain arithmetic with no engine. Modules read these values at their
// `tunable()` reader sites and never re-author them; the projection
// (`../balance/packer-projection.ts`) prints them, and the arc probe contradicts them.
//
// The board binds income: it is full from about a minute into each hull, so salvage has
// nowhere to go but the next plate, refit or schematic. So income is piecewise constant by
// board stage, the salvage the stage's best packing recovers, and the arc composes stage
// by stage (https://open-loop-games.github.io/incremental-math/rate-functions/composition/):
//  - Ship I opens from one cannon and grows to its fitted corvette core; each later ship
//    is commissioned with a grant that buys its opening fit outright;
//  - each later stage opens with an adoption ramp, the modules its packing adds bought
//    from savings and then from income as it rises, and then saves at the stage's rate;
//  - a plate or refit lands when the salvage saved reaches its price, a schematic when
//    the ship's lifetime salvage reaches its gate, and a carrier when the stage's combat
//    packing has fired its hull inside the engagement window;
//  - a carrier's fall opens the next sector's conditions and pays an honour, which
//    multiplies every rate after it, across every ship.
// Prices, gates and carrier hulls are solved from that walk so each beat lands on its
// act's gap ladder.

import {
  CARRIERS,
  PIECES,
  SHIPS,
  cellsInSection,
  type ConditionId,
  type PieceId,
  type ShipDef,
  type ShipId,
} from './hull';
import { STAGE_PACKING, type StagePacking } from './packing';

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
/** Rail copies at which a Spinal Lance's dps matches what the rail ladder charges. */
export const LANCE_PARITY_COPIES = 10;
/** Seconds a newly unlocked piece type's first copy takes to pay back its worth in weapons. */
export const PIECE_PAYBACK_S = 30;
/** Each refit's multiplier on the firepower chain: one beacon stamp's worth, on every weapon. */
export const REFIT_MULT = 1.5;
/** Seconds a carrier engagement lasts before the carrier withdraws. */
export const CARRIER_WINDOW_S = 30;
/** Share of the window's best fire a carrier's hull asks for: a margin for a layout short of the best. */
export const CARRIER_FORGIVENESS = 0.85;
/** Each carrier destroyed multiplies every weapon, for good: an honour. */
export const HONOUR_MULT = 1.25;
/** Each calibration level's multiplier on every weapon: the salvage sink once the line is open. */
export const CALIBRATION_STEP = 1.1;
/** Each calibration level's price over the last. */
export const CALIBRATION_RATIO = 1.3;
/** Seconds of the ship's first-fight income the first calibration level costs. */
export const CALIBRATION_FIRST_S = 60;

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
export const COOLANT_GAIN = 0.65;
/** Fire Director boost per weapon on its line: a link like a capacitor's. */
export const DIRECTOR_BOOST = LINK_BOOST;
/**
 * Hull cells a Fire Director's line reaches. Past four it would reach every weapon down a
 * long hull, and directors would crowd every other booster off the larger ships.
 */
export const DIRECTOR_REACH = 4;
/** Salvage Tractor yield per adjacent weapon, at the same break-even as a link. = 0.5. */
export const TRACTOR_GAIN = 1 / LINK_BREAK_EVEN;
/** Capacitor's first copy: priced at its full-ring worth in base cannons (4 · 0.5 · 10). = 20. */
export const CAPACITOR_COST0 = MAX_RING_LINKS * LINK_BOOST * PULSE_COST0;
/** Railgun dps: the cannon ladder's price ratio over RAIL_PARITY_COPIES rungs. 2^3 = 8. */
export const RAIL_DPS = PULSE_DPS * Math.pow(PRICE_RATIO, RAIL_PARITY_COPIES);
/** Spinal Lance dps: the rail's derivation one ladder further. 8 · 2^2 = 32. */
export const LANCE_DPS = RAIL_DPS * Math.pow(PRICE_RATIO, LANCE_PARITY_COPIES);

/** A new type's worth in weapons, which prices its first copy. */
const WORTH: Record<PieceId, number> = {
  pulse: 1,
  capacitor: 1,
  targeting: 1,
  beacon: 1,
  rail: RAIL_DPS / PULSE_DPS - 1,
  coolant: 1,
  director: LINK_BREAK_EVEN,
  lance: LANCE_DPS / RAIL_DPS - 1,
  tractor: 1,
};

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
 * The first corvette core (3×3) at reference packing: cannons on the corners and centre,
 * capacitors on the edges. Centre touches 4 capacitors, each corner 2:
 * (1 + 4b) + 4(1 + 2b) = 5 + 12b. = 11 at b = 0.5.
 */
export const OPENING_RATE = (5 + 12 * LINK_BOOST) * PULSE_DPS * SALVAGE_PER_DAMAGE;
/** Salvage the first opening fit costs: five cannons and four capacitors up their ladders. */
export const OPENING_SPEND = ladderSpend(PULSE_COST0, 0, 5) + ladderSpend(CAPACITOR_COST0, 0, 4);
/** Seconds from a cold start to the first fitted corvette core. */
export const OPENING_S = adoptionSeconds(PULSE_DPS, OPENING_RATE, OPENING_SPEND - PULSE_COST0);

// === STAGES ===

/** What the board can hold between two events, and what the breach line asks of it. */
export interface BoardStage {
  /** the event that opened the stage: a beat id, a carrier id, or `<ship>:opening`; the packing table's key */
  key: string;
  ship: ShipId;
  /** hull sections plated on this ship */
  sections: number;
  types: readonly PieceId[];
  /** refits held on this ship */
  refits: number;
  /** carriers destroyed, every ship */
  honours: number;
  /** what the sector the line holds brings */
  conditions: readonly ConditionId[];
  /** the carrier this stage engages, when it closes on one */
  fights?: string;
}

/** The beat that opens the breach line: carriers and conditions begin with the cruiser act. */
export const LINE_OPENS = 'frigate:section-7';

/** A ship's scheduled events in order: each ladder beat with its act, and the carriers. */
function shipEvents(ship: ShipDef) {
  return ship.acts.flatMap((act, a) =>
    act.beats.map((id) => ({ id, act: a, carrier: id.startsWith('carrier:') })),
  );
}

/** Every board stage of the arc, in order: one per ship opening, beat and carrier fall. */
export const STAGES: readonly BoardStage[] = (() => {
  const out: BoardStage[] = [];
  const types: PieceId[] = PIECES.filter((p) => !p.unlock).map((p) => p.id);
  let honours = 0;
  let lineOpen = false;
  let sector = 0;
  const conditions = () =>
    lineOpen && sector < CARRIERS.length ? CARRIERS[sector]!.conditions : [];
  for (const ship of SHIPS) {
    let sections = 0;
    let refits = 0;
    const events = shipEvents(ship);
    const push = (key: string, fights?: string) =>
      out.push({
        key,
        ship: ship.id,
        sections,
        types: [...types],
        refits,
        honours,
        conditions: [...conditions()],
        fights,
      });
    push(`${ship.id}:opening`, events[0]?.carrier ? events[0].id : undefined);
    for (const [i, e] of events.entries()) {
      if (e.carrier) {
        honours++;
        sector++;
      } else if (e.id.includes(':section-')) {
        sections++;
        if (e.id === LINE_OPENS) lineOpen = true;
      } else if (e.id.includes(':refit:')) refits++;
      else types.push(PIECES.find((p) => p.unlock === e.id)!.id);
      const next = events[i + 1];
      push(e.id, next?.carrier ? next.id : undefined);
    }
  }
  return out;
})();

/** Cells a ship's hull opens with this many sections plated. */
export const cellsWith = (ship: ShipId, sections: number) => {
  let n = 0;
  for (let s = 0; s <= sections; s++) n += cellsInSection(ship, s);
  return n;
};

// === DERIVED: the stage walk ===

/** One stage as the walk plays it. */
export interface StageWalk {
  stage: BoardStage;
  /** sim-seconds the stage opens and closes */
  from: number;
  to: number;
  /** salvage a second entering the stage, and at its packing once adopted */
  rateIn: number;
  rate: number;
  /** salvage the copies its packings add cost, the part savings pay, and the ramp's seconds */
  spend: number;
  fromSavings: number;
  adoption: number;
  /** salvage saved when the stage closes, before its beat is paid */
  saved: number;
  /** this ship's lifetime salvage when the stage closes */
  cumulative: number;
  /** the carrier's hull, when the stage closes on one */
  hull?: number;
}

/** A stage's packing claim, or the corvette's closed form until the probe has measured it. */
export const packingFor = (stage: BoardStage): StagePacking =>
  STAGE_PACKING[stage.key] ?? {
    salvage: OPENING_RATE,
    firepower: OPENING_RATE,
    counts: { pulse: 5, capacitor: 4 },
  };

/** The multiplier every weapon carries in a stage: refits held and honours earned. */
export const stageMult = (s: BoardStage) =>
  Math.pow(REFIT_MULT, s.refits) * Math.pow(HONOUR_MULT, s.honours);

/**
 * Walk the stages, solving each beat's price or gate so it lands on its act's ladder:
 * - a new type's first copy costs its worth in weapons × one weapon's income entering its
 *   unlock × PIECE_PAYBACK_S;
 * - a stage opens by buying the copies its packings add over those owned this ship, from
 *   savings first and then out of income as it rises (`adoptionSeconds`);
 * - it then saves at its rate. A plate or refit costs what is saved by its beat, and a
 *   schematic's gate is the ship's lifetime salvage at its beat;
 * - a stage that closes on a carrier engages it once adopted: the carrier falls one
 *   window later, and its hull is CARRIER_FORGIVENESS of the window's fire at the stage's
 *   combat packing.
 */
function walkStages() {
  const cost0: Record<PieceId, number> = {
    pulse: PULSE_COST0,
    capacitor: CAPACITOR_COST0,
    targeting: 0,
    beacon: 0,
    rail: 0,
    coolant: 0,
    director: 0,
    lance: 0,
    tractor: 0,
  };
  const price: Record<string, number> = {};
  const target: Record<string, number> = {};
  const purse = {} as Record<ShipId, number>;
  const walk: StageWalk[] = [];
  let t = 0;
  let k = 0;
  for (const ship of SHIPS) {
    const events = shipEvents(ship);
    const owned: Partial<Record<PieceId, number>> = {};
    let saved = 0;
    let cumulative = PULSE_COST0;
    let rateIn = PULSE_DPS * SALVAGE_PER_DAMAGE * stageMult(STAGES[k]!);
    let act = -1;
    let actStart = 0;
    let rung = 0;
    let ratio = 1;
    for (let e = -1; e < events.length; e++) {
      const stage = STAGES[k++]!;
      const packing = packingFor(stage);
      const rate = packing.salvage * stageMult(stage) * SALVAGE_PER_DAMAGE;
      if (stage.key.includes(':unlock:')) {
        const type = PIECES.find((p) => p.unlock === stage.key)!.id;
        const before = packingFor(STAGES[k - 2]!).counts;
        const weapons = (before.pulse ?? 0) + (before.rail ?? 0) + (before.lance ?? 0);
        cost0[type] = ((WORTH[type] * rateIn) / Math.max(1, weapons)) * PIECE_PAYBACK_S;
      }
      // A carrier fight needs its combat packing's copies as well as the saving packing's.
      const need: Partial<Record<PieceId, number>> = { ...packing.counts };
      if (stage.fights && packing.combat)
        for (const [type, n] of Object.entries(packing.combat.counts) as [PieceId, number][])
          need[type] = Math.max(need[type] ?? 0, n);
      let spend = 0;
      for (const [type, n] of Object.entries(need) as [PieceId, number][]) {
        const have = owned[type] ?? 0;
        spend += ladderSpend(cost0[type], have, n);
        owned[type] = Math.max(have, n);
      }
      // Ship I opens from the purse's one cannon. A later ship's commissioning grant buys
      // its whole opening fit, and counts toward its gates as the purse does.
      if (e === -1) {
        if (ship === SHIPS[0]) spend = Math.max(0, spend - PULSE_COST0);
        else saved = cumulative = spend;
        purse[ship.id] = ship === SHIPS[0] ? PULSE_COST0 : spend;
      }
      const fromSavings = Math.min(saved, spend);
      saved -= fromSavings;
      const lifted = rateIn + (spend > 0 ? ((rate - rateIn) * fromSavings) / spend : 0);
      const adoption = adoptionSeconds(lifted, rate, spend - fromSavings);
      cumulative += spend - fromSavings;

      // The stage ends at its carrier's fall, or at the next ladder beat's target.
      const next = events[e + 1];
      let to: number;
      let hull: number | undefined;
      if (stage.fights) {
        const combat = (packing.combat?.firepower ?? packing.firepower) * stageMult(stage);
        hull = CARRIER_FORGIVENESS * CARRIER_WINDOW_S * combat;
        to = t + adoption + CARRIER_WINDOW_S;
        target[stage.fights] = to;
        price[stage.fights] = hull;
      } else if (next) {
        if (next.act !== act) {
          act = next.act;
          actStart = e === -1 ? t + adoption : t;
          const def = ship.acts[act]!;
          const n = def.beats.filter((b) => !b.startsWith('carrier:')).length;
          ratio = n > 1 ? Math.pow(def.gaps[1] / def.gaps[0], 1 / (n - 1)) : 1;
          rung = 0;
        }
        rung++;
        to = actStart + geometricSum(ship.acts[act]!.gaps[0], ratio, rung);
        target[next.id] = to;
      } else {
        // After a ship's last carrier the reference player recommissions at once.
        to = t;
      }
      const saving = Math.max(0, to - t - adoption);
      const done = !next && !stage.fights;
      cumulative += rate * saving;
      saved += rate * saving;
      walk.push({
        stage,
        from: t,
        to,
        rateIn,
        rate,
        spend: done ? 0 : spend,
        fromSavings: done ? 0 : fromSavings,
        adoption: done ? 0 : adoption,
        saved,
        cumulative,
        hull,
      });
      if (next && !next.carrier && !stage.fights) {
        if (next.id.includes(':unlock:')) price[next.id] = cumulative;
        else {
          price[next.id] = saved;
          saved = 0;
        }
      }
      t = to;
      rateIn = rate;
    }
  }
  return { walk, price, target, cost0, purse };
}

const SOLVED = walkStages();

/** The stage walk the prices are solved from, in STAGES order. */
export const WALK: readonly StageWalk[] = SOLVED.walk;
/** The story's predicted end: the Dreadnought's fall. */
export const ARC_END_S = SOLVED.target['carrier:dreadnought']!;
/** Each type's first-copy price; a new type's is set at its unlock beat. */
export const PIECE_COST0: Readonly<Record<PieceId, number>> = SOLVED.cost0;
/**
 * The salvage a ship is commissioned with: Ship I's one cannon, and for each later ship a
 * grant that buys its opening fit at its fabricator's first prices.
 */
export const COMMISSION_PURSE: Readonly<Record<ShipId, number>> = SOLVED.purse;
/** Each beat's and each carrier's target time. */
export const BEAT_TIME: Readonly<Record<string, number>> = SOLVED.target;

/** Lifetime-salvage gate for a schematic: what its ship's walk has earned by its beat. */
export const unlockGate = (beat: string) => SOLVED.price[beat]!;
/** A hull section's price: what the walk saves between the previous plate or refit and its beat. */
export const sectionPrice = (beat: string) => SOLVED.price[beat]!;
/** A refit's price, solved the same way as a section's. */
export const refitPrice = (beat: string) => SOLVED.price[beat]!;
/** A carrier's hull: CARRIER_FORGIVENESS of a window's fire at its stage's combat packing. */
export const carrierHull = (id: string) => SOLVED.price[id]!;
/**
 * A ship's first calibration level: CALIBRATION_FIRST_S of the income its first carrier fight
 * stage earns. Outside the walk: the reference player calibrates only when a carrier holds.
 */
export const calibrationCost0 = (ship: ShipId) => {
  const w =
    WALK.find((s) => s.stage.ship === ship && s.stage.fights) ??
    WALK.find((s) => s.stage.ship === ship)!;
  return w.rate * CALIBRATION_FIRST_S;
};
/** A refit is shown a little before it is affordable: a minute ahead of its beat. */
export const refitGate = (beat: string) => predictedCumulative(BEAT_TIME[beat]! - 60);

/** The walk stage live at sim-time t. */
const stageAt = (t: number) => WALK.find((s) => t <= s.to) ?? WALK[WALK.length - 1]!;

const ramp = (w: StageWalk, dt: number) => {
  const lifted = w.rateIn + (w.spend > 0 ? ((w.rate - w.rateIn) * w.fromSavings) / w.spend : 0);
  const lambda = (w.rate - lifted) / Math.max(1e-9, w.spend - w.fromSavings);
  return { lifted, lambda, dt: Math.min(dt, w.adoption) };
};

/** Predicted income (salvage/s) at sim-time t: each stage's ramp, then its rate. */
export function predictedIncome(t: number): number {
  const w = stageAt(t);
  if (t - w.from >= w.adoption) return w.rate;
  const r = ramp(w, t - w.from);
  return Math.min(w.rate, r.lifted * Math.exp(r.lambda * r.dt));
}

/** Predicted lifetime salvage of the ship in service at sim-time t, its purse included. */
export function predictedCumulative(t: number): number {
  const w = stageAt(t);
  const prev = WALK[WALK.indexOf(w) - 1];
  let c = prev && prev.stage.ship === w.stage.ship ? prev.cumulative : SOLVED.purse[w.stage.ship];
  const r = ramp(w, t - w.from);
  if (r.dt > 0 && r.lambda > 0) c += (r.lifted * (Math.exp(r.lambda * r.dt) - 1)) / r.lambda;
  return c + w.rate * Math.max(0, t - w.from - w.adoption);
}
