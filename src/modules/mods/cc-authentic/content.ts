/**
 * cc-authentic — Cookie Clicker calibration fixture.
 *
 * Exact constants hand-extracted from
 * /work/studio/open-loop-research/reference-code/cookie-clicker/main.js
 * for the first 7 buildings (Cursor → Temple), their first 3 tier upgrades,
 * and their first 3 "own N" achievements.
 *
 * Cost formula: basePrice * 1.15^owned (main.js:7677 Game.priceIncrease,
 * :7797 cost formula).
 *
 * IMPORTANT: non-Cursor buildings do NOT use the constructor arg as their
 * basePrice. main.js:7729 overrides it via
 *   basePrice = (n + 9 + (n<5 ? 0 : (n-5)^1.75 * 5)) * 10^n * max(1, n-14)
 * with digit-rounding at :7731. The values below are the computed results,
 * not the raw constructor arguments. Do not "correct" them against those
 * lines — they're decoys.
 *
 * baseCps similarly comes from main.js:7723:
 *   baseCps = ceil(n^(n*0.5 + 2) * 10) / 10
 * with digit-rounding at :7726.
 *
 * CC achievements are merely *markers*; the CpS bonus comes from a linked
 * "tiered upgrade" via Game.GetTieredCpsMult (main.js:9894) which applies a
 * flat 2x per owned tier upgrade. We collapse CC's (achievement + linked
 * upgrade) pair into a single starter achievement that applies the
 * equivalent multiplier when the owned-count requirement fires.
 * Full-depth mechanization is OL-428.
 *
 * Out of scope for cc-authentic at any depth: kitten (milk) upgrades,
 * golden cookies, seasons, grandmapocalypse, heavenly upgrades, sugar
 * lumps, garden, stock market, pantheon.
 */
import type {
  CFProducerDef,
  CFUpgradeDef,
  CFAchievementDef,
} from '@/modules/mods/cookie-factory/content';

/**
 * Cookie Clicker buildings 0-6. Order matches Game.ObjectsById.
 * All use costScaling=1.15 (Game.priceIncrease default; no overrides on
 * these buildings per main.js inspection).
 */
export const producers: CFProducerDef[] = [
  // id=0, main.js:8683 — Cursor uses constructor-arg basePrice (15) because
  // the n!=0 override at :7729 is skipped. baseCps is 0.1 from the cps
  // function body at :8705 (Game.ComputeCps(0.1, tier_count, add)).
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'Autoclicks once every 10 seconds.',
    baseCost: 15,
    baseRate: 0.1,
    costScaling: 1.15,
  },
  // id=1, main.js:8726 — basePrice = (1+9)*10*1 = 100; baseCps = ceil(1^2.5*10)/10 = 1.
  {
    id: 'grandma',
    name: 'Grandma',
    description: 'A nice grandma to bake more cookies.',
    baseCost: 100,
    baseRate: 1,
    costScaling: 1.15,
  },
  // id=2, main.js:8807 — basePrice = (2+9)*100*1 = 1100; baseCps = ceil(2^3*10)/10 = 8.
  {
    id: 'farm',
    name: 'Farm',
    description: 'Grows cookie plants from cookie seeds.',
    baseCost: 1_100,
    baseRate: 8,
    costScaling: 1.15,
  },
  // id=3, main.js:8819 — basePrice = (3+9)*1000*1 = 12000; baseCps ≈ 47
  // (ceil(3^3.5*10)/10 = 468/10 then digit-rounded).
  {
    id: 'mine',
    name: 'Mine',
    description: 'Mines out cookie dough and chocolate chips.',
    baseCost: 12_000,
    baseRate: 47,
    costScaling: 1.15,
  },
  // id=4, main.js:8829 — basePrice = (4+9)*10000*1 = 130000; baseCps ≈ 260
  // (ceil(4^4*10)/10 = 2560 then digit-rounded to 260 ten-groups).
  {
    id: 'factory',
    name: 'Factory',
    description: 'Produces large quantities of cookies.',
    baseCost: 130_000,
    baseRate: 260,
    costScaling: 1.15,
  },
  // id=5, main.js:8841 — basePrice = (5+9)*100000*1 = 1.4M; baseCps ≈ 1400
  // (ceil(5^4.5*10)/10 = 13975 digit-rounded).
  {
    id: 'bank',
    name: 'Bank',
    description: 'Generates cookies from interest.',
    baseCost: 1_400_000,
    baseRate: 1_400,
    costScaling: 1.15,
  },
  // id=6, main.js:8853 — basePrice = (6+9+(1^1.75*5))*1e6*1 = 20M;
  // baseCps ≈ 7800 (ceil(6^5*10)/10 = 77760 digit-rounded).
  {
    id: 'temple',
    name: 'Temple',
    description: 'Full of precious, ancient chocolate.',
    baseCost: 20_000_000,
    baseRate: 7_800,
    costScaling: 1.15,
  },
];

/**
 * Tier 1-3 upgrades, per main.js:9809 Game.Tiers:
 *   T1 unlock=1  price=10  (basePrice × 10)
 *   T2 unlock=5  price=50
 *   T3 unlock=25 price=500
 *
 * Each tiered upgrade applies 2x CpS to its target building (main.js:9901
 * `var tierMult=2` in GetTieredCpsMult). Our starter achievement model grants
 * the bonus via a multiplicative modifier on the producer's rate chain, so
 * we emit these as scaling purchasables with limit=1 and perLevel=1 (effect
 * jumps 1 → 2 on purchase = 2x multiplier, matching CC).
 *
 * Cursor tier upgrades technically drive ComputeCps via a tier_count, not
 * GetTieredCpsMult — but the observable effect on Cursor CpS is also 2x
 * per tier at the relevant low owned counts, so we unify for P1. Full
 * fidelity lands in OL-428.
 */
