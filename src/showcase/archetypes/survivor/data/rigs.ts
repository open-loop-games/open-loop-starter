// ─── Skeleton ───
// The rigs: the effects crew fires them on their own clocks. Positioning is the only input,
// so each shape is a different answer to "where should I stand for this to land".

import { ANCHORS, DPS0 } from './spine';

export type RigShape = 'nearest' | 'ring' | 'heading-cone' | 'heaviest' | 'orbit';

export type RigId = 'prop-pistol' | 'squib-ring' | 'pyro-gag' | 'dolly-rifle' | 'breakaway';

export interface RigDef {
  id: RigId;
  name: string;
  blurb: string;
  shape: RigShape;
  /** Seconds between activations; for `orbit`, the re-hit interval per extra. */
  cooldown: number;
  /** World units: range, ring radius, cone length or orbit radius. */
  reach: number;
  /** Bodies one activation is expected to hit. It divides base damage, so every rig's level-1 damage a second is DPS0. */
  expectedHits: number;
  /** Fire-rate multiplier while the double stands still. */
  stillBonus: number;
}

function rig(d: Omit<RigDef, 'stillBonus'> & { stillBonus?: number }): RigDef {
  return { stillBonus: 1, ...d };
}

export const RIGS: readonly RigDef[] = [
  rig({
    id: 'prop-pistol',
    name: 'Prop Pistol',
    blurb: 'Blanks with a real kick. Hits the nearest extra in reach.',
    shape: 'nearest',
    cooldown: 0.55,
    reach: ANCHORS.openingReach,
    expectedHits: 1,
  }),
  rig({
    id: 'squib-ring',
    name: 'Squib Ring',
    blurb: 'Charges taped round your harness pop everyone close.',
    shape: 'ring',
    cooldown: 2,
    reach: 115,
    expectedHits: 3,
  }),
  rig({
    id: 'pyro-gag',
    name: 'Pyro Gag',
    blurb: 'A fire cone where you are running. Turn to aim it.',
    shape: 'heading-cone',
    cooldown: 1.3,
    reach: 175,
    expectedHits: 2.5,
  }),
  rig({
    id: 'dolly-rifle',
    name: 'Dolly Rifle',
    blurb: 'Picks the toughest extra in long reach. Twice as fast when you hold your mark.',
    shape: 'heaviest',
    cooldown: 1.6,
    reach: 520,
    expectedHits: 1,
    stillBonus: 2,
  }),
  rig({
    id: 'breakaway',
    name: 'Breakaway Bottles',
    blurb: 'Sugar-glass bottles orbit you and shatter on whoever they touch.',
    shape: 'orbit',
    cooldown: 0.6,
    reach: 78,
    expectedHits: 2,
  }),
];

export const RIG_BY_ID = Object.fromEntries(RIGS.map((r) => [r.id, r])) as Record<RigId, RigDef>;

/** Half-angle of the Pyro Gag's cone, radians. */
export const CONE_HALF_ANGLE = 0.55;

/** Bottles orbiting at a level: two, plus one at levels 3 and 5. */
export function orbitCount(level: number): number {
  return 2 + (level >= 3 ? 1 : 0) + (level >= 5 ? 1 : 0);
}

// ─── Balance ───
// Base damage spreads DPS0 across cooldown and expected hits, so a rig's level-1 damage a
// second is DPS0 whatever its shape. A level multiplies it by the spine's LEVEL_GAIN.

/** Level-1 damage per activation. */
export function rigBaseDamage(def: RigDef): number {
  return (DPS0 * def.cooldown) / def.expectedHits;
}
