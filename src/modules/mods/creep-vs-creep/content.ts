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
}

export interface HotspotDef {
  id: string;
  x: number;
  y: number;
  /** Yield-per-second at full capacity. */
  baseYield: number;
  /** Reservoir size. Depleting + slow regen lands in OL-510. */
  capacity: number;
}

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
