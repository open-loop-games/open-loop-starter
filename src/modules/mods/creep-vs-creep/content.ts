/**
 * Creep-vs-Creep — structural content tables and types.
 *
 * Tuning constants migrated to `vars/{archetype,theme,balance}.ts` during
 * OL-605; what's left here is (a) types referenced by the runtime state
 * shape, and (b) structural content — the *list* of upgrades, the *shape*
 * of an AI personality's weights — that doesn't fit cleanly into the flat
 * `DirectorVars` surface. Fork-level content edits happen here; balance
 * edits happen in `vars/balance.ts`.
 *
 * `hp` is a `DecimalSource` at runtime (combat math uses `Decimal`).
 * The on-wire snapshot stores it as a string — see `PersistedCellState`
 * and the commit/hydrate boundary in `grid.ts`.
 */

import type { DecimalSource } from 'open-loop-engine';

export const FACTION_IDS = ['red', 'blue', 'green', 'yellow'] as const;
export type FactionId = (typeof FACTION_IDS)[number];

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
   * proportional to per-tick yield and regenerates at `balance.hotspotRegenPerSec`
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

export interface SpawnDef {
  faction: FactionId;
  x: number;
  y: number;
}

// ============================================================================
// Meta-currency upgrade defs (OL-511)
// ============================================================================

/**
 * Single shared upgrade tree bought with meta-currency. All entries bind into
 * the player faction's chains, except `slot-capacity` which directly
 * increments `GoalSystem.capacity` (capped at `vars.archetype.maxGoalSlots`).
 * Per-entry `baseCost`, `costScaling`, `perLevel`, and `maxLevel` are content
 * shape — the vars surface is too flat to carry per-row tuning.
 */
export type MetaUpgradeId = 'yield' | 'spread' | 'attack' | 'defense' | 'slot-capacity';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  description: string;
  baseCost: DecimalSource;
  costScaling: DecimalSource;
  /**
   * Multiplier per level for chain upgrades, applied as `(1 + perLevel)^amount`.
   * Unused for `slot-capacity` (which increments a ref directly).
   */
  perLevel: DecimalSource;
  maxLevel: DecimalSource;
}

export function metaUpgradeDefs(
  maxGoalSlots: number,
  startingGoalSlots: number,
): readonly MetaUpgradeDef[] {
  return [
    {
      id: 'yield',
      name: 'Entrenched Extraction',
      description: '+20% hotspot yield per level. Permanent across rounds.',
      baseCost: 5,
      costScaling: 1.6,
      perLevel: 0.2,
      maxLevel: 20,
    },
    {
      id: 'spread',
      name: 'Veteran Vanguard',
      description: '+20% spread rate per level. Permanent across rounds.',
      baseCost: 8,
      costScaling: 1.7,
      perLevel: 0.2,
      maxLevel: 20,
    },
    {
      id: 'attack',
      name: 'Battle-Hardened',
      description: '+20% frontier attack per level. Permanent across rounds.',
      baseCost: 10,
      costScaling: 1.8,
      perLevel: 0.2,
      maxLevel: 20,
    },
    {
      id: 'defense',
      name: 'Dug-In Colonies',
      description: '+20% cell defense per level. Permanent across rounds.',
      baseCost: 10,
      costScaling: 1.8,
      perLevel: 0.2,
      maxLevel: 20,
    },
    {
      id: 'slot-capacity',
      name: 'Strategic Insight',
      description: '+1 active goal slot per level. Caps at the maximum.',
      baseCost: 25,
      costScaling: 3,
      perLevel: 1,
      maxLevel: maxGoalSlots - startingGoalSlots,
    },
  ];
}

// ============================================================================
// Goal types
// ============================================================================

/**
 * Map quadrant ids for `defend:sector-*` goals. Matches the quadrant structure
 * established in `map.ts` (cross-shaped rock walls divide the map into four
 * quadrants; hotspot ids `hs-nw|ne|sw|se` use the same naming). OL-609 expands
 * the id set when the 100×100 Director arena lands.
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

// ============================================================================
// Per-faction essence upgrade defs (OL-510)
// ============================================================================

/**
 * Single linear upgrade dimension per target chain (OL-504 cut list — no
 * branching tech tree). Each upgrade scales one chain by a multiplicative
 * factor-per-level. Per-entry `baseCost` and `costScaling` are content —
 * per-upgrade economy values a fork would edit directly rather than through
 * balance vars.
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

// ============================================================================
// AI personality weight tables
// ============================================================================

export type AiPersonality = 'expansionist' | 'defender' | 'pressurist' | 'greedy';

/**
 * Weights fed into `scoreGoal` — all four personalities evaluate the same
 * scoring surface, differentiated only by these knobs. Validates OL-504's
 * "free differentiation from parameters, not code" claim. Content-structural:
 * a fork adds a fifth personality by adding a row, not by touching vars.
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
