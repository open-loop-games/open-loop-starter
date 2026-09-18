// ─── Skeleton ───
// Type definitions for the skirmish tactical layer — unit roster and counter matrix.

export type UnitTypeId = 'trooper' | 'archer' | 'cavalry';

export type UnitArchetypeTag = 'infantry' | 'ranged' | 'cavalry';

export interface UnitTypeDef {
  /** Stable identifier used in simulation state and options. */
  id: UnitTypeId;
  /** Display name. */
  name: string;
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
