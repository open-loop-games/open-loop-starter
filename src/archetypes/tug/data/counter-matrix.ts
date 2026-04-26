import type { CounterMatrix, UnitArchetypeTag } from './types';

// ─── Skeleton ───
// 6×6 damage-multiplier matrix. `counterMatrix[attackerIdx][defenderIdx]`
// reads at the per-tick combat resolver site (leaf 3) — this is plain data,
// NOT a `chain.bind` modifier surface. The row/column order is fixed by
// `units.ts` order; if that order changes, this file must be regenerated.
//
// Two crossed counter cycles per archetypes/tug.md § 8:
//   primary cycle:   light > capital > siege > light
//   secondary cycle: fast > air > special > fast
//
// 6 strong + 6 weak entries = 12 off-diagonal asymmetries; the remaining
// 18 cells are neutral (1.0). Diagonal is 1.0 (unit vs. self).

const DIAGONAL = 1.0;
const NEUTRAL = 1.0;
const STRONG = 1.75;
const WEAK = 0.6;

const ARCHETYPE_ORDER: UnitArchetypeTag[] = [
  'light', // marine    (idx 0)
  'fast', // vulture    (idx 1)
  'siege', // siege-tank (idx 2)
  'air', // wraith     (idx 3)
  'capital', // battlecruiser (idx 4)
  'special', // ghost     (idx 5)
];

/**
 * Tag pairs where the attacker strong-counters the defender (1.75 damage).
 * Each strong entry implies a weak inverse: if A strong-counters B, then
 * B attacking A deals 0.6 damage. Diagonals stay 1.0.
 */
const STRONG_PAIRS: ReadonlyArray<readonly [UnitArchetypeTag, UnitArchetypeTag]> = [
  // primary cycle
  ['light', 'capital'],
  ['capital', 'siege'],
  ['siege', 'light'],
  // secondary cycle
  ['fast', 'air'],
  ['air', 'special'],
  ['special', 'fast'],
];

function buildCounterMatrix(): CounterMatrix {
  const N = ARCHETYPE_ORDER.length;
  const idxOf = new Map(ARCHETYPE_ORDER.map((tag, i) => [tag, i] as const));
  const m: number[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => NEUTRAL));
  for (let i = 0; i < N; i++) m[i][i] = DIAGONAL;
  for (const [strongTag, weakTag] of STRONG_PAIRS) {
    const a = idxOf.get(strongTag)!;
    const d = idxOf.get(weakTag)!;
    m[a][d] = STRONG;
    m[d][a] = WEAK;
  }
  return m;
}

export const COUNTER_MATRIX: CounterMatrix = buildCounterMatrix();
