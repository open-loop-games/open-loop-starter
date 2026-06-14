import type { UnitDef } from './types';

// ─── Skeleton ───
// 6 unit archetypes — order is load-bearing: it fixes the row/column index
// into `counter-matrix.ts`. Indices: marine=0, vulture=1, siege-tank=2,
// wraith=3, battlecruiser=4, ghost=5. Leaf 3 builds a `Map<id, idx>` from
// this order at module construction.
//
// `archetypeTag` is the engineering tag used by counter-matrix.ts to author
// the rock-paper-scissors+2-axis structure. The two cycles (per § 8):
//   primary cycle:   light > capital > siege > light
//   secondary cycle: fast > air > special > fast
// Strong/weak entries are emitted by counter-matrix.ts based on these tags.

// ─── Costume ───
// Theme C SciFi Armada. unitNames + unitRoles
// follow the Direct Strike / Nexus Wars idiom. Numbers below are first-cut
// placeholders chosen for ratio shape (light-fast-cheap → capital-slow-
// expensive), not for arc-correctness; the tuner retunes against beat bands.

export const UNITS: UnitDef[] = [
  {
    id: 'marine',
    name: 'Marine',
    role: 'Light infantry',
    archetypeTag: 'light',
    cost: 25,
    sendCooldownSec: 2,
    damagePerHit: 4,
    hp: 40,
    walkSpeed: 6,
  },
  {
    id: 'vulture',
    name: 'Vulture',
    role: 'Fast skirmish',
    archetypeTag: 'fast',
    cost: 50,
    sendCooldownSec: 3,
    damagePerHit: 8,
    hp: 60,
    walkSpeed: 10,
  },
  {
    id: 'siege-tank',
    name: 'Siege Tank',
    role: 'Siege artillery',
    archetypeTag: 'siege',
    cost: 150,
    sendCooldownSec: 6,
    damagePerHit: 35,
    hp: 200,
    walkSpeed: 3,
  },
  {
    id: 'wraith',
    name: 'Wraith',
    role: 'Air',
    archetypeTag: 'air',
    cost: 120,
    sendCooldownSec: 5,
    damagePerHit: 14,
    hp: 100,
    walkSpeed: 8,
  },
  {
    id: 'battlecruiser',
    name: 'Battlecruiser',
    role: 'Capital ship',
    archetypeTag: 'capital',
    cost: 400,
    sendCooldownSec: 12,
    damagePerHit: 50,
    hp: 500,
    walkSpeed: 2.5,
  },
  {
    id: 'ghost',
    name: 'Ghost',
    role: 'Special ability',
    archetypeTag: 'special',
    cost: 200,
    sendCooldownSec: 8,
    damagePerHit: 18,
    hp: 80,
    walkSpeed: 5,
  },
];
