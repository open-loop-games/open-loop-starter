// ─── Skeleton ───
// The four troops a keep raises. One purchase is a squad: its members share the squad's hp
// and damage, so a squad of five yeomen is five bodies at a fifth of the squad each. Each
// side names everything twice; `ours` is how Fairhold speaks of its own, `theirs` how it
// speaks of the enemy's.

export type TroopId = 'pike' | 'bow' | 'horse' | 'siege';

export interface TroopDef {
  id: TroopId;
  /** Members one purchase fields. */
  squad: number;
  /** Rank in a released wave: lower forms nearer the enemy. */
  rank: number;
  /** Squad price, in seconds of base income. */
  costSeconds: number;
  /** Seconds a member takes to kill one of its own kind: the role knob. */
  duelSeconds: number;
  /** Seconds to walk the causeway end to end. */
  crossSeconds: number;
  /** Paces a member strikes at. */
  reach: number;
  /** The troop this one strikes at the counter sharpness, and takes its inverse from. */
  beats?: TroopId;
  /** Rides past whatever stands between it and the troop it beats, once that troop is in sight. */
  charges?: boolean;
  /** Ignores cover, must close to the gate, and batters it at full damage. */
  breaksWalls?: boolean;
  /** Battle second from which it can be bought. */
  arrivesAt?: number;
  /** Raised by the player once this boon is held; by the rival from this rung. */
  charter?: { boon: string; rivalRung: number };
  ours: { name: string; role: string };
  theirs: { name: string };
}

export const TROOPS: TroopDef[] = [
  {
    id: 'pike',
    squad: 5,
    rank: 0,
    costSeconds: 4,
    duelSeconds: 8,
    crossSeconds: 18,
    reach: 2.5,
    beats: 'horse',
    ours: { name: 'Stout Yeomen', role: 'Cheap, many, stubborn. Stops a charge cold.' },
    theirs: { name: 'the Rabble' },
  },
  {
    id: 'horse',
    squad: 2,
    rank: 1,
    costSeconds: 6,
    duelSeconds: 4,
    crossSeconds: 7,
    reach: 2,
    beats: 'bow',
    charges: true,
    ours: { name: 'the Knights', role: 'Fast and dear. Rides down bowmen.' },
    theirs: { name: 'horse thieves' },
  },
  {
    id: 'bow',
    squad: 3,
    rank: 2,
    costSeconds: 5,
    duelSeconds: 3,
    crossSeconds: 14,
    reach: 10,
    beats: 'pike',
    charter: { boon: 'longbow', rivalRung: 1 },
    ours: { name: 'Bowmen of the Shire', role: 'Shoot over our own line. Pikes are easy marks.' },
    theirs: { name: 'skulking slingers' },
  },
  {
    id: 'siege',
    squad: 1,
    rank: 3,
    costSeconds: 16,
    duelSeconds: 1,
    crossSeconds: 30,
    reach: 20,
    breaksWalls: true,
    arrivesAt: 120,
    ours: { name: 'Our Mangonel', role: 'Slow and dearer still. Ignores walls; batters the gate.' },
    theirs: { name: 'their infernal engine' },
  },
];

export const TROOP_IDS = TROOPS.map((t) => t.id);

export function troop(id: TroopId): TroopDef {
  return TROOPS.find((t) => t.id === id)!;
}
