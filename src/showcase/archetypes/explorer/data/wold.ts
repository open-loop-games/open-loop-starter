// ─── Skeleton ───
// The Hartwold's content: its terrain bands and the quarry each holds, and the
// fixed geometry the seeded map is generated on. The generator itself is in
// `modules/wold-map.ts`, because it draws from the engine's seeded RNG.

import { DANGER_PREMIUM, HART_THREAT, threat, yieldAntler, yieldHide, yieldMeat } from './spine';
import type { GearId } from './gear';

// === TERRAIN ===

export type Terrain = 'meadow' | 'forest' | 'marsh' | 'snow' | 'deepwood';

export interface TerrainDef {
  id: Terrain;
  band: number;
  displayName: string;
  /** Gear that makes the terrain walkable; null when none is needed. */
  needs: GearId | null;
  /** Name of the impassable variant scattered through the band. */
  obstacle: string;
}

export const TERRAIN: readonly TerrainDef[] = [
  { id: 'meadow', band: 0, displayName: 'Meadow', needs: null, obstacle: 'Boulder' },
  { id: 'forest', band: 1, displayName: 'Old Forest', needs: null, obstacle: 'Thicket' },
  { id: 'marsh', band: 2, displayName: 'Fen', needs: 'waders', obstacle: 'Mere' },
  { id: 'snow', band: 3, displayName: 'Snowfield', needs: 'snowshoes', obstacle: 'Crag' },
  { id: 'deepwood', band: 4, displayName: 'Deepwood', needs: 'lantern', obstacle: 'Deadfall' },
];

export const terrainOfBand = (band: number): TerrainDef => TERRAIN[Math.max(0, Math.min(4, band))];

// === QUARRY ===

export type SpeciesId =
  | 'hare'
  | 'roe'
  | 'boar'
  | 'elk'
  | 'wolf'
  | 'ibex'
  | 'bear'
  | 'stag'
  | 'aurochs'
  | 'hart';

export interface SpeciesDef {
  id: SpeciesId;
  displayName: string;
  band: number;
  /** Dangerous quarry mauls on a failed hunt; timid quarry only bolts. */
  dangerous: boolean;
  meat: number;
  hide: number;
  antler: number;
  threat: number;
  /** Head a herd tile holds when full. */
  herdSize: number;
  glyph: string;
}

function timid(id: SpeciesId, displayName: string, band: number, glyph: string): SpeciesDef {
  return {
    id,
    displayName,
    band,
    dangerous: false,
    meat: yieldMeat(band),
    hide: yieldHide(band),
    antler: yieldAntler(band),
    // A timid animal is a quarter of the band's danger: an 80% hunt for a matched bow.
    threat: threat(band) / 4,
    herdSize: 3,
    glyph,
  };
}

function dangerous(id: SpeciesId, displayName: string, band: number, glyph: string): SpeciesDef {
  return {
    id,
    displayName,
    band,
    dangerous: true,
    meat: yieldMeat(band) * DANGER_PREMIUM,
    hide: yieldHide(band) * DANGER_PREMIUM,
    antler: yieldAntler(band) * DANGER_PREMIUM,
    threat: threat(band),
    herdSize: 1,
    glyph,
  };
}

export const SPECIES: readonly SpeciesDef[] = [
  timid('hare', 'Hare', 0, 'h'),
  timid('roe', 'Roe deer', 1, 'r'),
  dangerous('boar', 'Boar', 1, 'B'),
  timid('elk', 'Elk', 2, 'e'),
  dangerous('wolf', 'Wolf', 2, 'W'),
  timid('ibex', 'Ibex', 3, 'i'),
  dangerous('bear', 'Bear', 3, 'U'),
  timid('stag', 'Great stag', 4, 's'),
  dangerous('aurochs', 'Aurochs', 4, 'A'),
  {
    id: 'hart',
    displayName: 'The Pale Hart',
    band: 4,
    dangerous: true,
    meat: 0,
    hide: 0,
    antler: 0,
    threat: HART_THREAT,
    herdSize: 1,
    glyph: 'H',
  },
];

export const speciesById = new Map(SPECIES.map((s) => [s.id, s]));

// === GEOMETRY ===

export const MAP_W = 23;
export const MAP_H = 19;
/** The wold regenerates from this seed on every boot; only what play changes is saved. */
export const MAP_SEED = 1729;

export interface Coord {
  x: number;
  y: number;
}

export const LODGE: Coord = { x: 11, y: 17 };
export const LAIR: Coord = { x: 11, y: 1 };

export type Feature = 'lodge' | 'waystone' | 'lookout' | 'cache' | 'lair';
