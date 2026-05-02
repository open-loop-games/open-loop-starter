import type { AchievementDef } from './types';

// ─── Production milestones ────────────────────────────────────────────────
// antimatter producer count ladder: vanilla canonical: SynergismOfficial/src/Achievements.ts:2152–2228
// (prestigeCount thresholds 1, 10, 100, 1000, 10000 mapped to prestige tier)

const ANTIMATTER_PRODUCER_THRESHOLDS: { id: string; name: string; count: number; tier: string }[] =
  [
    { id: 'antimatter-prod-1', name: 'Fresh Start', count: 1, tier: 'antimatter' },
    { id: 'antimatter-prod-5', name: 'Steady Output', count: 5, tier: 'antimatter' },
    { id: 'antimatter-prod-25', name: 'Multiplying Force', count: 25, tier: 'antimatter' },
  ];

const antimatterMilestones: AchievementDef[] = ANTIMATTER_PRODUCER_THRESHOLDS.map((t) => ({
  id: t.id,
  name: t.name,
  description: `Own ${t.count} antimatter producer${t.count === 1 ? '' : 's'}`,
  tier: 'antimatter',
  // vanilla canonical: SynergismOfficial/src/Achievements.ts:firstOwnedCoin group ladder at line 2152
  requirement: (s) => s.producerCountAtLeast('antimatter-1', t.count),
}));

// ─── Prestige tier production milestones ──────────────────────────────────
// prestige point gain ladder: vanilla canonical: SynergismOfficial/src/Achievements.ts:2504–2507
// threshold values 1, 1e6, 1e100 mapped to scaler prestige currency

const PRESTIGE_POINT_THRESHOLDS: { id: string; name: string; amount: string }[] = [
  { id: 'prestige-points-1', name: 'Prestige Unlocked', amount: '1' },
  { id: 'prestige-points-1m', name: 'Million Prestige', amount: '1e6' },
  { id: 'prestige-points-1e30', name: 'Quintillion Club', amount: '1e30' },
];

const prestigePointMilestones: AchievementDef[] = PRESTIGE_POINT_THRESHOLDS.map((t) => ({
  id: t.id,
  name: t.name,
  description: `Gain ${t.amount} prestige points total`,
  tier: 'prestige',
  // vanilla canonical: SynergismOfficial/src/Achievements.ts:prestigePointGain group (line 2504)
  requirement: (s) => s.prestigePointsAtLeast(t.amount),
}));

// prestige producer count ladder
const PRESTIGE_PRODUCER_THRESHOLDS: { id: string; name: string; count: number }[] = [
  { id: 'prestige-prod-1', name: 'Diamond Collector', count: 1 },
  { id: 'prestige-prod-5', name: 'Diamond Abundance', count: 5 },
  { id: 'prestige-prod-25', name: 'Diamond Majesty', count: 25 },
];

const prestigeProducerMilestones: AchievementDef[] = PRESTIGE_PRODUCER_THRESHOLDS.map((t) => ({
  id: t.id,
  name: t.name,
  description: `Own ${t.count} prestige producer${t.count === 1 ? '' : 's'}`,
  tier: 'prestige',
  // vanilla canonical: SynergismOfficial/src/Achievements.ts:secondOwnedCoin group (line 2484)
  requirement: (s) => s.producerCountAtLeast('prestige-1', t.count),
}));

// ─── Transcend tier production milestones ─────────────────────────────────
// transcend point gain ladder: vanilla canonical: SynergismOfficial/src/Achievements.ts:2528–2531
// threshold values 1, 1e6, 1e50 mapped to scaler transcend currency

const TRANSCEND_POINT_THRESHOLDS: { id: string; name: string; amount: string }[] = [
  { id: 'transcend-points-1', name: 'Transcendence Begins', amount: '1' },
  { id: 'transcend-points-1m', name: 'Transcend Million', amount: '1e6' },
  { id: 'transcend-points-1e50', name: 'Cosmic Transcender', amount: '1e50' },
];

