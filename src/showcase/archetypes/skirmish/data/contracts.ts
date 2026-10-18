/**
 * The map, the contract ladder and the personas that play a seat. A persona is
 * a parameter bundle the one shared policy reads (game/policy.ts); the
 * opposing crews and the player's own automation differ only here.
 */
import type { UnitKind } from './units';
import {
  CONTRACT_INCOME,
  ECON_SHARE,
  MIN_SIEGE_FORCE,
  PAYBACK_HORIZON_S,
  REF_PRESENCE,
} from './spine';

// ─── Skeleton ──────────────────────────────────────────────────────────────

export interface DistrictDef {
  id: string;
  name: string;
  blurb: string;
}

export const DISTRICTS: DistrictDef[] = [
  { id: 'narrows', name: 'Neon Narrows', blurb: 'Noodle stalls under a canopy of dead holo-ads.' },
  {
    id: 'docks',
    name: 'Ashfall Docks',
    blurb: 'Container stacks, smuggler skiffs, rain that tastes of rust.',
  },
  {
    id: 'steps',
    name: 'Spire Steps',
    blurb: 'The stair-streets climbing toward the arcology gates.',
  },
];

export interface Persona {
  /** Production share the seat aims for, by kind. Normalized at read. */
  mix: Partial<Record<UnitKind, number>>;
  /** 0..1: how far the seat bends its mix toward what counters its intel on the other side. */
  counter: number;
  /** Buy hustlers while the next one pays back inside this many seconds. */
  hustlerPayback: number;
  /** Share of income the training floors may draw while hustlers still pay back; after, all of it. */
  armyShare: number;
  /** Ley taps to hold. */
  taps: number;
  /** Research in the order the seat buys it. */
  research: string[];
  /** Assault a held district once this many units stand in it. */
  assaultAt: number;
  /** Pull a squad out when its square-law strength falls below this share of the enemy's. */
  retreatBelow: number;
}

export interface ContractDef {
  id: string;
  /** The opposing crew. */
  rival: string;
  /** What kind of outfit the rival is, for the briefing. */
  outfit: string;
  briefing: string;
  /** What a scout would tell you, before you scout. */
  rumor: string;
  incomeMult: number;
  persona: Persona;
}

// ─── Balance ───────────────────────────────────────────────────────────────
// assaultAt sits above MIN_SIEGE_FORCE so an assault survives the turret; a
// rival that rushes assaults closer to it. hustlerPayback below the spine's
// PAYBACK_HORIZON_S is a crew that stops building economy early; an armyShare
// above the spine's 1 − ECON_SHARE is a crew that rushes.

export const CONTRACTS: ContractDef[] = [
  {
    id: 'gutter-saints',
    rival: 'The Gutter Saints',
    outfit: 'street gang',
    briefing:
      'A chrome gang squats the Narrows and taxes your runners. The Lantern Syndicate wants their safehouse burned out.',
    rumor: 'Word is they run blades. Lots of blades.',
    incomeMult: CONTRACT_INCOME[0],
    persona: {
      mix: { razor: 0.8, hexer: 0.2 },
      counter: 0,
      hustlerPayback: 90,
      armyShare: 0.7,
      taps: 1,
      research: ['smartlink-rounds'],
      assaultAt: MIN_SIEGE_FORCE + 1,
      retreatBelow: 0.3,
    },
  },
  {
    id: 'hollow-choir',
    rival: 'The Hollow Choir',
    outfit: 'talismonger cabal',
    briefing:
      'A cabal of hedge-mages has hexed the Docks shut. Clear their parlor before the shipment rots.',
    rumor: 'Chalk circles in every alley. They lean on spirits, not steel.',
    incomeMult: CONTRACT_INCOME[1],
    persona: {
      mix: { hexer: 0.7, razor: 0.3 },
      counter: 0,
      hustlerPayback: 120,
      armyShare: 0.55,
      taps: 4,
      research: ['spirit-pacts', 'syndicate-ledgers', 'ward-glyphs'],
      assaultAt: MIN_SIEGE_FORCE + 3,
      retreatBelow: 0.4,
    },
  },
  {
    id: 'ninefold',
    rival: 'Ninefold',
    outfit: 'rival runner crew',
    briefing:
      'Another crew took the job you were promised. Show the fixers who finishes contracts.',
    rumor: 'Riggers. The sky over their safehouse hums with rotors.',
    incomeMult: CONTRACT_INCOME[2],
    persona: {
      mix: { rigger: 0.65, razor: 0.35 },
      counter: 0,
      hustlerPayback: PAYBACK_HORIZON_S,
      armyShare: 0.5,
      taps: 3,
      research: ['ice-breakers', 'syndicate-ledgers', 'smartlink-rounds', 'overclocked-fabs'],
      assaultAt: MIN_SIEGE_FORCE + 4,
      retreatBelow: 0.45,
    },
  },
  {
    id: 'kessler-ono',
    rival: 'Kessler-Ono Combine',
    outfit: 'megacorp',
    briefing:
      'The Combine is clearing the Steps for an arcology. Break their forward office and the sprawl is yours.',
    rumor: 'Leased exo-frames, a full roster, and analysts who read your moves.',
    incomeMult: CONTRACT_INCOME[3],
    persona: {
      mix: { razor: 0.3, hexer: 0.25, rigger: 0.25, enforcer: 0.2 },
      counter: 0.5,
      hustlerPayback: PAYBACK_HORIZON_S,
      armyShare: 1 - ECON_SHARE,
      taps: 4,
      research: [
        'syndicate-ledgers',
        'smartlink-rounds',
        'ice-breakers',
        'dermal-weave',
        'spirit-pacts',
        'overclocked-fabs',
      ],
      assaultAt: MIN_SIEGE_FORCE + 5,
      retreatBelow: 0.5,
    },
  },
];

/**
 * The player's automation plays this persona: an even mix bent three-quarters
 * toward counters, hustlers to the spine's horizon, every research line.
 */
export const PLAYER_PERSONA: Persona = {
  mix: { razor: 1, hexer: 1, rigger: 1, enforcer: 0.6 },
  counter: 0.75,
  hustlerPayback: PAYBACK_HORIZON_S,
  armyShare: 1 - ECON_SHARE,
  taps: 3,
  research: [
    'syndicate-ledgers',
    'smartlink-rounds',
    'ice-breakers',
    'spirit-pacts',
    'dermal-weave',
    'overclocked-fabs',
    'ward-glyphs',
  ],
  assaultAt: MIN_SIEGE_FORCE + REF_PRESENCE,
  retreatBelow: 0.5,
};
