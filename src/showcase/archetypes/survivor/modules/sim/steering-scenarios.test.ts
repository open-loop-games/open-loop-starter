/**
 * Steering scenarios: named situations with an answer knowable by inspection. The probes
 * measure the star's movement in aggregate, which can say a number moved and cannot say
 * whether a decision was right. These can. Each case is a floor placed by hand around one
 * question, run for a few seconds, and asserted on the outcome: was the reel banked, did the
 * body stay in reach, did the double take the gap.
 *
 * - **Outcomes, not headings.** Asserting one arg-max pins the implementation; asserting the
 *   reel got banked pins the behavior.
 * - **No magnitudes.** Counts, distances against a radius the game defines, directions.
 * - **The floor is the case's own.** Anything the step spawns is removed each tick, and the
 *   script's marks and cues are cleared, so the bodies in a case are the bodies it placed.
 */

import { describe, expect, it } from 'vitest';
import { CAST, EXTRAS, RIG_BY_ID, SCRIPT, STARS, type StarDef } from '../../data';
import { contactRange, createArena, stepArena, type ArenaMods, type ArenaState } from './arena';
import { createSteerer } from './steering';

const DT = 1 / 30;
const GRUNT = EXTRAS[0]!;
const PISTOL_REACH = RIG_BY_ID['prop-pistol'].reach;
const mods: ArenaMods = { damage: 1, fireRate: 1, moveSpeed: 1, pickup: 1, maxHp: 100, contact: 1 };

interface Placed {
  bodies?: { dx: number; dy: number; hp?: number; speed?: number }[];
  reels?: { dx: number; dy: number }[];
  /** Facing the double starts on, radians. Default +x. */
  facing?: number;
  star?: StarDef;
  /** A lead placed on the floor, with hp it cannot lose in the case's seconds. */
  lead?: { dx: number; dy: number };
  /** Open chalk marks placed on the floor. */
  marks?: { dx: number; dy: number }[];
}

interface Outcome {
  state: ArenaState;
  banked: number;
  kills: number;
  damageTaken: number;
  /** Closest any placed body came, by index. */
  closest: number[];
  /** Whether each placed body was inside the pistol's reach at the end. */
  inReachAtEnd: boolean[];
}

function scenario(placed: Placed, seconds: number): Outcome {
  const star = placed.star ?? STARS[0]!;
  const s = createArena({ rng: () => 0.5, rating: 0, startRig: 'prop-pistol', maxHp: 100 });
  s.player.facing = placed.facing ?? 0;
  // The script's marks and cues are the take's, not the case's.
  s.marks = (placed.marks ?? []).map((m) => ({
    x: m.dx,
    y: m.dy,
    kills: 0,
    filled: false,
    filledAt: null,
  }));
  s.cues = [];
  const ids: number[] = [];
  for (const b of placed.bodies ?? []) {
    const hp = b.hp ?? 5;
    const kind = { ...GRUNT, speed: b.speed ?? GRUNT.speed };
    s.extras.push({ id: s.nextId, kind, x: b.dx, y: b.dy, hp, maxHp: hp, orbitCd: 0, flash: 0 });
    ids.push(s.nextId++);
  }
  if (placed.lead) {
    const hp = 1e9;
    s.lead = {
      id: s.nextId,
      kind: CAST.lead,
      x: placed.lead.dx,
      y: placed.lead.dy,
      hp,
      maxHp: hp,
      orbitCd: 0,
      flash: 0,
      role: 'lead',
    };
    s.leadHp0 = hp;
    s.extras.push(s.lead);
    ids.push(s.nextId++);
  }
  for (const r of placed.reels ?? [])
    s.reels.push({ x: r.dx, y: r.dy, value: 1, gold: false, pulled: false });

  const steerer = createSteerer();
  const closest = ids.map(() => Infinity);
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    const input = steerer.steer(s, mods, star.instinct, DT);
    stepArena(s, input, mods, DT);
    s.extras = s.extras.filter((e) => ids.includes(e.id));
    ids.forEach((id, b) => {
      const e = s.extras.find((x) => x.id === id);
      if (e) closest[b] = Math.min(closest[b]!, Math.hypot(e.x - s.player.x, e.y - s.player.y));
    });
  }
  return {
    state: s,
    banked: s.stats.reelsBanked,
    kills: s.stats.kills,
    damageTaken: s.stats.damageTaken,
    closest,
    inReachAtEnd: ids.map((id) => {
      const e = s.extras.find((x) => x.id === id);
      return !!e && Math.hypot(e.x - s.player.x, e.y - s.player.y) <= PISTOL_REACH;
    }),
  };
}

