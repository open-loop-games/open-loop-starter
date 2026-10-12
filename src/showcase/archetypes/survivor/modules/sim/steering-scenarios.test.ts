/**
 * Pilot scenarios — named situations with an answer knowable by inspection.
 *
 * The rest of this archetype's movement work is measured by 30-minute arcs and
 * aggregate statistics, which can say a number moved and cannot say whether a
 * decision was right. These can. Each case is a floor placed by hand around one
 * question, run for a few sim seconds, and asserted on the OUTCOME — did the
 * mote get banked, did the body stay in reach, did the operator take the gap.
 *
 * What "right" means here is the pilot's design brief, not a tuning preference:
 * movement is a triangle — away from bodies, toward bodies, toward motes — and
 * good play crosses the T. Sweep the mass at just under a right angle, cut in
 * enough to drag it around, then swing back through your own wake, where the
 * motes you just made are lying.
 *
 * Rules that keep these honest:
 *
 *  - **Outcomes, not headings.** Asserting on one arg-max pins the
 *    implementation; asserting that the mote got banked pins the behaviour, and
 *    survives any rewrite of how the choice is made.
 *  - **No magnitudes.** Counts, distances against a radius the game already
 *    defines, and directions. Nothing here should move when the economy is
 *    retuned.
 *  - **The floor is fixed by construction.** `stepArena` spawns on its own
 *    schedule and a scenario is not asking what a stochastic floor does, so
 *    anything the step spawns is removed each tick. The bodies in a case are the
 *    bodies the case placed.
 *
 * A red test here is a named pilot defect. That is the whole point of the file:
 * the movement policy had no behavioural spec at all, so every previous change
 * to it was argued from statistics.
 */

import { describe, expect, it } from 'vitest';
import { buildNav } from '../arena';
import { ARENA_BALANCE } from '../../data/arena';
import { BASE_SPECIMEN_HP } from '../../data/specimens';
import { BASELINE_SEAT, seatById, type SeatDef } from '../../data/seats';
import { computeFields } from './steering';
import { createArenaState, stepArena } from './step';
import type { ArenaParams, ArenaState, Specimen } from './types';

const { killRadius, contactRadius, mapWidth, mapHeight } = ARENA_BALANCE;

const paramsFor = (seat: SeatDef): ArenaParams => ({
  engage: seat.engage,
  eta: seat.eta,
  speedMul: seat.speed,
  dpsMul: seat.dps,
  toughnessMul: seat.toughness,
  metaSurvival: 1,
  metaCollect: 1,
  metaYield: 1,
  random: () => 0.5,
});

const nav = buildNav();
const TICK = 0.05;

interface Placed {
  /**
   * Bodies, positioned relative to the operator's start.
   *
   * `speed: 0` makes a body a static obstacle, which is how the routing cases
   * isolate "can it path around this" from "can it out-run a pursuer" — two
   * different questions that a mobile wall answers at once and neither cleanly.
   */
  bodies?: { dx: number; dy: number; hp?: number; speed?: number }[];
  /** Motes, positioned relative to the operator's start. */
  motes?: { dx: number; dy: number }[];
  /** Unit heading the operator starts on. Default is +x. */
  heading?: { x: number; y: number };
  /** Seat whose authored parameters drive the pilot. Defaults to the baseline. */
  seat?: SeatDef;
}

interface Outcome {
  state: ArenaState;
  start: { x: number; y: number };
  /** Displacement over the whole scenario. */
  moved: { dx: number; dy: number };
  banked: number;
  kills: number;
  /** Contact damage taken. Zero is the Kineticist's whole thesis. */
  damageTaken: number;
  /** Closest any placed body ever got, by index into `bodies`. */
  closest: number[];
  /** Whether each placed body was inside `killRadius` at the final tick. */
  inReachAtEnd: boolean[];
}

/**
 * Place a floor, fly the shipping policy across it, and report what happened.
 *
 * The operator starts mid-map so no wall term is in play — every case here is
 * about the triangle, and a scenario accidentally decided by a boundary would be
 * measuring something it never meant to.
 */
