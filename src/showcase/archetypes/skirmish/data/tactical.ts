// ─── Skeleton ───
// Tactical-sim config — the continuous 2D field, the base, and the unit roster.
// Pure config; the module (`modules/tactical-sim.ts`) owns the Side-keyed
// geometry so this layer stays free of module imports (data → modules is
// one-way).

export type {
  UnitTypeId,
  UnitArchetypeTag,
  UnitTypeDef,
  CounterMatrix,
  PersonaKey,
  PersonaDef,
  FactionId,
  FactionDef,
} from './types';
export { CANONICAL_FACTIONS, DEFAULT_TRIAD_FACTIONS, getFactionDef } from './types';
export { UNITS, UNIT_BY_ID, getUnitDef } from './units';
export {
  COUNTER_MATRIX,
  getCounterMultiplier,
  ARCHETYPE_ORDER,
  STRONG,
  WEAK,
  NEUTRAL,
} from './counter-matrix';
export { PERSONAS, PERSONA_KEYS, getPersonaDef } from './personality';

import { UNIT_BY_ID } from './units';
import type { UnitTypeDef } from './types';

/** Continuous play-field extent (field units, not pixels — the renderer scales).
 *  Scaled to 100x100 square arena for N >= 3 regular N-gon rotational symmetry. */
export const FIELD = { width: 100, height: 100 } as const;
export const FIELD_CENTER = { x: 50, y: 50 } as const;
export const BASE_RADIUS = 38;

export interface BaseGeometry {
  x: number;
  y: number;
  /** Unit tangent vector perpendicular to radial center-to-base direction. */
  tangentX: number;
  tangentY: number;
}

/**
 * Calculate base positions and tangent vectors for an arbitrary faction roster.
 *
 * - N = 1: Center placement.
 * - N = 2: Horizontal mirror placement (12, 50) and (88, 50).
 * - N >= 3: Regular N-gon placement (x_k = 50 + R cos(theta_k), y_k = 50 + R sin(theta_k))
 *   with theta_k = 2*pi*k/N - pi/2, ensuring equal pairwise distances without
 *   spatial bias (d_ij = R*sqrt(3) approx 65.8 at N=3).
 */
export function computeBasePositions(
  factions: readonly string[],
  radius = BASE_RADIUS,
): Record<string, BaseGeometry> {
  const result: Record<string, BaseGeometry> = {};
  const n = factions.length;
  if (n === 0) return result;
  if (n === 1) {
    result[factions[0]] = {
      x: FIELD_CENTER.x,
      y: FIELD_CENTER.y,
      tangentX: 0,
      tangentY: 1,
    };
    return result;
  }
  if (n === 2) {
    // Bilateral horizontal symmetry with margin 6 (x=6 and x=94), preserving 2-player timing
    result[factions[0]] = {
      x: 6,
      y: FIELD_CENTER.y,
      tangentX: 0,
      tangentY: 1,
    };
    result[factions[1]] = {
      x: FIELD.width - 6,
      y: FIELD_CENTER.y,
      tangentX: 0,
      tangentY: 1,
    };
    return result;
  }

  for (let k = 0; k < n; k++) {
    const theta = (2 * Math.PI * k) / n - Math.PI / 2;
    result[factions[k]] = {
      x: FIELD_CENTER.x + radius * Math.cos(theta),
      y: FIELD_CENTER.y + radius * Math.sin(theta),
      // Tangent perpendicular to radial outward vector (cos theta, sin theta)
      tangentX: -Math.sin(theta),
      tangentY: Math.cos(theta),
    };
  }
  return result;
}

/** Base health; a side loses when its base reaches 0. Sized to 50 trooper HP
 *  equivalents so a base requires sustained siege rather than melting on
 *  contact; brings matches nearer the 1.5–2.1m crossover. */
export const BASE_HP = 500;

// ─── Balance ───
// 3-unit rock-paper-scissors roster (trooper, archer, cavalry).
//
// `TROOPER` is the baseline infantry unit and the reference unit for the
// guns-versus-butter split in `./economy.ts` § Balance.
export const TROOPER: UnitTypeDef = UNIT_BY_ID.trooper;
