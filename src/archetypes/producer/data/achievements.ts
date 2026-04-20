import type { AchievementDef } from './types';

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 10 production milestones + 10 building-count milestones + 10 hidden = 30.
// Each grants the default 1.02× headline multiplier unless `rewardMultiplier`
// is set explicitly.

// ─── Production milestones ────────────────────────────────────────────────

const PRODUCTION_THRESHOLDS: { id: string; name: string; total: number | string }[] = [
  { id: 'prod-1', name: 'First Crumb', total: 1 },
  { id: 'prod-100', name: 'Warming Up', total: 100 },
  { id: 'prod-10k', name: 'Humble Bakery', total: 10_000 },
  { id: 'prod-1m', name: 'Small Empire', total: 1_000_000 },
  { id: 'prod-1b', name: 'Continental Chain', total: 1_000_000_000 },
  { id: 'prod-1t', name: 'Cookie Barons', total: '1e12' },
  { id: 'prod-1q', name: 'Quadrillion Club', total: '1e15' },
  { id: 'prod-1qi', name: 'Quintillion Tier', total: '1e18' },
  { id: 'prod-1sx', name: 'Sextillion Saints', total: '1e21' },
  { id: 'prod-1sp', name: 'Septillion Sovereigns', total: '1e24' },
];

const productionMilestones: AchievementDef[] = PRODUCTION_THRESHOLDS.map((t) => ({
  id: t.id,
  name: t.name,
  description: `Bake ${typeof t.total === 'number' ? t.total.toLocaleString() : t.total} cookies in total`,
  requirement: (s) => s.primaryLifetimeAtLeast(t.total),
}));

// ─── Building-count milestones ────────────────────────────────────────────

const BUILDING_MILESTONES: { id: string; producer: string; count: number; name: string }[] = [
  { id: 'own-1-cursor', producer: 'cursor', count: 1, name: 'Finger Licking Good' },
  { id: 'own-10-cursor', producer: 'cursor', count: 10, name: 'Ten Digits' },
  { id: 'own-50-cursor', producer: 'cursor', count: 50, name: 'Assembly of Hands' },
  { id: 'own-1-grandma', producer: 'grandma', count: 1, name: 'Grandma Approves' },
  { id: 'own-10-grandma', producer: 'grandma', count: 10, name: 'Grandma Quorum' },
  { id: 'own-1-farm', producer: 'farm', count: 1, name: 'Wheat Harvest' },
  { id: 'own-1-mine', producer: 'mine', count: 1, name: 'Deep Shaft' },
  { id: 'own-1-factory', producer: 'factory', count: 1, name: 'Industrial Revolution' },
  { id: 'own-1-bank', producer: 'bank', count: 1, name: 'Interest Compounds' },
  { id: 'own-1-temple', producer: 'temple', count: 1, name: 'Sacred Dough' },
];

const buildingMilestones: AchievementDef[] = BUILDING_MILESTONES.map((m) => ({
  id: m.id,
  name: m.name,
  description: `Own ${m.count} ${m.producer}${m.count === 1 ? '' : 's'}`,
  requirement: (s) => s.producerCountAtLeast(m.producer, m.count),
}));

// ─── Hidden achievements ──────────────────────────────────────────────────

const hidden: AchievementDef[] = [
  {
    id: 'hidden-first-click',
    name: 'And so it begins',
    description: 'Click the dough for the first time',
    hidden: true,
    requirement: (s) => s.clickCountAtLeast(1),
  },
  {
    id: 'hidden-100-clicks',
    name: 'Repetitive Strain',
    description: 'Click 100 times',
    hidden: true,
    requirement: (s) => s.clickCountAtLeast(100),
  },
  {
    id: 'hidden-1000-clicks',
    name: 'Carpal Champion',
    description: 'Click 1000 times',
    hidden: true,
    requirement: (s) => s.clickCountAtLeast(1000),
  },
  {
    id: 'hidden-first-upgrade',
    name: 'Upgrade Habit',
    description: 'Buy your first cursor upgrade',
    hidden: true,
    requirement: (s) => s.upgradeBought('cursor-boost-i'),
  },
  {
    id: 'hidden-first-global',
    name: 'Big Picture',
    description: 'Buy your first global upgrade',
    hidden: true,
    requirement: (s) => s.upgradeBought('click-x2') || s.upgradeBought('global-x2'),
  },
  {
    id: 'hidden-owns-everything',
    name: 'Full Stack',
    description: 'Own at least one of every producer tier',
    hidden: true,
    requirement: (s) => s.ownsEveryProducer(),
  },
  {
    id: 'hidden-all-tier1',
    name: 'Tier One Tourist',
    description: 'Buy every tier-1 boost upgrade',
    hidden: true,
    requirement: (s) => s.allTier1UpgradesBought(),
  },
  {
    id: 'hidden-no-click-60',
    name: 'Hands Off',
    description: 'Go 60 seconds without clicking',
    hidden: true,
    requirement: (s) => s.secondsSinceLastClick() >= 60,
  },
  {
    id: 'hidden-1e10-lifetime',
    name: 'Billionaire Baker',
    description: 'Reach 10 billion total cookies',
    hidden: true,
    requirement: (s) => s.primaryLifetimeAtLeast('1e10'),
  },
  {
    id: 'hidden-1e30-lifetime',
    name: 'Cosmic Confection',
    description: 'Reach 1e30 total cookies',
    hidden: true,
    requirement: (s) => s.primaryLifetimeAtLeast('1e30'),
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  ...productionMilestones,
  ...buildingMilestones,
  ...hidden,
];
