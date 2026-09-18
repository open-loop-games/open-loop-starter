// ─── Skeleton ───
// Tactical-sim config — the continuous 2D field, the base, and the unit roster.
// Pure config; the module (`modules/tactical-sim.ts`) owns the Side-keyed
// geometry so this layer stays free of module imports (data → modules is
// one-way).

export type { UnitTypeId, UnitArchetypeTag, UnitTypeDef, CounterMatrix } from './types';
export { UNITS, UNIT_BY_ID, getUnitDef } from './units';
export {
  COUNTER_MATRIX,
  getCounterMultiplier,
  ARCHETYPE_ORDER,
  STRONG,
  WEAK,
  NEUTRAL,
} from './counter-matrix';

import { UNIT_BY_ID } from './units';
import type { UnitTypeDef } from './types';

/** Continuous play-field extent (field units, not pixels — the renderer scales). */
export const FIELD = { width: 100, height: 40 } as const;

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
