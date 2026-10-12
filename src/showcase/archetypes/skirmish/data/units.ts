import type { UnitTypeId, UnitTypeDef } from './types';

// ─── Skeleton ───
// 3-unit rock-paper-scissors roster. Order is load-bearing: it fixes the
// row/column index into `counter-matrix.ts`:
//   0: trooper (infantry)
//   1: archer  (ranged)
//   2: cavalry (cavalry)
//
// Tactical triad:
//   - infantry braces against and counters cavalry (1.75x)
//   - cavalry dashes across the field and counters archer (1.75x)
//   - archer picks off advancing infantry from range and counters infantry (1.75x)

export const UNITS: readonly UnitTypeDef[] = [
  {
    id: 'trooper',
    displayName: 'Trooper',
    role: 'Frontline infantry',
    archetypeTag: 'infantry',
    cost: 10,
    hp: 10,
    damage: 3,
    attackRange: 3,
    aggroRange: 12,
    speed: 8,
    attackCooldownSec: 0.5,
  },
  {
    id: 'archer',
    displayName: 'Archer',
    role: 'Ranged skirmisher',
    archetypeTag: 'ranged',
    cost: 12,
    hp: 7,
    damage: 2,
    attackRange: 9,
    aggroRange: 14,
    speed: 7,
    attackCooldownSec: 0.5,
  },
  {
    id: 'cavalry',
    displayName: 'Cavalry',
    role: 'Shock cavalry',
    archetypeTag: 'cavalry',
    cost: 20,
    hp: 16,
    damage: 5,
    attackRange: 3.5,
    aggroRange: 14,
    speed: 13,
    attackCooldownSec: 0.6,
  },
];

export const UNIT_BY_ID: Record<UnitTypeId, UnitTypeDef> = {
  trooper: UNITS[0],
  archer: UNITS[1],
  cavalry: UNITS[2],
};

export function getUnitDef(id: UnitTypeId): UnitTypeDef {
  const def = UNIT_BY_ID[id];
  if (!def) throw new Error(`Unknown unit type id: "${id}"`);
  return def;
}
