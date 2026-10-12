// ─── Skeleton ───
// What the lodge buys: the outfitter's gear, priced from each band's budget, and
// the two producers that run while the huntsman is out.

import {
  HOUND_BASE_COST,
  HOUND_PRICE_RATIO,
  SNARE_BASE_COST,
  SNARE_RATE,
  WOOD_RATE,
  WOODCUTTER_BASE_COST,
  bowCost,
  frameCost,
  satchelCost,
  skinCost,
  terrainGearCost,
} from './spine';

/** Every lodge store a price can be paid from. */
export type Currency = 'meat' | 'hide' | 'antler' | 'wood' | 'jerky';

// === GEAR ===

export type GearId =
  | 'waders'
  | 'snowshoes'
  | 'lantern'
  | 'bow'
  | 'frame'
  | 'satchel'
  | 'skin'
  | 'hounds';

export interface GearDef {
  id: GearId;
  displayName: string;
  blurb: string;
  /** Highest level; 1 for one-shot gear. */
  limit: number;
  /** Price of the next level, by current level. */
  cost: (level: number) => Partial<Record<Currency, number>>;
}

const terrainGear = (k: 2 | 3 | 4) => () => terrainGearCost(k);

export const GEAR: readonly GearDef[] = [
  {
    id: 'bow',
    displayName: 'Bow',
    blurb: 'Doubles your draw per level.',
    limit: 4,
    cost: (l) => bowCost(l + 1),
  },
  {
    id: 'frame',
    displayName: 'Pack frame',
    blurb: 'Carry a band deeper’s haul.',
    limit: 4,
    cost: (l) => ({ hide: frameCost(l + 1) }),
  },
  {
    id: 'satchel',
    displayName: 'Satchel',
    blurb: 'Carry more jerky.',
    limit: 3,
    cost: (l) => ({ hide: satchelCost(l + 1) }),
  },
  {
    id: 'skin',
    displayName: 'Waterskin',
    blurb: 'Carry more water between springs.',
    limit: 3,
    cost: (l) => ({ hide: skinCost(l + 1) }),
  },
  { id: 'waders', displayName: 'Waders', blurb: 'Walk the Fen.', limit: 1, cost: terrainGear(2) },
  {
    id: 'snowshoes',
    displayName: 'Snowshoes',
    blurb: 'Walk the Snowfield.',
    limit: 1,
    cost: terrainGear(3),
  },
  {
    id: 'lantern',
    displayName: 'Horn lantern',
    blurb: 'Walk the Deepwood.',
    limit: 1,
    cost: terrainGear(4),
  },
  {
    id: 'hounds',
    displayName: 'Hound',
    blurb: 'Pack +20%, prowess +25%. Eats a quarter of your jerky per tile.',
    limit: 3,
    cost: (l) => ({ meat: Math.round(HOUND_BASE_COST * HOUND_PRICE_RATIO ** l) }),
  },
];

// === LODGE PRODUCERS ===

export type ProducerId = 'woodcutter' | 'snare';

export interface ProducerDef {
  id: ProducerId;
  displayName: string;
  blurb: string;
  output: 'wood' | 'meat';
  payer: 'wood' | 'meat';
  rate: number;
  baseCost: number;
  initial: number;
}

export const PRODUCERS: readonly ProducerDef[] = [
  {
    id: 'woodcutter',
    displayName: 'Woodcutter',
    blurb: 'Fells wood for racks and camps.',
    output: 'wood',
    payer: 'meat',
    rate: WOOD_RATE,
    baseCost: WOODCUTTER_BASE_COST,
    initial: 1,
  },
  {
    id: 'snare',
    displayName: 'Snare line',
    blurb: 'Rabbit snares around the lodge.',
    output: 'meat',
    payer: 'wood',
    rate: SNARE_RATE,
    baseCost: SNARE_BASE_COST,
    initial: 0,
  },
];
