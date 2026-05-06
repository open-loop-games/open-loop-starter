import type { Gate } from 'open-loop-engine';
import type { AchievementDef } from './types';

// ─── Production milestones ────────────────────────────────────────────────
// antimatter producer count ladder: vanilla canonical: SynergismOfficial/src/Achievements.ts:2152–2228
// (firstOwnedCoin group ladder). count-gte reads CategoryEntry.count via
// findCategoryEntrySignals — no archetype-side accessor.

const ANTIMATTER_PRODUCER_THRESHOLDS: { id: string; name: string; count: number }[] = [
  { id: 'antimatter-prod-1', name: 'Fresh Start', count: 1 },
  { id: 'antimatter-prod-5', name: 'Steady Output', count: 5 },
  { id: 'antimatter-prod-25', name: 'Multiplying Force', count: 25 },
];

const antimatterMilestones: AchievementDef[] = ANTIMATTER_PRODUCER_THRESHOLDS.map((t) => ({
  id: t.id,
  name: t.name,
  description: `Own ${t.count} antimatter producer${t.count === 1 ? '' : 's'}`,
  tier: 'antimatter',
  // vanilla canonical: SynergismOfficial/src/Achievements.ts:firstOwnedCoin group ladder at line 2152
  requirement: {
    kind: 'count-gte',
    category: 'scaler/antimatter/producers',
    entity: 'antimatter-1',
    value: t.count,
  },
}));

// ─── Prestige tier production milestones ──────────────────────────────────
// prestige point gain ladder: vanilla canonical: SynergismOfficial/src/Achievements.ts:2504–2507
// (prestigePointGain group). Synergism's "prestige points gained total" maps
// to cumulative-gte against `Resource.cumulative` — survives across prestiges
// because the prestige module pins prestigePoints + its cumulative tracker
// in `prestigeReset`'s keep set.

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
  requirement: { kind: 'cumulative-gte', resource: 'scaler/prestige-points', value: t.amount },
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
  requirement: {
    kind: 'count-gte',
    category: 'scaler/prestige/producers',
    entity: 'prestige-1',
    value: t.count,
  },
}));

// ─── Transcend tier production milestones ─────────────────────────────────
// transcend point gain ladder: vanilla canonical: SynergismOfficial/src/Achievements.ts:2528–2531

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
  requirement: { kind: 'cumulative-gte', resource: 'scaler/transcend-points', value: t.amount },
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
  requirement: {
    kind: 'count-gte',
    category: 'scaler/transcend/producers',
    entity: 'transcend-1',
    value: t.count,
  },
}));

// ─── Prestige reset count ladder ──────────────────────────────────────────
// vanilla canonical: SynergismOfficial/src/Achievements.ts:prestigeCount group (line 2500).
// Reads `scaler/prestige-count.cumulative` — a discrete event counter the
// prestige module increments by 1 in afterConvert (before the reset zeroes
// in-scope refs). Both the resource and its cumulative tracker are pinned
// in prestigeReset's keep set so the count survives across prestiges.

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
  requirement: { kind: 'cumulative-gte', resource: 'scaler/prestige-count', value: t.count },
}));

// ─── Transcension reset count ladder ───────────────────────────────────────
// vanilla canonical: SynergismOfficial/src/Achievements.ts:transcensionCount group (line 2524).
// Same shape as prestige count — see prestigeCountMilestones rationale.

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
  requirement: { kind: 'cumulative-gte', resource: 'scaler/transcend-count', value: t.count },
}));

// ─── Challenge completion ─────────────────────────────────────────────────
// vanilla canonical: SynergismOfficial/src/Achievements.ts:challenge1–challenge5 groups (line 2532–2550)

const CHALLENGE_IDS = ['challenge-1', 'challenge-2', 'challenge-3', 'challenge-4', 'challenge-5'];

