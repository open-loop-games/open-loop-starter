/**
 * Creep-vs-Creep — content tables and shared types.
 *
 * `hp` is a `DecimalSource` at runtime (combat math uses `Decimal`).
 * The on-wire snapshot stores it as a string — see `PersistedCellState`
 * and the commit/hydrate boundary in `grid.ts`.
 */

import type { DecimalSource } from 'open-loop-engine';

export const FACTION_IDS = ['red', 'blue', 'green', 'yellow'] as const;
export type FactionId = (typeof FACTION_IDS)[number];

export const FACTION_NAMES: Record<FactionId, string> = {
  red: 'Crimson Bloom',
  blue: 'Azure Spore',
  green: 'Verdant Mat',
  yellow: 'Sulfur Web',
};

/** Cell terrain. `rock` is the only impassable kind. */
export type TerrainKind = 'rock' | 'open' | 'spawn' | 'hotspot';

export interface CellState {
  terrain: TerrainKind;
  /** null = neutral / contested. */
  owner: FactionId | null;
  /** Defender HP at this cell. Decimal-valued so chain math composes end-to-end. */
  hp: DecimalSource;
  /** Present iff `terrain === 'hotspot'`. References a {@link HotspotDef}. */
  hotspotId?: string;
  /**
   * Extraction reservoir for hotspot cells; always 0 on other terrain. Depletes
   * proportional to per-tick yield and regenerates at {@link HOTSPOT_REGEN_PER_SEC}
   * of the hotspot's capacity per second. Owning a freshly-replenished hotspot
   * pays out more than squatting on a drained one — that's the "claim next" pressure.
   */
  reservoir: DecimalSource;
}

/**
 * JSON-safe cell shape used for snapshot persistence. Decimal HP round-trips
 * through `Decimal.toString` on commit and `new Decimal` on hydrate — default
 * `JSON.stringify` would coerce a `Decimal` instance into a POJO that loses
 * Decimal semantics on load.
 */
export interface PersistedCellState {
  terrain: TerrainKind;
  owner: FactionId | null;
  hp: string;
  hotspotId?: string;
  reservoir: string;
}

export interface HotspotDef {
  id: string;
  x: number;
  y: number;
  /** Yield-per-second at full capacity. */
  baseYield: number;
  /** Reservoir size. Depleting + slow regen. */
  capacity: number;
}

/**
 * Reservoir regen rate — fraction of capacity per second. 10% per minute per
 * OL-510 spec, set so base extraction (yield = 1/s at full reservoir) always
 * exceeds steady-state regen at a full hotspot, forcing factions to rotate
 * claims instead of squatting.
 */
export const HOTSPOT_REGEN_PER_SEC = 0.1 / 60;

export interface SpawnDef {
  faction: FactionId;
  x: number;
  y: number;
}

export const MAP_WIDTH = 60;
export const MAP_HEIGHT = 60;

/** Goal slot capacity ratchet — see OL-511. */
export const STARTING_GOAL_SLOTS = 1;
export const MAX_GOAL_SLOTS = 5;

// ============================================================================
// Goal types
// ============================================================================

/**
 * Map quadrant ids for `defend:sector-*` goals. Matches the quadrant structure
 * established in `map.ts` (cross-shaped rock walls divide the map into four
 * quadrants; hotspot ids `hs-nw|ne|sw|se` use the same naming).
 */
export const SECTOR_IDS = ['nw', 'ne', 'sw', 'se'] as const;
export type SectorId = (typeof SECTOR_IDS)[number];

/**
 * Goal identifier. Each goal type targets a different chain when active:
 * `claim:hotspot-*` → spread chain, `defend:sector-*` → defense chain,
 * `pressure:faction-*` → attack chain. See `goals.ts` for resolution.
 */
export type GoalId =
  | `claim:hotspot-${string}`
  | `defend:sector-${SectorId}`
  | `pressure:faction-${FactionId}`;

/** Flat multiplier every active goal contributes to its target chain. */
export const GOAL_MULT: DecimalSource = '1.5';

// ============================================================================
// Combat tuning
// ============================================================================

/**
 * HP a cell gets on initial ownership (spawn cells) or after a flip.
 * Combat math uses strings so the Decimal round-trips the snapshot cleanly.
 */
export const BASE_HP: DecimalSource = '100';

/** Per-neighbour attack contribution before chain.apply. */
export const BASE_ATTACK: DecimalSource = '10';

/** Per-cell defense base before chain.apply. */
export const BASE_DEFENSE: DecimalSource = '5';