function scenario(placed: Placed, seconds: number): Outcome {
  const params = paramsFor(placed.seat ?? BASELINE_SEAT);
  const state = createArenaState(params);
  state.operator.x = mapWidth / 2;
  state.operator.y = mapHeight / 2;
  state.operator.heading = placed.heading ?? { x: 1, y: 0 };
  const start = { x: state.operator.x, y: state.operator.y };

  const placedIds: number[] = [];
  for (const b of placed.bodies ?? []) {
    const hp = b.hp ?? BASE_SPECIMEN_HP;
    const s: Specimen = {
      id: state.nextId++,
      tierId: 'mote-fly',
      x: start.x + b.dx,
      y: start.y + b.dy,
      hp,
      spawnHp: hp,
      speed: b.speed ?? 44,
      contactDamage: 6,
      moteYield: 1,
      spawnedAt: 0,
      reached: false,
    };
    state.specimens.push(s);
    placedIds.push(s.id);
  }
  for (const m of placed.motes ?? []) {
    state.motes.push({
      id: state.nextId++,
      x: start.x + m.dx,
      y: start.y + m.dy,
      value: 1,
      droppedAt: 0,
    });
  }

  const closest = placedIds.map(() => Number.POSITIVE_INFINITY);
  const ticks = Math.round(seconds / TICK);
  for (let i = 0; i < ticks; i++) {
    stepArena(state, TICK, params, nav, computeFields(state, nav, state.time));
    // The case's floor is the case's own. Anything the spawn schedule added is
    // dropped before it can steer the next decision.
    state.specimens = state.specimens.filter((s) => placedIds.includes(s.id));
    for (let b = 0; b < placedIds.length; b++) {
      const body = state.specimens.find((s) => s.id === placedIds[b]);
      if (!body) continue;
      const d = Math.hypot(body.x - state.operator.x, body.y - state.operator.y);
      if (d < closest[b]) closest[b] = d;
    }
  }

  return {
    state,
    start,
    moved: { dx: state.operator.x - start.x, dy: state.operator.y - start.y },
    banked: state.stats.motesBanked,
    kills: state.stats.kills,
    damageTaken: state.stats.damageTaken,
    closest,
    inReachAtEnd: placedIds.map((id) => {
      const body = state.specimens.find((s) => s.id === id);
      if (!body) return false;
      return Math.hypot(body.x - state.operator.x, body.y - state.operator.y) <= killRadius;
    }),
  };
}

describe('pilot — the income leg of the triangle', () => {
  it('turns back for a mote behind it when the lane is clear', () => {
    // Nothing to fear and one thing to bank, 150 units astern. Any pilot that
    // does not take this is not trading threat against income, it is fleeing.
    const out = scenario({ motes: [{ dx: -150, dy: 0 }], heading: { x: 1, y: 0 } }, 4);

    expect(out.banked).toBeGreaterThan(0);
  });

  it('turns back for a mote beyond the near field, where only the grid can see it', () => {
    // The same decision as the case above, moved outside `MOTE_NEAR_RADIUS` so
    // the exact near-field term is silent and the nav grid is the only thing
    // that can answer. Clear floor, nothing to fear, one thing to bank — if the
    // grid term cannot pay the turn cost to reverse onto it, the operator has no
    // routing at all beyond three cells and every mote past that is invisible.
    const out = scenario({ motes: [{ dx: -500, dy: 0 }], heading: { x: 1, y: 0 } }, 8);

    expect(out.banked).toBeGreaterThan(0);
  });

  it('takes the wake of three over a single mote the other way', () => {
    // The manoeuvre the archetype is built on: kills happen at the edge, motes
    // lie where they died, so the return through your own wake is where income
    // is. Three astern against one ahead is not a close call.
    const out = scenario(
      {
        motes: [
          { dx: -140, dy: -40 },
          { dx: -180, dy: 20 },
          { dx: -220, dy: -10 },
          { dx: 160, dy: 0 },
        ],
        heading: { x: 1, y: 0 },
      },
      6,
    );

    expect(out.banked).toBeGreaterThanOrEqual(3);
  });
});