const transcendPointMilestones: AchievementDef[] = TRANSCEND_POINT_THRESHOLDS.map((t) => ({
  id: t.id,
  name: t.name,
  description: `Gain ${t.amount} transcend points total`,
  tier: 'transcend',
  // vanilla canonical: SynergismOfficial/src/Achievements.ts:transcendPointGain group (line 2528)
  requirement: (s) => s.transcendPointsAtLeast(t.amount),
}));

// transcend producer count ladder
const TRANSCEND_PRODUCER_THRESHOLDS: { id: string; name: string; count: number }[] = [
  { id: 'transcend-prod-1', name: 'Mythos Seeker', count: 1 },
  { id: 'transcend-prod-5', name: 'Mythos Weaver', count: 5 },
  { id: 'transcend-prod-25', name: 'Mythos Master', count: 25 },
];

const transcendProducerMilestones: AchievementDef[] = TRANSCEND_PRODUCER_THRESHOLDS.map((t) => ({
  id: t.id,
  name: t.name,
  description: `Own ${t.count} transcend producer${t.count === 1 ? '' : 's'}`,
  tier: 'transcend',
  // vanilla canonical: SynergismOfficial/src/Achievements.ts:thirdOwnedCoin group (line 2488)
  requirement: (s) => s.producerCountAtLeast('transcend-1', t.count),
}));

// ─── Prestige reset count ladder ──────────────────────────────────────────
// vanilla canonical: SynergismOfficial/src/Achievements.ts:prestigeCount group (line 2500)
// thresholds 1, 10, 100, 1000, 10000 per Synergism line 2152–2228

const PRESTIGE_COUNT_THRESHOLDS: { id: string; name: string; count: number }[] = [
  { id: 'prestige-count-1', name: 'First Reset', count: 1 },
  { id: 'prestige-count-10', name: 'Prestige Habit', count: 10 },
  { id: 'prestige-count-100', name: 'Century Resetter', count: 100 },
  { id: 'prestige-count-1k', name: 'Thousand Times', count: 1000 },
  { id: 'prestige-count-10k', name: 'Ten Thousand Resets', count: 10000 },
];

const prestigeCountMilestones: AchievementDef[] = PRESTIGE_COUNT_THRESHOLDS.map((t) => ({
  id: t.id,
  name: t.name,
  description: `Perform prestige reset ${t.count}+ times`,
  tier: 'prestige',
  // vanilla canonical: SynergismOfficial/src/Achievements.ts:prestigeCount group thresholds (line 2152–2228)
  requirement: (s) => s.prestigeCountAtLeast(t.count),
}));

// ─── Transcension reset count ladder ───────────────────────────────────────
// vanilla canonical: SynergismOfficial/src/Achievements.ts:transcensionCount group (line 2524)
// thresholds 1, 10, 100, 1000, 10000 per Synergism line 2233–2283

const TRANSCENSION_COUNT_THRESHOLDS: { id: string; name: string; count: number }[] = [
  { id: 'transcension-count-1', name: 'First Transcendence', count: 1 },
  { id: 'transcension-count-10', name: 'Transcend Tradition', count: 10 },
  { id: 'transcension-count-100', name: 'Century Transcender', count: 100 },
  { id: 'transcension-count-1k', name: 'Thousand Ascensions', count: 1000 },
  { id: 'transcension-count-10k', name: 'Ten Thousand Transcend', count: 10000 },
];

const transcensionCountMilestones: AchievementDef[] = TRANSCENSION_COUNT_THRESHOLDS.map((t) => ({
  id: t.id,
  name: t.name,
  description: `Perform transcension reset ${t.count}+ times`,
  tier: 'transcend',
  // vanilla canonical: SynergismOfficial/src/Achievements.ts:transcensionCount group thresholds (line 2233–2283)
  requirement: (s) => s.transcensionCountAtLeast(t.count),
}));

// ─── Challenge completion ─────────────────────────────────────────────────
// vanilla canonical: SynergismOfficial/src/Achievements.ts:challenge1–challenge5 groups (line 2532–2550)

