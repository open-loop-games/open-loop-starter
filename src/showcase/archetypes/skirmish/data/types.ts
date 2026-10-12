// ─── Skeleton ───
// Type definitions for the skirmish tactical layer — unit roster and counter matrix.

export type UnitTypeId = 'trooper' | 'archer' | 'cavalry';

export type UnitArchetypeTag = 'infantry' | 'ranged' | 'cavalry';

export interface UnitTypeDef {
  /** Stable id used in simulation state and options. */
  id: UnitTypeId;
  displayName: string;
  /** Tactical role summary. */
  role: string;
  /** Archetype classification used in the counter matrix. */
  archetypeTag: UnitArchetypeTag;
  /** Maximum health; unit is removed at hp <= 0. */
  hp: number;
  /** Base damage per attack. */
  damage: number;
  /** Distance within which it can attack a target (field units). */
  attackRange: number;
  /** Distance within which it will break off toward an enemy unit rather than
   *  advancing on the enemy base (field units). */
  aggroRange: number;
  /** Movement speed in field units per game-second. */
  speed: number;
  /** Seconds between attacks. */
  attackCooldownSec: number;
  /** Supply cost to spawn. */
  cost: number;
}

/** Square damage multiplier matrix: matrix[attackerIndex][defenderIndex]. */
export type CounterMatrix = readonly (readonly number[])[];

export type PersonaKey = 'rush' | 'investor' | 'skirmish' | 'boom' | 'combined';
export interface TargetingWeights {
  /** Weight on enemy army strength. Positive = target stronger military; negative = target weaker prey. Defaults to 1. */
  armyWeight?: number;
  /** Weight on enemy economic strength (workers). Higher = prioritize macro rivals. Defaults to 1. */
  economyWeight?: number;
  /** Distance decay exponent p >= 0. Higher = prefer geographically closer bases. Defaults to 1. */
  distanceExponent?: number;
  /** Stickiness multiplier applied to the currently targeted base [0..1]. Prevents target fluttering. Defaults to 0.2. */
  focusWeight?: number;
  /** Weight on base vulnerability (favoring damaged bases). Defaults to 0. */
  weaknessWeight?: number;
}

export interface PersonaDef {
  /** Stable id used in options and presets. */
  id: PersonaKey;
  displayName: string;
  /** Tactical playstyle summary. */
  role: string;
  /** Description of strategy and composition. */
  description: string;
  /** Guns-versus-butter split [0, 1). */
  economyShare: number;
  /** Seconds between spawn decisions. */
  cadenceSec: number;
  /** Max units spawned per burst. Infinity = all-in. */
  maxSpawnPerBurst: number;
  /** Calibrated cadence jitter [0, 1] for stochastic runs. */
  cadenceJitter?: number;
  /** Relative draft weights across unit types. */
  composition: Partial<Record<UnitTypeId, number>>;
  /** Meso-AI targeting policy weights for multi-enemy target selection. */
  targeting?: TargetingWeights;
}

export type FactionId = string;

export interface FactionDef {
  /** Stable id (e.g. 'crimson', 'azure', 'emerald', 'amber'). */
  id: FactionId;
  displayName: string;
  /** Primary theme color (hex number, e.g. 0xd9524b). */
  color: number;
  /** Base sprite tint. */
  tint: number;
  /** Accent tints by unit type. */
  typeTint?: Partial<Record<UnitTypeId, number>>;
}

export const CANONICAL_FACTIONS: Record<string, FactionDef> = {
  crimson: {
    id: 'crimson',
    displayName: 'Crimson',
    color: 0xd9524b,
    tint: 0xd9524b,
    typeTint: {
      trooper: 0xd9524b,
      archer: 0xf27d74,
      cavalry: 0x9e241e,
    },
  },
  azure: {
    id: 'azure',
    displayName: 'Azure',
    color: 0x4f86d6,
    tint: 0x4f86d6,
    typeTint: {
      trooper: 0x4f86d6,
      archer: 0x7da8ed,
      cavalry: 0x275296,
    },
  },
  emerald: {
    id: 'emerald',
    displayName: 'Emerald',
    color: 0x2ba84a,
    tint: 0x2ba84a,
    typeTint: {
      trooper: 0x2ba84a,
      archer: 0x5ad478,
      cavalry: 0x1a7231,
    },
  },
  amber: {
    id: 'amber',
    displayName: 'Amber',
    color: 0xe59819,
    tint: 0xe59819,
    typeTint: {
      trooper: 0xe59819,
      archer: 0xf7be5c,
      cavalry: 0xa86c07,
    },
  },
};

export const DEFAULT_TRIAD_FACTIONS: readonly FactionId[] = ['crimson', 'azure', 'emerald'];

export function getFactionDef(id: FactionId): FactionDef {
  if (CANONICAL_FACTIONS[id]) return CANONICAL_FACTIONS[id];
  if (id === 'a') return CANONICAL_FACTIONS.crimson;
  if (id === 'b') return CANONICAL_FACTIONS.azure;
  if (id === 'c') return CANONICAL_FACTIONS.emerald;
  if (id === 'd') return CANONICAL_FACTIONS.amber;
  return {
    id,
    displayName: id.charAt(0).toUpperCase() + id.slice(1),
    color: 0x888888,
    tint: 0x888888,
  };
}
