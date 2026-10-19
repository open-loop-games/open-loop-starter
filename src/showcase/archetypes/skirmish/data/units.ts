/**
 * The roster: four unit kinds, each with an attack kind and a body kind, and
 * the authored relation between attack and body that decides what a hit does.
 */
import {
  AETHER_PRICE,
  COUNTER,
  ENFORCER_SCRIP_SHARE,
  ENFORCER_VALUE,
  HEXER_SCRIP_SHARE,
  RESIST,
  RIGGER_SCRIP_SHARE,
  UNIT_DPS,
  enforcerDps,
  enforcerHp,
  unitHp,
  unitValue,
} from './spine';

// ─── Skeleton ──────────────────────────────────────────────────────────────

export type UnitKind = 'razor' | 'hexer' | 'rigger' | 'enforcer';
export type AttackKind = 'kinetic' | 'arcane' | 'code' | 'heavy';
export type BodyKind = 'chrome' | 'flesh' | 'drone' | 'plated' | 'structure';

export const UNIT_KINDS: readonly UnitKind[] = ['razor', 'hexer', 'rigger', 'enforcer'];

export interface UnitDef {
  id: UnitKind;
  name: string;
  /** One line of fiction for the roster card. */
  blurb: string;
  attack: AttackKind;
  body: BodyKind;
  dps: number;
  hp: number;
  cost: { scrip: number; aether: number };
}

// ─── Balance ───────────────────────────────────────────────────────────────
// Every base kind is worth `unitValue` scrip, aether priced at AETHER_PRICE,
// so the triangle is value-fair and only the pairing decides a fight. The
// enforcer is worth ENFORCER_VALUE units for the same one supply, which is
// the reason to tech toward it once the cap binds.

const u = unitValue;
const whole = (x: number) => Math.round(x);

export const UNITS: Record<UnitKind, UnitDef> = {
  razor: {
    id: 'razor',
    name: 'Razorboys',
    blurb:
      'Chromed street blades with smartgun eyes. They cut a hedge-mage down before the first word lands.',
    attack: 'kinetic',
    body: 'chrome',
    dps: UNIT_DPS,
    hp: unitHp,
    cost: { scrip: whole(u), aether: 0 },
  },
  hexer: {
    id: 'hexer',
    name: 'Hexers',
    blurb:
      'Gutter mages with chalk and bad debts. Their storm-spirits fry rotor drones out of the sky.',
    attack: 'arcane',
    body: 'flesh',
    dps: UNIT_DPS,
    hp: unitHp,
    cost: {
      scrip: whole(HEXER_SCRIP_SHARE * u),
      aether: whole(((1 - HEXER_SCRIP_SHARE) * u) / AETHER_PRICE),
    },
  },
  rigger: {
    id: 'rigger',
    name: 'Riggers',
    blurb: 'Jacked-in drone wranglers. They brick chrome from three blocks away.',
    attack: 'code',
    body: 'drone',
    dps: UNIT_DPS,
    hp: unitHp,
    cost: {
      scrip: whole(RIGGER_SCRIP_SHARE * u),
      aether: whole(((1 - RIGGER_SCRIP_SHARE) * u) / AETHER_PRICE),
    },
  },
  enforcer: {
    id: 'enforcer',
    name: 'Enforcers',
    blurb:
      'Leased corporate exo-frames. Good against everything, best against nothing, and hackable.',
    attack: 'heavy',
    body: 'plated',
    dps: enforcerDps,
    hp: enforcerHp,
    cost: {
      scrip: whole(ENFORCER_SCRIP_SHARE * ENFORCER_VALUE * u),
      aether: whole(((1 - ENFORCER_SCRIP_SHARE) * ENFORCER_VALUE * u) / AETHER_PRICE),
    },
  },
};

/**
 * Attack kind × body kind → damage multiplier. Every cell authored.
 * The triangle: razor (kinetic) > hexer (flesh), hexer (arcane) > rigger
 * (drone), rigger (code) > razor (chrome). Each reverse cell resists.
 * Enforcers hit everything evenly and are soft only to code. Structure is a
 * headquarters: code breaks its ICE, heavy frames batter it.
 */
export const EFFECTIVENESS: Record<AttackKind, Record<BodyKind, number>> = {
  kinetic: { flesh: COUNTER, chrome: 1, drone: RESIST, plated: 0.9, structure: 1 },
  arcane: { drone: COUNTER, flesh: 1, chrome: RESIST, plated: 0.9, structure: 0.8 },
  code: { chrome: COUNTER, drone: 1, flesh: RESIST, plated: 1.3, structure: 1.25 },
  heavy: { chrome: 1, flesh: 1, drone: 1, plated: 1, structure: 1.5 },
};

// TODO(expansion): the engine has no pairing-relation primitive (a kind-pair
// lookup with per-pair terms), so this matrix and its reader are hand-rolled.
export function effectiveness(attacker: UnitKind, target: UnitKind | 'structure'): number {
  const body: BodyKind = target === 'structure' ? 'structure' : UNITS[target].body;
  return EFFECTIVENESS[UNITS[attacker].attack][body];
}

/** A record with one entry per unit kind. */
export function byKind<T>(f: (kind: UnitKind) => T): Record<UnitKind, T> {
  return { razor: f('razor'), hexer: f('hexer'), rigger: f('rigger'), enforcer: f('enforcer') };
}