describe('pilot — the engagement leg of the triangle', () => {
  it('holds a lone body inside kill range instead of outrunning it', () => {
    // The operator moves at 120 and this body at 44, so running is always
    // available and always wrong — distance is zero damage and zero income.
    // Crossing the T means staying on it at range until it dies.
    const out = scenario({ bodies: [{ dx: 150, dy: 0, hp: 1e6 }] }, 4);

    expect(out.inReachAtEnd[0]).toBe(true);
  });

  it('does not close to contact to do it', () => {
    // The other half of the same decision. Holding range is the manoeuvre;
    // standing in the body is a different failure with the same kill count.
    const out = scenario({ bodies: [{ dx: 150, dy: 0, hp: 1e6 }] }, 4);

    expect(out.closest[0]).toBeGreaterThan(contactRadius * 1.5);
  });
});

describe('pilot — the evasion leg of the triangle', () => {
  /**
   * A blob pressing from port, a second group waiting to starboard, open floor
   * fore-and-aft.
   *
   * The port group is INSIDE the orbit the pilot wants to hold, which is what
   * makes this an evasion case rather than an engagement one — a first draft put
   * both groups outside it and the operator correctly closed on the near one,
   * measuring the wrong decision entirely. Running straight away from a crowd
   * that is already too close is the move that walks into the far group; the
   * answer is the lane perpendicular to both.
   */
  const pressed = () => ({
    bodies: [
      ...Array.from({ length: 10 }, (_, i) => ({ dx: -60, dy: -90 + i * 20 })),
      ...Array.from({ length: 10 }, (_, i) => ({ dx: 300, dy: -90 + i * 20 })),
    ],
    heading: { x: 0, y: 1 },
  });

  // KNOWN DEFECT, kept red — but the assertion no longer measures the defect it
  // was filed for, and that is the thing to fix first. It was filed because the
  // operator fled +x onto the far group's bearing, 86 units along the blocked
  // axis against 27 across the open one. Traced now: net −94 in x and −22 in y,
  // AWAY from the far group, which never comes near — the sibling case below
  // asserts exactly that and passes.
  //
  // What it does instead is orbit the port mass, on `engage` at 39.6 against a
  // threat spread of ~14. That may well be right play, and this assertion cannot
  // say: net displacement over four seconds is an arbitrary direction for a
  // policy that is circling, so it fails a good orbit and a bad flee alike.
  // Needs an assertion about the lane rather than about the net vector before it
  // can be believed either way.
  it.fails('takes the open lane rather than fleeing into bodies it cannot see past', () => {
    const out = scenario(pressed(), 4);

    expect(Math.abs(out.moved.dy)).toBeGreaterThan(Math.abs(out.moved.dx));
  });

  it('never lets the far group become the new near group', () => {
    const out = scenario(pressed(), 4);

    // Fleeing port-to-starboard trades one crowd for another, which is the
    // failure this leg exists to catch.
    const starboardClosest = Math.min(...out.closest.slice(10));
    expect(starboardClosest).toBeGreaterThan(contactRadius * 2);
  });
});

describe('pilot — routing around what is in the way', () => {
  /**
   * These use static bodies. A pursuing wall closes the gap it is being asked
   * about, so a failure could always be blamed on the pursuit rather than on the
   * routing, and the point here is the routing.
   */
  const WALL = { hp: 1e6, speed: 0 };

  it('goes around a body sitting on its path rather than through it', () => {
    // One obstacle dead ahead and open floor on both sides. Nothing here needs a
    // plan — it needs the operator to notice that its current bearing ends in a
    // body and that a few degrees either way does not.
    const out = scenario({ bodies: [{ dx: 260, dy: 0, ...WALL }], heading: { x: 1, y: 0 } }, 5);

    expect(out.damageTaken).toBe(0);
  });

  it('reaches a mote with an obstacle between it and the mote', () => {
    // A reason to go that way, and something in the way of going. The two legs
    // of the triangle in direct opposition, which is where "keeps going through
    // when it could have gone around" actually shows up.
    const out = scenario(
      {
        bodies: [{ dx: 170, dy: 0, ...WALL }],
        motes: [{ dx: 340, dy: 0 }],
        heading: { x: 1, y: 0 },
      },
      8,
    );

    expect(out.banked).toBeGreaterThan(0);
    expect(out.damageTaken).toBe(0);
  });

  // Red for two passes; fixed by the graze exclusion in `./steering.ts`.
  //
  // **This case cannot police that fix on its own, which is the thing to know
  // before touching it.** It goes green under the correct version AND under the
  // reverted one that costed the whole swept segment — the version that fired the
  // contact branch on all sixteen candidates, took the cost out of the arg-max,
  // and cost every seat ~9 minutes of arc. Passing here says the operator threads
  // the lane; it says nothing about whether the cost still steers. That reading
  // is `../../balance/steering-probe.ts`'s `cliff all` column, and a change to the
  // contact cost is not verified until both have been looked at.
  it('threads a gap instead of clipping the group beside it', () => {
    // A 120-unit lane between two static walls, with the payoff on the far side.
    // Contact is 22 units, so the gap is wide — clipping it is a routing failure
    // rather than a tight-squeeze failure.
    const upper = Array.from({ length: 6 }, (_, i) => ({ dx: 60 + i * 40, dy: 60, ...WALL }));
    const lower = Array.from({ length: 6 }, (_, i) => ({ dx: 60 + i * 40, dy: -60, ...WALL }));

    const out = scenario(
      { bodies: [...upper, ...lower], motes: [{ dx: 380, dy: 0 }], heading: { x: 1, y: 0 } },
      8,
    );

    expect(out.damageTaken).toBe(0);
  });
});

