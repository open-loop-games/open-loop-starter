import type { PowerUpDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Cost curves lift directly from Vampire Survivors Power-Up tuning. Each tile
// caps at 5 purchases; rerolls/skips/banishes in VS are effectively uncapped,
// but the skeleton ships them as finite (max 5) for balance-probe tractability.
// Forks raise maxLevel per tile when they want the uncapped VS shape.

const STANDARD_COST_5: number[] = [200, 500, 1000, 2000, 4000];

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 8 Power-Up tiles — matches VS's base-game Power-Up density.

export const POWER_UPS: PowerUpDef[] = [
  {
    id: 'might',
    name: 'Might',
    description: '+10% damage per level.',
    effect: { damageMul: 1.1 },
    maxLevel: 5,
    costCurve: STANDARD_COST_5,
  },
  {
    id: 'max-hp',
    name: 'Max Health',
    description: '+10% max HP per level.',
    effect: { hpMul: 1.1 },
    maxLevel: 5,
    costCurve: STANDARD_COST_5,
  },
  {
    id: 'move-speed',
    name: 'Swiftness',
    description: '+5% movement speed per level.',
    effect: { moveSpeedMul: 1.05 },
    maxLevel: 5,
    costCurve: STANDARD_COST_5,
  },
  {
    id: 'magnet',
    name: 'Magnet',
    description: '+0.5 gem-pickup radius per level.',
    effect: { magnetRadius: 0.5 },
    maxLevel: 5,
    costCurve: STANDARD_COST_5,
  },
  {
    id: 'growth',
    name: 'Growth',
    description: '+5% XP gain per level.',
    effect: { xpMul: 1.05 },
    maxLevel: 5,
    costCurve: STANDARD_COST_5,
  },
  {
    id: 'greed',
    name: 'Greed',
    description: '+10% gold gain per level.',
    effect: { goldMul: 1.1 },
    maxLevel: 5,
    costCurve: STANDARD_COST_5,
  },
  {
    id: 'luck',
    name: 'Luck',
    description: '+5% luck per level — rarer items more likely on level-up.',
    effect: { luck: 0.05 },
    maxLevel: 5,
    costCurve: STANDARD_COST_5,
  },
  {
    id: 'reroll',
    name: 'Reroll',
    description: '+1 reroll per level-up.',
    effect: { rerollsPerLevelUp: 1 },
    maxLevel: 5,
    costCurve: [500, 1000, 2000, 4000, 8000],
  },
];

export const POWER_UP_IDS = POWER_UPS.map((p) => p.id) as readonly string[];
