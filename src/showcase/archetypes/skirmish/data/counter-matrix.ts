import type { CounterMatrix, UnitArchetypeTag, UnitTypeId } from './types';

// ─── Skeleton ───
// 3x3 damage-multiplier matrix. `COUNTER_MATRIX[attackerIdx][defenderIdx]` reads
// at the per-tick combat resolver site in `modules/tactical-sim.ts`. Plain data,
// following the tug `data/counter-matrix.ts` pattern.
//
// Rock-paper-scissors cycle:
//   infantry > cavalry > ranged > infantry
//
// 3 strong + 3 weak entries = 6 off-diagonal asymmetries; diagonal is 1.0 (self).

export const DIAGONAL = 1.0;
export const NEUTRAL = 1.0;
export const STRONG = 1.75;
export const WEAK = 0.6;

export const ARCHETYPE_ORDER: readonly UnitArchetypeTag[] = [
  'infantry', // trooper (idx 0)
  'ranged', // archer  (idx 1)
  'cavalry', // cavalry (idx 2)
];

const STRONG_PAIRS: ReadonlyArray<readonly [UnitArchetypeTag, UnitArchetypeTag]> = [
  ['infantry', 'cavalry'],
  ['cavalry', 'ranged'],
  ['ranged', 'infantry'],
];

const TAG_INDEX: Record<UnitArchetypeTag, number> = {
  infantry: 0,
  ranged: 1,
  cavalry: 2,
};

function buildCounterMatrix(): CounterMatrix {
  const N = ARCHETYPE_ORDER.length;
  const m: number[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => NEUTRAL));
  for (let i = 0; i < N; i++) m[i][i] = DIAGONAL;
  for (const [strongTag, weakTag] of STRONG_PAIRS) {
    const a = TAG_INDEX[strongTag];
    const d = TAG_INDEX[weakTag];
    m[a][d] = STRONG;
    m[d][a] = WEAK;
  }
  return m;
}

export const COUNTER_MATRIX: CounterMatrix = buildCounterMatrix();

const UNIT_INDEX: Record<UnitTypeId, number> = {
  trooper: 0,
  archer: 1,
  cavalry: 2,
};

/**
 * Returns the damage multiplier for an attack by `attackerType` against `defenderType`.
 * Returns 1.0 if either unit type is unknown or for self/mirror types.
 */
export function getCounterMultiplier(attackerType: UnitTypeId, defenderType: UnitTypeId): number {
  const aIdx = UNIT_INDEX[attackerType];
  const dIdx = UNIT_INDEX[defenderType];
  if (aIdx === undefined || dIdx === undefined) return NEUTRAL;
  return COUNTER_MATRIX[aIdx][dIdx];
}
