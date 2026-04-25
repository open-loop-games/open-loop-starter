import type { AchievementDef } from './types';

// ─── Skeleton ───
// 20 achievements. 10 milestone-count predicates evaluate every tick;
// 8 time-based carry triggeredOnResume = true (evaluated at session
// resume); 2 time-based (continuous-hour, arc-closed) read state
// available during normal ticks and stay tick-time.
//
// All 20 are passive — no achievement requires the player to do anything
// specific at a specific moment. The Ambient contract forbids that.

// ─── Costume ───
// Cozy Farm phrasing. Hidden flag is opt-in per entry.

export const ACHIEVEMENTS: AchievementDef[] = [
  // 10 milestone-count
  {
    id: 'first-sprout',
    name: 'First Sprout',
    description: 'A green tip pushes through.',
    requirement: (s) => s.primaryLifetimeAtLeast(1),
  },
  {
    id: 'a-handful',
    name: 'A Handful',
    description: 'Ten in the basket.',
    requirement: (s) => s.primaryLifetimeAtLeast(10),
  },
  {
    id: 'a-basket',
    name: 'A Basket',
    description: 'A hundred sprouts saved.',
    requirement: (s) => s.primaryLifetimeAtLeast(100),
  },
  {
    id: 'a-bushel',
    name: 'A Bushel',
    description: 'A thousand sprouts harvested.',
    requirement: (s) => s.primaryLifetimeAtLeast(1_000),
  },
  {
    id: 'a-pantry',
    name: 'A Pantry',
    description: 'Ten thousand sprouts kept.',
    requirement: (s) => s.primaryLifetimeAtLeast(10_000),
  },
  {
    id: 'coop-occupied',
    name: 'Hens Settle In',
    description: 'A coop, full and clucking.',
    requirement: (s) => s.producerCountAtLeast('coop', 1),
  },
  {
    id: 'pond-stocked',
    name: 'Pond Stocked',
    description: 'Ripples settle, fish appear.',
    requirement: (s) => s.producerCountAtLeast('pond', 1),
  },
  {
    id: 'open-roaming',
    name: 'Open Roaming',
    description: 'Five pastures and animals to wander them.',
    requirement: (s) => s.producerCountAtLeast('pasture', 5),
  },
  {
    id: 'orchard-bears',
    name: 'Orchard Bears Fruit',
    description: 'The waiting paid off.',
    requirement: (s) => s.producerCountAtLeast('orchard', 1),
  },
  {
    id: 'every-variety',
    name: 'Every Variety',
    description: 'One of each, at least.',
    requirement: (s) => s.ownsEveryProducer(),
  },

  // 8 triggeredOnResume time-based
  {
    id: 'first-glance',
    name: 'First Glance Back',
    description: 'Returned after a five-minute pause.',
    triggeredOnResume: true,
    requirement: (s) => s.offlineGapAtLeast(5 * 60),
  },
  {
    id: 'half-hour-glance',
    name: 'A Half-Hour Away',
    description: 'Returned after thirty minutes.',
    triggeredOnResume: true,
    requirement: (s) => s.offlineGapAtLeast(30 * 60),
  },
  {
    id: 'patient-gardener',
    name: 'Patient Gardener',
    description: 'An hour of patience.',
    triggeredOnResume: true,
    requirement: (s) => s.offlineGapAtLeast(60 * 60),
  },
  {
    id: 'half-day-back',
    name: 'Half-Day Returner',
    description: 'Returned after six hours.',
    triggeredOnResume: true,
    requirement: (s) => s.offlineGapAtLeast(6 * 3600),
  },
  {
    id: 'full-day-back',
    name: 'Day-Long Patience',
    description: 'Returned after a full day away.',
    triggeredOnResume: true,
    requirement: (s) => s.offlineGapAtLeast(24 * 3600),
  },
  {
    id: 'weekend-of-care',
    name: 'A Weekend of Care',
    description: 'The garden persisted across two days.',
    triggeredOnResume: true,
    requirement: (s) => s.secondsSinceCreation() >= 2 * 86400,
  },
  {
    id: 'weekly-keeper',
    name: 'Weekly Keeper',
    description: 'A week with the garden.',
    triggeredOnResume: true,
    requirement: (s) => s.secondsSinceCreation() >= 7 * 86400,
  },
  {
    id: 'month-old-orchard',
    name: 'Month-Old Orchard',
    description: 'Thirty days of quiet keeping.',
    hidden: true,
    triggeredOnResume: true,
    requirement: (s) => s.secondsSinceCreation() >= 30 * 86400,
  },

  // 2 tick-time time-based
  {
    id: 'continuous-hour',
    name: 'Quiet Hour',
    description: 'An hour of continuous tending.',
    requirement: (s) => s.secondsSinceLastResume() >= 60 * 60,
  },
  {
    id: 'arc-closed',
    name: 'First Year Complete',
    description: 'The cycle came around.',
    requirement: (s) => s.sceneVariantUnlocked('year-cycles'),
  },
];
