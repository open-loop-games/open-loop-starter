/**
 * Cookie Factory — content tables.
 *
 * Synthesized content, original theme. Curve shape informed by the spread
 * across Cookie Clicker (1.15 exponential), AdVenture Capitalist (~doubling
 * cadence), and Derivative Clicker (deep multiplier stacks). Not a clone of
 * any one of them.
 *
 * Stays pure data + local types — no engine imports, no install logic.
 * cc-authentic has a sibling file with the same shape and CC constants.
 */

export interface CFProducerDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  baseRate: number;
  costScaling: number;
}

export interface CFUpgradeDef {
  id: string;
  target: string;
  title: string;
  description: string;
  baseCost: number;
  costScaling: number;
  limit: number;
  /** Per-level additive amount; effect.value = 1 + level * perLevel */
  perLevel: number;
}

export interface CFAchievementDef {
  id: string;
  /**
   * Producer id to watch, or `'global'` for a total-cookies threshold.
   * Per-producer achievements push their bonus onto that producer's rate
   * chain; global achievements push onto the surface-wide production chain.
   */
  target: string | 'global';
  title: string;
  description: string;
  /**
   * For per-producer targets: owned count that triggers the achievement.
   * For `global`: total cookies threshold.
   */
  threshold: number;
  /** Multiplier applied when earned (e.g. 1.05 = +5%) */
  bonus: number;
}

/** 7 producer tiers, exponential curve at m=1.15. */
export const producers: CFProducerDef[] = [
  {
    id: 'oven-mitt',
    name: 'Oven Mitt',
    description: 'A lucky pair of hands.',
    baseCost: 10,
    baseRate: 0.1,
    costScaling: 1.15,
  },
  {
    id: 'dough-mixer',
    name: 'Dough Mixer',
    description: 'Kneads, folds, repeats.',
    baseCost: 100,
    baseRate: 1,
    costScaling: 1.15,
  },
  {
    id: 'cookie-press',
    name: 'Cookie Press',
    description: 'Stamps dough into the shape of success.',
    baseCost: 1_100,
    baseRate: 8,
    costScaling: 1.15,
  },
  {
    id: 'conveyor',
    name: 'Conveyor Line',
    description: 'Infinite cookies, one belt at a time.',
    baseCost: 12_000,
    baseRate: 50,
    costScaling: 1.15,
  },
  {
    id: 'bakery',
    name: 'Automated Bakery',
    description: 'Industrial cookie output.',
    baseCost: 150_000,
    baseRate: 300,
    costScaling: 1.15,
  },
  {
    id: 'franchise',
    name: 'Franchise HQ',
    description: 'Global supply chain, now with cookies.',
    baseCost: 2_000_000,
    baseRate: 2_000,
    costScaling: 1.15,
  },
  {
    id: 'cookiemancer',
    name: 'Cookiemancer',
    description: 'Summons cookies from the aether.',
    baseCost: 25_000_000,
    baseRate: 15_000,
    costScaling: 1.15,
  },
];

/**
 * Per-producer scaling upgrades. Each upgrade has 3 levels, +100% per level,
 * cost 10x per level. Stacks multiplicatively with achievements via the
 * producer's rate chain.
 */
export const upgrades: CFUpgradeDef[] = [
  {
    id: 'sharper-mitt',
    target: 'oven-mitt',
    title: 'Sharper Mitt',
    description: '+100% Oven Mitt rate per level.',
    baseCost: 100,
    costScaling: 10,
    limit: 3,
    perLevel: 1,
  },
  {
    id: 'power-mixer',
    target: 'dough-mixer',
    title: 'Power Mixer',
    description: '+100% Dough Mixer rate per level.',
    baseCost: 1_000,
    costScaling: 10,
    limit: 3,
    perLevel: 1,
  },
  {
    id: 'stamping-dies',
    target: 'cookie-press',
    title: 'Stamping Dies',
    description: '+100% Cookie Press rate per level.',
    baseCost: 11_000,
    costScaling: 10,
    limit: 3,
    perLevel: 1,
  },
  {
    id: 'lubricated-belts',
    target: 'conveyor',
    title: 'Lubricated Belts',
    description: '+100% Conveyor Line rate per level.',
    baseCost: 120_000,
    costScaling: 10,
    limit: 3,
    perLevel: 1,
  },
  {
    id: 'big-data',
    target: 'bakery',
    title: 'Big Data',
    description: '+100% Automated Bakery rate per level.',
    baseCost: 1_500_000,
    costScaling: 10,
    limit: 3,
    perLevel: 1,
  },
  {
    id: 'franchise-model',
    target: 'franchise',
    title: 'Franchise Model',
    description: '+100% Franchise HQ rate per level.',
    baseCost: 20_000_000,
    costScaling: 10,
    limit: 3,
    perLevel: 1,
  },
  {
    id: 'arcane-bindings',
    target: 'cookiemancer',
    title: 'Arcane Bindings',
    description: '+100% Cookiemancer rate per level.',
    baseCost: 250_000_000,
    costScaling: 10,
    limit: 3,
    perLevel: 1,
  },
];