// ============================================================================
// AI personalities
// ============================================================================

/**
 * Which faction the human player drives. Remaining factions run on AI.
 * Hard-coded for the starter demo; real games would surface this as a setup
 * option.
 */
export const PLAYER_FACTION = 'red' satisfies FactionId;

export type AiPersonality = 'expansionist' | 'defender' | 'pressurist' | 'greedy';

/**
 * Weights fed into `scoreGoal` — all four personalities evaluate the same
 * scoring surface, differentiated only by these knobs. Validates OL-504's
 * "free differentiation from parameters, not code" claim.
 *
 * - `hotspotProximity` — reward claim goals on hotspots geographically near
 *   the faction's spawn (expansionist).
 * - `sectorThreat` — reward defend goals on sectors with enemy-adjacent
 *   frontier cells belonging to this faction (defender).
 * - `enemyDominance` — reward pressure goals on factions whose territory
 *   is largest (pressurist).
 * - `hotspotNearestBias` — reward claim goals on the single unclaimed
 *   hotspot nearest the faction, ignoring everything else (greedy).
 */
export interface AiWeights {
  hotspotProximity: number;
  sectorThreat: number;
  enemyDominance: number;
  hotspotNearestBias: number;
}

export const AI_PERSONALITIES: Record<AiPersonality, AiWeights> = {
  expansionist: { hotspotProximity: 10, sectorThreat: 1, enemyDominance: 2, hotspotNearestBias: 0 },
  defender: { hotspotProximity: 1, sectorThreat: 10, enemyDominance: 1, hotspotNearestBias: 0 },
  pressurist: { hotspotProximity: 2, sectorThreat: 1, enemyDominance: 10, hotspotNearestBias: 0 },
  greedy: { hotspotProximity: 1, sectorThreat: 0, enemyDominance: 1, hotspotNearestBias: 10 },
};

/** Personality assigned to each non-player faction. */
export const FACTION_PERSONALITIES: Record<Exclude<FactionId, typeof PLAYER_FACTION>, AiPersonality> = {
  blue: 'expansionist',
  green: 'defender',
  yellow: 'pressurist',
};

/** Seconds between AI goal-picker ticks. 0.25 Hz per OL-509 spec. */
export const AI_INTERVAL_S = 4;

// ============================================================================
// Per-faction resources + upgrade tree (OL-510)
// ============================================================================

/**
 * Display name for each faction's yield resource. Accumulated from owned
 * hotspots, spent on that faction's upgrade tree. Not meta-currency — that's
 * OL-511. For this round essence resets implicitly via the OL-511 retention
 * policy once that ticket lands.
 */
export const FACTION_ESSENCE_NAMES: Record<FactionId, string> = {
  red: 'Crimson Essence',
  blue: 'Azure Essence',
  green: 'Verdant Essence',
  yellow: 'Sulfur Essence',
};

/**
 * Single linear upgrade dimension per target chain (OL-504 cut list — no
 * branching tech tree). Each upgrade scales one chain by a multiplicative
 * factor-per-level; max level caps the ramp so mid-round economies don't run
 * away before OL-511 round-end + retention policies land.
 */
export type UpgradeTarget = 'yield' | 'spread' | 'attack' | 'defense';

export interface UpgradeDef {
  id: UpgradeTarget;
  name: string;
  description: string;
  baseCost: DecimalSource;
  costScaling: DecimalSource;
  /** Multiplier per level applied as `(1 + perLevel)^amount` via a declarative grant. */
  perLevel: DecimalSource;
}

export const UPGRADE_MAX_LEVEL: DecimalSource = 10;

export const UPGRADE_DEFS: readonly UpgradeDef[] = [
  {
    id: 'yield',
    name: 'Efficient Extraction',
    description: '+25% hotspot yield per level.',
    baseCost: 10,
    costScaling: 1.5,
    perLevel: 0.25,
  },
  {
    id: 'spread',
    name: 'Rapid Colonisation',
    description: '+25% spread rate per level.',
    baseCost: 15,
    costScaling: 1.6,
    perLevel: 0.25,
  },
  {
    id: 'attack',
    name: 'Corrosive Fronts',
    description: '+25% frontier attack per level.',
    baseCost: 20,
    costScaling: 1.75,
    perLevel: 0.25,
  },
  {
    id: 'defense',
    name: 'Reinforced Colonies',
    description: '+25% cell defence per level.',
    baseCost: 20,
    costScaling: 1.75,
    perLevel: 0.25,
  },
];