const challengeCompletions: AchievementDef[] = [
  {
    id: 'challenge-1-first',
    name: 'Challenge One Complete',
    description: 'Complete Challenge 1 for the first time',
    tier: 'transcend',
    requirement: {
      kind: 'count-gte',
      category: 'scaler/transcend/challenges',
      entity: 'challenge-1',
      value: 1,
    },
  },
  {
    id: 'challenge-2-first',
    name: 'Challenge Two Complete',
    description: 'Complete Challenge 2 for the first time',
    tier: 'transcend',
    requirement: {
      kind: 'count-gte',
      category: 'scaler/transcend/challenges',
      entity: 'challenge-2',
      value: 1,
    },
  },
  {
    id: 'challenge-3-first',
    name: 'Challenge Three Complete',
    description: 'Complete Challenge 3 for the first time',
    tier: 'transcend',
    requirement: {
      kind: 'count-gte',
      category: 'scaler/transcend/challenges',
      entity: 'challenge-3',
      value: 1,
    },
  },
  {
    id: 'challenge-4-first',
    name: 'Challenge Four Complete',
    description: 'Complete Challenge 4 for the first time',
    tier: 'transcend',
    requirement: {
      kind: 'count-gte',
      category: 'scaler/transcend/challenges',
      entity: 'challenge-4',
      value: 1,
    },
  },
  {
    id: 'challenge-5-first',
    name: 'Challenge Five Complete',
    description: 'Complete Challenge 5 for the first time',
    tier: 'transcend',
    requirement: {
      kind: 'count-gte',
      category: 'scaler/transcend/challenges',
      entity: 'challenge-5',
      value: 1,
    },
  },
];

// ─── Hidden achievements ──────────────────────────────────────────────────
// vanilla canonical: SynergismOfficial/src/Achievements.ts:ungroupedAchievementData (line 2685)
//
// Sub-leaf C disposition note: `hidden-speedrunner` (fastestPrestigeUnder)
// is dropped. The original predicate stub returned `false` unconditionally
// (no fastest-prestige timing was tracked); modeling it would require
// either a new Gate kind or a session-timing accessor. Out of scope for
// the slim-port balance pass — see findings sidecar.

const allChallengesCleared: Gate = {
  kind: 'all',
  of: CHALLENGE_IDS.map((id) => ({
    kind: 'count-gte' as const,
    category: 'scaler/transcend/challenges',
    entity: id,
    value: 1,
  })),
};

const hidden: AchievementDef[] = [
  {
    id: 'hidden-diamond-doubter',
    name: 'Diamond Doubter',
    description: 'Prestige 5 times before unlocking transcension',
    tier: 'prestige',
    hidden: true,
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:diamondSearch ungrouped (line 2721).
    // Slim-port simplification: the "before unlocking transcension" qualifier
    // would need a `not` over the transcension-unlock gate; the slim port
    // ships the unconditional 5-prestige requirement as a starter exemplar.
    requirement: { kind: 'cumulative-gte', resource: 'scaler/prestige-count', value: 5 },
  },
  {
    id: 'hidden-first-prestige',
    name: 'First Prestige',
    description: 'Perform your first prestige reset',
    tier: 'prestige',
    hidden: true,
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:prestigeNoMult ungrouped (line 2691)
    requirement: { kind: 'cumulative-gte', resource: 'scaler/prestige-count', value: 1 },
  },
  {
    id: 'hidden-first-transcend',
    name: 'First Transcendence',
    description: 'Perform your first transcend reset',
    tier: 'transcend',
    hidden: true,
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:transcendNoMult ungrouped (line 2696)
    requirement: { kind: 'cumulative-gte', resource: 'scaler/transcend-count', value: 1 },
  },
  {
    id: 'hidden-all-challenges-cleared',
    name: 'Challenge Master',
    description: 'Complete all 5 challenges',
    tier: 'transcend',
    hidden: true,
    // vanilla canonical: SynergismOfficial/src/Achievements.ts:sadisticAch ungrouped (line 2866)
    // (adapted: all 5 challenges vs. challenge 15 in Synergism)
    requirement: allChallengesCleared,
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