/**
 * Achievements grant milestone multipliers that stack onto the producer's
 * rate chain (per-producer) or the global production chain (global).
 *
 * Three thresholds per producer (10 / 50 / 100 owned) granting +5% / +10% /
 * +20% to that specific producer. Plus a handful of global "total X" bumps.
 */
export const achievements: CFAchievementDef[] = [
  // Per-producer owned-count ladders — one per first-6 producers for now;
  // the 7th (cookiemancer) gets its milestone bumps from global thresholds.
  { id: 'mitt-1', target: 'oven-mitt', title: 'Mitten Rookie', description: 'Own 10 Oven Mitts.', threshold: 10, bonus: 1.05 },
  { id: 'mitt-2', target: 'oven-mitt', title: 'Mitten Veteran', description: 'Own 50 Oven Mitts.', threshold: 50, bonus: 1.10 },
  { id: 'mitt-3', target: 'oven-mitt', title: 'Mitten Master', description: 'Own 100 Oven Mitts.', threshold: 100, bonus: 1.20 },

  { id: 'mixer-1', target: 'dough-mixer', title: 'Dough Drafter', description: 'Own 10 Dough Mixers.', threshold: 10, bonus: 1.05 },
  { id: 'mixer-2', target: 'dough-mixer', title: 'Dough Whisperer', description: 'Own 50 Dough Mixers.', threshold: 50, bonus: 1.10 },
  { id: 'mixer-3', target: 'dough-mixer', title: 'Dough Sovereign', description: 'Own 100 Dough Mixers.', threshold: 100, bonus: 1.20 },

  { id: 'press-1', target: 'cookie-press', title: 'Press Apprentice', description: 'Own 10 Cookie Presses.', threshold: 10, bonus: 1.05 },
  { id: 'press-2', target: 'cookie-press', title: 'Press Artisan', description: 'Own 50 Cookie Presses.', threshold: 50, bonus: 1.10 },
  { id: 'press-3', target: 'cookie-press', title: 'Press Titan', description: 'Own 100 Cookie Presses.', threshold: 100, bonus: 1.20 },

  { id: 'conveyor-1', target: 'conveyor', title: 'Belt Breaker', description: 'Own 10 Conveyor Lines.', threshold: 10, bonus: 1.05 },
  { id: 'conveyor-2', target: 'conveyor', title: 'Belt Baron', description: 'Own 50 Conveyor Lines.', threshold: 50, bonus: 1.10 },
  { id: 'conveyor-3', target: 'conveyor', title: 'Belt Monarch', description: 'Own 100 Conveyor Lines.', threshold: 100, bonus: 1.20 },

  { id: 'bakery-1', target: 'bakery', title: 'Bakery Opener', description: 'Own 10 Automated Bakeries.', threshold: 10, bonus: 1.05 },
  { id: 'bakery-2', target: 'bakery', title: 'Bakery Mogul', description: 'Own 50 Automated Bakeries.', threshold: 50, bonus: 1.10 },
  { id: 'bakery-3', target: 'bakery', title: 'Bakery Empire', description: 'Own 100 Automated Bakeries.', threshold: 100, bonus: 1.20 },

  { id: 'franchise-1', target: 'franchise', title: 'Franchisor', description: 'Own 10 Franchise HQs.', threshold: 10, bonus: 1.05 },
  { id: 'franchise-2', target: 'franchise', title: 'Franchisee King', description: 'Own 50 Franchise HQs.', threshold: 50, bonus: 1.10 },
  { id: 'franchise-3', target: 'franchise', title: 'Franchise Galaxy', description: 'Own 100 Franchise HQs.', threshold: 100, bonus: 1.20 },

  // Global cookie-count milestones — bump total production.
  { id: 'global-1', target: 'global', title: 'Fresh Out', description: 'Bake your first cookie.', threshold: 1, bonus: 1.02 },
  { id: 'global-2', target: 'global', title: 'Batch Baker', description: 'Bake 1 million cookies.', threshold: 1_000_000, bonus: 1.10 },
  { id: 'global-3', target: 'global', title: 'Cookie Kingdom', description: 'Bake 1 billion cookies.', threshold: 1_000_000_000, bonus: 1.20 },
];
