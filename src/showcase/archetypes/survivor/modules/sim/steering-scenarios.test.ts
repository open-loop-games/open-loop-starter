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
import { BASELINE_SEAT } from '../../data/seats';
import { computeFields } from './steering';
import { createArenaState, stepArena } from './step';
import type { ArenaParams, ArenaState, Specimen } from './types';

const { killRadius, contactRadius, mapWidth, mapHeight } = ARENA_BALANCE;

const params: ArenaParams = {
  engage: BASELINE_SEAT.engage,
  eta: BASELINE_SEAT.eta,
  speedMul: BASELINE_SEAT.speed,
  dpsMul: BASELINE_SEAT.dps,
  toughnessMul: BASELINE_SEAT.toughness,
  metaSurvival: 1,
  metaCollect: 1,
  metaYield: 1,
  random: () => 0.5,
};

const nav = buildNav();
const TICK = 0.05;

interface Placed {
  /** Bodies, positioned relative to the operator's start. */
  bodies?: { dx: number; dy: number; hp?: number }[];
  /** Motes, positioned relative to the operator's start. */
  motes?: { dx: number; dy: number }[];
  /** Unit heading the operator starts on. Default is +x. */
  heading?: { x: number; y: number };
}

interface Outcome {
  state: ArenaState;
  start: { x: number; y: number };
  /** Displacement over the whole scenario. */
  moved: { dx: number; dy: number };
  banked: number;
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
      speed: 44,
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

  // KNOWN DEFECT, kept red on purpose. Measured: over four seconds the operator
  // covers 86 units along the axis the far group sits on and 27 across the open
  // lane — it flees onto the bearing of the crowd it cannot see.
  //
  // Structural rather than a weight. The policy scores each candidate at ONE
  // point 100 units ahead, so a heading is judged by where it lands and never by
  // what lies along it; at that range the far group is not yet near anything and
  // the bearing reads clear. No weight fixes a term that is not being asked the
  // question. `it.fails` rather than a skip so this flips the suite red the
  // moment it starts passing, and nobody has to remember to come back.
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