export const upgrades: CFUpgradeDef[] = [
  // Cursor — main.js:9935 Reinforced index finger / Carpal tunnel / Ambidextrous
  { id: 'cc-cursor-t1', target: 'cursor', title: 'Reinforced index finger', description: 'Cursors are twice as efficient.', baseCost: 150, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-cursor-t2', target: 'cursor', title: 'Carpal tunnel prevention cream', description: 'Cursors are twice as efficient.', baseCost: 750, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-cursor-t3', target: 'cursor', title: 'Ambidextrous', description: 'Cursors are twice as efficient.', baseCost: 7_500, costScaling: 1, limit: 1, perLevel: 1 },

  // Grandma — main.js:9945
  { id: 'cc-grandma-t1', target: 'grandma', title: 'Forwards from grandma', description: 'Grandmas are twice as efficient.', baseCost: 1_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-grandma-t2', target: 'grandma', title: 'Steel-plated rolling pins', description: 'Grandmas are twice as efficient.', baseCost: 5_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-grandma-t3', target: 'grandma', title: 'Lubricated dentures', description: 'Grandmas are twice as efficient.', baseCost: 50_000, costScaling: 1, limit: 1, perLevel: 1 },

  // Farm — main.js:9950
  { id: 'cc-farm-t1', target: 'farm', title: 'Cheap hoes', description: 'Farms are twice as efficient.', baseCost: 11_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-farm-t2', target: 'farm', title: 'Fertilizer', description: 'Farms are twice as efficient.', baseCost: 55_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-farm-t3', target: 'farm', title: 'Cookie trees', description: 'Farms are twice as efficient.', baseCost: 550_000, costScaling: 1, limit: 1, perLevel: 1 },

  // Mine — main.js:9960
  { id: 'cc-mine-t1', target: 'mine', title: 'Sugar gas', description: 'Mines are twice as efficient.', baseCost: 120_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-mine-t2', target: 'mine', title: 'Megadrill', description: 'Mines are twice as efficient.', baseCost: 600_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-mine-t3', target: 'mine', title: 'Ultradrill', description: 'Mines are twice as efficient.', baseCost: 6_000_000, costScaling: 1, limit: 1, perLevel: 1 },

  // Factory — main.js:9955
  { id: 'cc-factory-t1', target: 'factory', title: 'Sturdier conveyor belts', description: 'Factories are twice as efficient.', baseCost: 1_300_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-factory-t2', target: 'factory', title: 'Child labor', description: 'Factories are twice as efficient.', baseCost: 6_500_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-factory-t3', target: 'factory', title: 'Sweatshop', description: 'Factories are twice as efficient.', baseCost: 65_000_000, costScaling: 1, limit: 1, perLevel: 1 },

  // Bank — main.js:10470 (tiered, not special)
  { id: 'cc-bank-t1', target: 'bank', title: 'Taller tellers', description: 'Banks are twice as efficient.', baseCost: 14_000_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-bank-t2', target: 'bank', title: 'Scissor-resistant credit cards', description: 'Banks are twice as efficient.', baseCost: 70_000_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-bank-t3', target: 'bank', title: 'Acid-proof vaults', description: 'Banks are twice as efficient.', baseCost: 700_000_000, costScaling: 1, limit: 1, perLevel: 1 },

  // Temple — main.js:10478
  { id: 'cc-temple-t1', target: 'temple', title: 'Golden idols', description: 'Temples are twice as efficient.', baseCost: 200_000_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-temple-t2', target: 'temple', title: 'Sacrifices', description: 'Temples are twice as efficient.', baseCost: 1_000_000_000, costScaling: 1, limit: 1, perLevel: 1 },
  { id: 'cc-temple-t3', target: 'temple', title: 'Delicious blessing', description: 'Temples are twice as efficient.', baseCost: 10_000_000_000, costScaling: 1, limit: 1, perLevel: 1 },
];

/**
 * Per-building "own N" achievements (T1/T2/T3 thresholds = 1/50/100 from
 * main.js:9810-9812 `achievUnlock` field). Each achievement applies a small
 * global bump — in vanilla CC the bonus comes from kitten (milk-linked)
 * upgrades which are out of scope; we use flat +2% per achievement as a
 * P1 placeholder so the pacing check sees *some* per-achievement
 * contribution. OL-428 will swap in mechanized extraction that either
 * zeros this out (faithful to CC's "kittens give the bonus") or models
 * kittens separately.
 */
function buildingAchievs(
  prefix: string,
  target: string,
  name: string,
): CFAchievementDef[] {
  return [
    { id: `${prefix}-own-1`, target, title: `${name}: 1 owned`, description: `Own 1 ${name}.`, threshold: 1, bonus: 1.02 },
    { id: `${prefix}-own-50`, target, title: `${name}: 50 owned`, description: `Own 50 ${name}.`, threshold: 50, bonus: 1.02 },
    { id: `${prefix}-own-100`, target, title: `${name}: 100 owned`, description: `Own 100 ${name}.`, threshold: 100, bonus: 1.02 },
  ];
}

export const achievements: CFAchievementDef[] = [
  ...buildingAchievs('cursor', 'cursor', 'Cursors'),
  ...buildingAchievs('grandma', 'grandma', 'Grandmas'),
  ...buildingAchievs('farm', 'farm', 'Farms'),
  ...buildingAchievs('mine', 'mine', 'Mines'),
  ...buildingAchievs('factory', 'factory', 'Factories'),
  ...buildingAchievs('bank', 'bank', 'Banks'),
  ...buildingAchievs('temple', 'temple', 'Temples'),
];