describe('the star improvising — reels', () => {
  it('turns back for a reel behind it when the floor is clear', () => {
    expect(scenario({ reels: [{ dx: -150, dy: 0 }] }, 4).banked).toBeGreaterThan(0);
  });

  it('turns back for a reel beyond the near field, where only the route sees it', () => {
    expect(scenario({ reels: [{ dx: -500, dy: 0 }] }, 8).banked).toBeGreaterThan(0);
  });

  it('takes a wake of three over a single reel the other way', () => {
    const out = scenario(
      {
        reels: [
          { dx: -140, dy: -40 },
          { dx: -180, dy: 20 },
          { dx: -220, dy: -10 },
          { dx: 160, dy: 0 },
        ],
      },
      6,
    );
    expect(out.banked).toBeGreaterThanOrEqual(3);
  });
});

describe('the star improvising — the fight', () => {
  const lone = { bodies: [{ dx: 200, dy: 0, hp: 1e6 }] };

  it('holds a lone body in reach rather than outrunning it', () => {
    expect(scenario(lone, 5).inReachAtEnd[0]).toBe(true);
  });

  it('does not close to contact to do it', () => {
    const out = scenario(lone, 5);
    expect(out.closest[0]).toBeGreaterThan(contactRange(out.state.extras[0]!) * 1.5);
  });

  it('downs what it holds, and banks what falls', () => {
    const out = scenario(
      {
        bodies: [
          { dx: 220, dy: 40 },
          { dx: 240, dy: -60 },
          { dx: 260, dy: 10 },
        ],
      },
      10,
    );
    expect(out.kills).toBe(3);
    expect(out.banked).toBeGreaterThan(0);
    expect(out.damageTaken).toBe(0);
  });
});

describe('the star improvising — what is in the way', () => {
  const WALL = { hp: 1e6, speed: 0 };

  it('goes around a body on its path rather than through it', () => {
    const out = scenario({ bodies: [{ dx: 260, dy: 0, ...WALL }], reels: [{ dx: 420, dy: 0 }] }, 6);
    expect(out.damageTaken).toBe(0);
  });

  it('reaches a reel with a body between it and the reel', () => {
    const out = scenario({ bodies: [{ dx: 170, dy: 0, ...WALL }], reels: [{ dx: 340, dy: 0 }] }, 8);
    expect(out.banked).toBeGreaterThan(0);
    expect(out.damageTaken).toBe(0);
  });

  it('never trades one crowd for another', () => {
    const near = Array.from({ length: 10 }, (_, i) => ({ dx: -60, dy: -90 + i * 20 }));
    const far = Array.from({ length: 10 }, (_, i) => ({ dx: 300, dy: -90 + i * 20 }));
    const out = scenario({ bodies: [...near, ...far], facing: Math.PI / 2 }, 4);
    const farClosest = Math.min(...out.closest.slice(10));
    expect(farClosest).toBeGreaterThan(
      contactRange(out.state.extras[0] ?? ({ kind: GRUNT } as never)) * 2,
    );
  });
});

describe('the star improvising — the script', () => {
  it('crosses the floor to bring the lead into reach, and the crew fires on it', () => {
    const out = scenario({ lead: { dx: 900, dy: 0 } }, 8);
    expect(out.state.lead!.hp).toBeLessThan(out.state.leadHp0);
  });

  it('walks to an open chalk mark on an empty floor', () => {
    const out = scenario({ marks: [{ dx: -700, dy: 300 }] }, 8);
    const m = out.state.marks[0]!;
    expect(Math.hypot(m.x - out.state.player.x, m.y - out.state.player.y)).toBeLessThan(
      SCRIPT.markRadius,
    );
  });
});