describe('pilot — the Kineticist thesis', () => {
  /**
   * "Never be where it is." The seat's whole claim is that movement and
   * positioning let it take no damage while still killing and still collecting,
   * so the three have to be asserted together — each one alone is satisfiable by
   * a policy that fails the seat. Standing off scores zero damage taken and zero
   * of everything else; standing in the mass kills and collects and dies.
   */
  // Was red at 0.71 damage taken and went green when the routing field started
  // costing crowded cells (`./steering.ts` CROWD_TRAVEL_COST): the route to the
  // motes astern now bends around the bodies instead of grazing one on the way.
  it('kills, collects and takes nothing, on a floor that allows all three', () => {
    const bodies = [
      { dx: 200, dy: 40 },
      { dx: 230, dy: -60 },
      { dx: 260, dy: 10 },
    ];
    const motes = [
      { dx: -120, dy: 30 },
      { dx: -170, dy: -20 },
    ];

    const out = scenario({ bodies, motes, seat: seatById('kinetic'), heading: { x: 1, y: 0 } }, 10);

    expect(out.kills).toBeGreaterThan(0);
    expect(out.banked).toBeGreaterThan(0);
    expect(out.damageTaken).toBe(0);
  });
});

describe('pilot — routing at grid scale', () => {
  /**
   * Beyond `MOTE_NEAR_RADIUS`, so the exact near-field term is silent and the
   * nav-grid distance field is what decides. That is the scale the grid is for:
   * a 100-unit cell cannot resolve a 22-unit contact, but it resolves "which way
   * around a crowd" perfectly well.
   */
  // KNOWN DEFECT, kept red — but no longer for the reason it was filed under,
  // and the routing half of it now works. Since the field is descended rather
  // than sampled (`./steering.ts` `descendRoute`) the operator computes a route
  // and follows it across the wall; traced, it reaches within ~110 units of the
  // mote and then stops. Two things hold it there, neither of them the route:
  //
  //  - The wall is `hp: 1e6`, so nothing in it ever dies and `engage` stays at
  //    saturation forever. Measured at the stall, the candidate aimed at the mote
  //    is behind on `engage` by 29.7 while the income terms FAVOUR it by 17.6 —
  //    the operator is holding station on a mass it cannot clear. That is correct
  //    play against a killable floor and pathological against an immortal one, so
  //    the case as written cannot separate routing from disengagement.
  //  - Bodies sit 40 units apart against a 22-unit contact radius, so the widest
  //    clearance through the wall is 20 and `damageTaken === 0` demands a full
  //    detour around it. Crossing it grazes, which is the swept-path blindness
  //    the other two red cases isolate more cleanly.
  it.fails('routes around a crowd to reach a mote beyond it', () => {
    const wall = Array.from({ length: 11 }, (_, i) => ({
      dx: 250,
      dy: -200 + i * 40,
      hp: 1e6,
      speed: 0,
    }));

    const out = scenario(
      { bodies: wall, motes: [{ dx: 500, dy: 0 }], heading: { x: 1, y: 0 } },
      14,
    );

    expect(out.banked).toBeGreaterThan(0);
    expect(out.damageTaken).toBe(0);
  });
});
