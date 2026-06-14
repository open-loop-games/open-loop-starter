// ─── Achievements ────────────────────────────────────────────────────────────
// Sources:
//   - Production-total milestones → `BankAchievement` helper + calls,
//     `main.js:12994–13037`. Triggered by cumulative cookies earned.
//   - CPS-rate milestones → `CpsAchievement` helper + calls,
//     `main.js:13005–13048`. Triggered by current cookies-per-second.
//   - Click-count milestones → `Game.Win` calls in the click handler,
//     `main.js:13058–13065`. Triggered by cumulative big-cookie clicks.
//   - Per-building owned-count tiers (`Game.Win` calls inside building
//     callbacks at `main.js:9019+`) land via `modules/milestones.ts`
//     against `producer.count` and the balance.milestoneThresholds set;
//     they don't appear in this file.
//
// First-arc declared invention (spec § 5):
//   - Per-achievement direct multiplier (×1.02 default via
//     `balance.achievementRewardMultiplier`) replaces canonical Cookie
//     Clicker's milk/kitten chain (`main.js:5240`, `:5256–5271`). Each
//     entry omits `rewardMultiplier` so the balance default carries.
//
// Threshold ramp: representative subset reaching demo-arc-relevant
// scale (~1e12 cookies). Forks extend by appending higher tiers; the
// data layer is the editing surface.
// ─────────────────────────────────────────────────────────────────────────────

import type { AchievementDef } from './types';

// === Production-total milestones (BankAchievement series) ===
// Predicate reads cumulative `cookiesEarned`; canonical fires off the
// `Game.cookiesEarned` field.
const BANK_TIERS: { id: string; name: string; threshold: number | string; flavour: string }[] = [
  { id: 'bank-1', name: 'Wake and bake', threshold: 1, flavour: 'Bake 1 cookie.' },
  { id: 'bank-2', name: 'Making some dough', threshold: 1_000, flavour: 'Bake 1,000 cookies.' },
  {
    id: 'bank-3',
    name: 'So baked right now',
    threshold: 100_000,
    flavour: 'Bake 100,000 cookies.',
  },
  {
    id: 'bank-4',
    name: 'Fledgling bakery',
    threshold: 1_000_000,
    flavour: 'Bake 1 million cookies.',
  },
  {
    id: 'bank-5',
    name: 'Affluent bakery',
    threshold: 100_000_000,
    flavour: 'Bake 100 million cookies.',
  },
  {
    id: 'bank-6',
    name: 'World-famous bakery',
    threshold: 10_000_000_000,
    flavour: 'Bake 10 billion cookies.',
  },
  {
    id: 'bank-7',
    name: 'Cosmic bakery',
    threshold: 1_000_000_000_000,
    flavour: 'Bake 1 trillion cookies.',
  },
];

const BANK_ACHIEVEMENTS: AchievementDef[] = BANK_TIERS.map((tier) => ({
  id: tier.id,
  name: tier.name,
  description: tier.flavour,
  requirement: (state) => state.cookiesEarned.gte(tier.threshold),
}));

// === CPS-rate milestones (CpsAchievement series) ===
// Predicate reads the headline rate; canonical fires off `Game.cookiesPs`.
const CPS_TIERS: { id: string; name: string; threshold: number | string; flavour: string }[] = [
  { id: 'cps-1', name: 'Casual baking', threshold: 1, flavour: '1 cookie per second.' },
  { id: 'cps-2', name: 'Hardcore baking', threshold: 10, flavour: '10 cookies per second.' },
  {
    id: 'cps-3',
    name: 'Steady tasty stream',
    threshold: 1_000,
    flavour: '1,000 cookies per second.',
  },
  {
    id: 'cps-4',
    name: 'Cookie monster',
    threshold: 1_000_000,
    flavour: '1 million cookies per second.',
  },
  {
    id: 'cps-5',
    name: 'Mass producer',
    threshold: 100_000_000,
    flavour: '100 million cookies per second.',
  },
  {
    id: 'cps-6',
    name: 'Cookie vortex',
    threshold: 10_000_000_000,
    flavour: '10 billion cookies per second.',
  },
];

const CPS_ACHIEVEMENTS: AchievementDef[] = CPS_TIERS.map((tier) => ({
  id: tier.id,
  name: tier.name,
  description: tier.flavour,
  requirement: (state) => state.cps.gte(tier.threshold),
}));

// === Click-count milestones ===
// Predicate reads cumulative clicks; canonical fires off the
// `Game.handmadeCookies` counter on the click handler.
const CLICK_TIERS: { id: string; name: string; threshold: number; flavour: string }[] = [
  {
    id: 'click-1',
    name: 'Clicktastic',
    threshold: 1_000,
    flavour: 'Make 1,000 cookies from clicking.',
  },
  {
    id: 'click-2',
    name: 'Clickathlon',
    threshold: 100_000,
    flavour: 'Make 100,000 cookies from clicking.',
  },
  {
    id: 'click-3',
    name: 'Clickolympics',
    threshold: 10_000_000,
    flavour: 'Make 10 million cookies from clicking.',
  },
];

const CLICK_ACHIEVEMENTS: AchievementDef[] = CLICK_TIERS.map((tier) => ({
  id: tier.id,
  name: tier.name,
  description: tier.flavour,
  // `clicks` is the cumulative big-cookie click count, but the canonical
  // achievement fires off cookies-from-clicking. With the click-producer's
  // baseRate of 1, click-count == cookies-from-clicking at the base; tier
  // upgrades extend per-click value upward, at which point the canonical
  // and ported predicates diverge. Declared invention: use raw click count
  // — the per-click upgrade chain still contributes through the bank-total
  // series, so the headline pacing is preserved.
  requirement: (state) => state.clicks.gte(tier.threshold),
}));

export const ACHIEVEMENTS: AchievementDef[] = [
  ...BANK_ACHIEVEMENTS,
  ...CPS_ACHIEVEMENTS,
  ...CLICK_ACHIEVEMENTS,
];
