import type { DefenderDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Tower-cost and per-instance scaling constants. Workbench perturbation
// target. Sim tests in `../sim/defender.sim.test.ts` probe these against
// the § 4 beat map (lands during OL-547 rebuild).

export const DEFENDER_COST_SCALING_DEFAULT = 1.0; // TD convention: fixed per-instance price

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 4 tower archetypes — Kingdom Rush baseline. Tower Defense theme baked
// inline (defender.md § 11 Theme A). Forks override names in place and
// add types by appending to the array.

export const DEFENDERS: DefenderDef[] = [
  // Archer — pierce, early-game baseline.
  {
    id: 'archer',
    name: 'Archer Tower',
    baseDamage: 8,
    baseRange: 3,
    baseAttackSpeed: 1.2,
    damageType: 'pierce',
    purchase: { baseCost: 70, costScaling: DEFENDER_COST_SCALING_DEFAULT },
  },

  // Mage — magic, armor-piercing.
  {
    id: 'mage',
    name: 'Mage Tower',
    baseDamage: 14,
    baseRange: 3,
    baseAttackSpeed: 0.9,
    damageType: 'magic',
    purchase: { baseCost: 120, costScaling: DEFENDER_COST_SCALING_DEFAULT },
  },

  // Splash — AoE, crowd control.
  {
    id: 'splash',
    name: 'Bombard',
    baseDamage: 22,
    baseRange: 2,
    baseAttackSpeed: 0.5,
    damageType: 'splash',
    purchase: { baseCost: 180, costScaling: DEFENDER_COST_SCALING_DEFAULT },
  },

  // Support — adjacency-aura, no direct damage.
  {
    id: 'barracks',
    name: 'Barracks',
    baseDamage: 0,
    baseRange: 0,
    baseAttackSpeed: 0,
    damageType: 'physical',
    purchase: { baseCost: 100, costScaling: DEFENDER_COST_SCALING_DEFAULT },
    adjacencyAura: {
      radius: 2,
      buff: { damageMul: 1.2, speedMul: 1.1 },
    },
  },
];

export const DEFENDER_IDS = DEFENDERS.map((d) => d.id) as readonly string[];