const challengeCompletions: AchievementDef[] = [
  {
    id: 'challenge-1-first',
    name: 'Challenge One Complete',
    description: 'Complete Challenge 1 for the first time',
    tier: 'transcend',
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:challenge1 group (line 2532)
    requirement: (s) => s.challengeCompletionsAtLeast('challenge-1', 1),
  },
  {
    id: 'challenge-2-first',
    name: 'Challenge Two Complete',
    description: 'Complete Challenge 2 for the first time',
    tier: 'transcend',
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:challenge2 group (line 2536)
    requirement: (s) => s.challengeCompletionsAtLeast('challenge-2', 1),
  },
  {
    id: 'challenge-3-first',
    name: 'Challenge Three Complete',
    description: 'Complete Challenge 3 for the first time',
    tier: 'transcend',
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:challenge3 group (line 2540)
    requirement: (s) => s.challengeCompletionsAtLeast('challenge-3', 1),
  },
  {
    id: 'challenge-4-first',
    name: 'Challenge Four Complete',
    description: 'Complete Challenge 4 for the first time',
    tier: 'transcend',
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:challenge4 group (line 2544)
    requirement: (s) => s.challengeCompletionsAtLeast('challenge-4', 1),
  },
  {
    id: 'challenge-5-first',
    name: 'Challenge Five Complete',
    description: 'Complete Challenge 5 for the first time',
    tier: 'transcend',
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:challenge5 group (line 2548)
    requirement: (s) => s.challengeCompletionsAtLeast('challenge-5', 1),
  },
];

// ─── Hidden achievements ──────────────────────────────────────────────────
// vanilla canonical: SynergismOfficial/src/Achievements.ts:ungroupedAchievementData (line 2685)

const hidden: AchievementDef[] = [
  {
    id: 'hidden-speedrunner',
    name: 'Speedrunner',
    description: 'Complete a prestige in under 5 minutes',
    tier: 'prestige',
    hidden: true,
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:veryFast ungrouped (line 2816)
    requirement: (s) => s.fastestPrestigeUnder(300),
  },
  {
    id: 'hidden-diamond-doubter',
    name: 'Diamond Doubter',
    description: 'Prestige 5 times before unlocking transcension',
    tier: 'prestige',
    hidden: true,
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:diamondSearch ungrouped (line 2721)
    requirement: (s) => s.prestigeCountAtLeast(5),
  },
  {
    id: 'hidden-first-prestige',
    name: 'First Prestige',
    description: 'Perform your first prestige reset',
    tier: 'prestige',
    hidden: true,
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:prestigeNoMult ungrouped (line 2691)
    requirement: (s) => s.prestigeCountAtLeast(1),
  },
  {
    id: 'hidden-first-transcend',
    name: 'First Transcendence',
    description: 'Perform your first transcend reset',
    tier: 'transcend',
    hidden: true,
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:transcendNoMult ungrouped (line 2696)
    requirement: (s) => s.transcensionCountAtLeast(1),
  },
  {
    id: 'hidden-all-challenges-cleared',
    name: 'Challenge Master',
    description: 'Complete all 5 challenges',
    tier: 'transcend',
    hidden: true,
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:sadisticAch ungrouped (line 2866)
    // (adapted: all 5 challenges vs. challenge 15 in Synergism)
    requirement: (s) =>
      s.challengeCompletionsAtLeast('challenge-1', 1) &&
      s.challengeCompletionsAtLeast('challenge-2', 1) &&
      s.challengeCompletionsAtLeast('challenge-3', 1) &&
      s.challengeCompletionsAtLeast('challenge-4', 1) &&
      s.challengeCompletionsAtLeast('challenge-5', 1),
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  ...antimatterMilestones,
  ...prestigePointMilestones,
  ...prestigeProducerMilestones,
  ...transcendPointMilestones,
  ...transcendProducerMilestones,
  ...prestigeCountMilestones,
  ...transcensionCountMilestones,
  ...challengeCompletions,
  ...hidden,
];
