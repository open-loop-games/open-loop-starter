// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Achievements.ts
//
// First-arc subset (spec § 5):
//   Achievements.ts:540-2479  achievements: Achievement[]
//   Achievements.ts:3077+     groupedAchievementData (displayCondition filter)
//   Achievements.ts:3360+     ungroupedAchievementData
//
// First-arc filter: rows whose canonical group's `displayCondition` resolves
// true at default state with `prestigeCount > 0` or `transcendCount > 0`
// (`hasResetAtOrAboveLevel(prestige | transcension)`). Reincarnation+ groups
// excluded entirely.
//
// Reward routing (per spec § 5; canonical reward keys → engine UpgradeGrant):
//   acceleratorPower: () => N    → { counter: 'acceleratorPowerBonus', value: N }
//   accelerators: () => N        → { counter: 'freeAccelerator', value: N }
//   multipliers: () => N         → { counter: 'freeMultiplier', value: N }
//   accelBoosts: () => N         → { counter: 'freeAccelBoost', value: N }
//   crystalMultiplier: () => N   → { multiplier on prestige tier-global }
//   taxReduction: () => N        → { multiplier `1/N` on coin tier-global }
//                                  (canonical tax surface unported; fold into
//                                   coin rateChain as direct boost)
//
// `checkReset: () => player.highestSingularityCount >= N` ports inert at
// first arc (no singularity surface yet). Fork extension territory.
// ─────────────────────────────────────────────────────────────────────────────

import { Decimal } from '@open-loop/engine';
import type { AchievementDef, ScalerGameState, UpgradeGrant } from './types';

// ─── Reward expansion helpers ────────────────────────────────────────────────

function acceleratorPowerGrant(value: number, source: string): UpgradeGrant {
  return {
    kind: 'counter',
    counter: 'acceleratorPowerBonus',
    value: () => value,
    description: `Achievement: ${source} (+acceleratorPower)`,
  };
}

function freeAcceleratorGrant(
  value: (state: ScalerGameState) => number,
  source: string,
): UpgradeGrant {
  return {
    kind: 'counter',
    counter: 'freeAccelerator',
    value,
    description: `Achievement: ${source} (+freeAccelerator)`,
  };
}

function freeMultiplierGrant(
  value: (state: ScalerGameState) => number,
  source: string,
): UpgradeGrant {
  return {
    kind: 'counter',
    counter: 'freeMultiplier',
    value,
    description: `Achievement: ${source} (+freeMultiplier)`,
  };
}

function freeAccelBoostGrant(
  value: (state: ScalerGameState) => number,
  source: string,
): UpgradeGrant {
  return {
    kind: 'counter',
    counter: 'freeAccelBoost',
    value,
    description: `Achievement: ${source} (+freeAccelBoost)`,
  };
}

function crystalMultGrant(value: (state: ScalerGameState) => number, source: string): UpgradeGrant {
  return {
    kind: 'multiplier',
    scope: { kind: 'tier-global', tier: 'prestige' },
    multiplier: value,
    description: `Achievement: ${source} (×crystalMultiplier)`,
  };
}

function taxReductionGrant(taxFactor: number, source: string): UpgradeGrant {
  // Canonical `taxReduction: () => 0.96` divides coin tax by 0.96, equivalent
  // to multiplying coin gain by ~1/0.96 in the absence of the explicit tax
  // surface. First-arc port routes this as a coin tier-global multiplier of
  // `1/taxFactor` — TODO(canonical-fidelity): re-route once the coin tax
  // surface lands.
  return {
    kind: 'multiplier',
    scope: { kind: 'tier-global', tier: 'coin' },
    multiplier: () => 1 / taxFactor,
    description: `Achievement: ${source} (taxReduction ${taxFactor})`,
  };
}

// ─── Coin-owned threshold rows (groups firstOwnedCoin..fifthOwnedCoin) ──────
// Canonical `Achievements.ts:542-700`. Each group: 7 rows at thresholds
// {1, 10, 100/66, 1000/333/200, 5000/6666, 10000/17777, 20000/42777}.

interface OwnedCoinSpec {
  group: AchievementDef['group'];
  producerId: string;
  thresholds: [number, number, number, number, number, number, number];
  rewards: {
    acceleratorPower: number;
    divisor: { accelerators: number; multipliers: number; accelBoosts: number };
  };
}

const OWNED_COIN_SPECS: OwnedCoinSpec[] = [
  {
    group: 'firstOwnedCoin',
    producerId: 'coin-1',
    thresholds: [1, 10, 100, 1000, 5000, 10000, 20000],
    rewards: {
      acceleratorPower: 0.001,
      divisor: { accelerators: 500, multipliers: 1000, accelBoosts: 2000 },
    },
  },
  {
    group: 'secondOwnedCoin',
    producerId: 'coin-2',
    thresholds: [1, 10, 100, 500, 5000, 10000, 20000],
    rewards: {
      acceleratorPower: 0.0015,
      divisor: { accelerators: 500, multipliers: 1000, accelBoosts: 2000 },
    },
  },
  {
    group: 'thirdOwnedCoin',
    producerId: 'coin-3',
    thresholds: [1, 10, 100, 333, 5000, 10000, 20000],
    rewards: {
      acceleratorPower: 0.002,
      divisor: { accelerators: 500, multipliers: 1000, accelBoosts: 2000 },
    },
  },
  {
    // Canonical fourthOwnedCoin rows reference player.thirdOwnedCoin in their
    // unlockConditions and reward closures (`Achievements.ts:642-668`) — likely
    // a Synergism authoring oversight, but ports verbatim per fidelity rule.
    group: 'fourthOwnedCoin',
    producerId: 'coin-3',
    thresholds: [1, 10, 100, 333, 5000, 10000, 20000],
    rewards: {
      acceleratorPower: 0.002,
      divisor: { accelerators: 500, multipliers: 1000, accelBoosts: 2000 },
    },
  },
  {
    group: 'fifthOwnedCoin',
    producerId: 'coin-5',
    thresholds: [1, 10, 66, 200, 6666, 17777, 42777],
    rewards: {
      acceleratorPower: 0.003,
      divisor: { accelerators: 500, multipliers: 1000, accelBoosts: 2000 },
    },
  },
];

const OWNED_COIN_BAND_DESCRIPTIONS: Record<number, string> = {
  0: 'Reach 1 producer.',
  1: 'Reach 10 producers.',
  2: 'Reach 100 producers — bonus to Accelerator power.',
  3: 'Reach high producer count.',
  4: 'Reach 5000+ — gain free Accelerators.',
  5: 'Reach 10000+ — gain free Multipliers.',
  6: 'Reach 20000+ — gain free Accelerator Boosts.',
};

const ownedCoinAchievements: AchievementDef[] = OWNED_COIN_SPECS.flatMap((spec) => {
  const labelByPos: Record<number, string> = {
    0: '1',
    1: '10',
    2: '100',
    3: '1000',
    4: '5000',
    5: '10000',
    6: '20000',
  };
  return spec.thresholds.map((threshold, i): AchievementDef => {
    const pointValue = 5 + 5 * i;
    const id = `${spec.group}-${threshold}`;
    const ownedProducer = spec.producerId;
    // Reward routing per canonical row index within the group.
    let effects: UpgradeGrant[] = [];
    if (i === 2) effects = [acceleratorPowerGrant(spec.rewards.acceleratorPower, id)];
    else if (i === 4) {
      effects = [
        freeAcceleratorGrant(
          (s) =>
            Math.floor(
              Decimal.div(
                s.producerOwned('coin', ownedProducer),
                spec.rewards.divisor.accelerators,
              ).toNumber(),
            ),
          id,
        ),
      ];
    } else if (i === 5) {
      effects = [
        freeMultiplierGrant(
          (s) =>
            Math.floor(
              Decimal.div(
                s.producerOwned('coin', ownedProducer),
                spec.rewards.divisor.multipliers,
              ).toNumber(),
            ),
          id,
        ),
      ];
    } else if (i === 6) {
      effects = [
        freeAccelBoostGrant(
          (s) =>
            Math.floor(
              Decimal.div(
                s.producerOwned('coin', ownedProducer),
                spec.rewards.divisor.accelBoosts,
              ).toNumber(),
            ),
          id,
        ),
      ];
    }
    return {
      id,
      name: `${spec.group} ${labelByPos[i]}`,
      description: OWNED_COIN_BAND_DESCRIPTIONS[i],
      group: spec.group,
      tier: 'coin',
      pointValue,
      requirement: (s) => Decimal.gte(s.producerOwned('coin', ownedProducer), threshold),
      effects,
    };
  });
});

// ─── prestigePointGain group (transcension prestige-points-gain) ────────────
// Canonical `Achievements.ts:702-740`. 7 rows at gain thresholds {1, 1e6, 1e100,
// 1e1000, 1e10000, 1e77777, 1e250000}. Reward at row 1: crystalMultiplier
// derived from `log_e(prestigePoints)`.

const prestigePointGainAchievements: AchievementDef[] = [
  { threshold: 1, pv: 5 },
  { threshold: 1e6, pv: 10, reward: 'crystal' as const },
  { threshold: 1e100, pv: 15 },
  { threshold: '1e1000' as const, pv: 20 },
  { threshold: '1e10000' as const, pv: 25 },
  { threshold: '1e77777' as const, pv: 30 },
  { threshold: '1e250000' as const, pv: 35 },
].map((row, i): AchievementDef => {
  const id = `prestigePointGain-${i + 1}`;
  const effects: UpgradeGrant[] = [];
  if (row.reward === 'crystal') {
    effects.push(
      crystalMultGrant((s) => {
        const pp = new Decimal(s.resourceValue('prestigePoints'));
        if (pp.lte(0)) return 1;
        return Math.max(1, Decimal.log(pp, Math.E).toNumber());
      }, id),
    );
  }
  return {
    id,
    name: `Prestige Gain ${i + 1}`,
    description: `Reach a prestige point gain of ${row.threshold}.`,
    group: 'prestigePointGain',
    tier: 'prestige',
    pointValue: row.pv,
    requirement: (s) => Decimal.gte(s.resourceValue('prestigePointGain'), row.threshold),
    effects,
  };
});

// ─── transcendPointGain group ────────────────────────────────────────────────
// Canonical `Achievements.ts:741-780`. 7 rows; rows 3-5 grant taxReduction.

const transcendPointGainAchievements: AchievementDef[] = [
  { threshold: 1, pv: 5 },
  { threshold: 1e6, pv: 10 },
  { threshold: 1e50, pv: 15, tax: 0.95 },
  { threshold: 1e308, pv: 20, tax: 0.95 },
  { threshold: '1e1500' as const, pv: 25, tax: 0.9 },
  { threshold: '1e25000' as const, pv: 30 },
  { threshold: '1e100000' as const, pv: 35 },
].map((row, i): AchievementDef => {
  const id = `transcendPointGain-${i + 1}`;
  const effects: UpgradeGrant[] = [];
  if (row.tax !== undefined) effects.push(taxReductionGrant(row.tax, id));
  return {
    id,
    name: `Transcend Gain ${i + 1}`,
    description: `Reach a transcend point gain of ${row.threshold}.`,
    group: 'transcendPointGain',
    tier: 'transcend',
    pointValue: row.pv,
    requirement: (s) => Decimal.gte(s.resourceValue('transcendPointGain'), row.threshold),
    effects,
  };
});

// ─── accelerators group ──────────────────────────────────────────────────────
// Canonical `Achievements.ts:1387-1417` (rows 1-7) + `:2315-2317` (rows 8-10).

interface CountAchSpec {
  threshold: number;
  pv: number;
  effect?: UpgradeGrant;
}

const acceleratorsAchievements: AchievementDef[] = (
  [
    { threshold: 5, pv: 5 },
    { threshold: 25, pv: 10, effect: acceleratorPowerGrant(0.01, 'accelerators-25') },
    { threshold: 100, pv: 15 },
    { threshold: 666, pv: 20, effect: freeAcceleratorGrant(() => 5, 'accelerators-666') },
    { threshold: 2000, pv: 25, effect: freeAcceleratorGrant(() => 12, 'accelerators-2000') },
    { threshold: 12500, pv: 30, effect: freeAcceleratorGrant(() => 25, 'accelerators-12500') },
    { threshold: 100000, pv: 35, effect: freeAcceleratorGrant(() => 50, 'accelerators-100000') },
    { threshold: 1e6, pv: 40 },
    { threshold: 1e7, pv: 45 },
    { threshold: 1e8, pv: 50 },
  ] as CountAchSpec[]
).map(
  (row): AchievementDef => ({
    id: `accelerators-${row.threshold}`,
    name: `Accelerators ${row.threshold}`,
    description: `Buy ${row.threshold}+ Accelerators.`,
    group: 'accelerators',
    tier: 'coin',
    pointValue: row.pv,
    requirement: (s) => Decimal.gte(s.acceleratorBought(), row.threshold),
    effects: row.effect ? [row.effect] : [],
  }),
);

// ─── multipliers group ───────────────────────────────────────────────────────
// Canonical `Achievements.ts:1419-1449` (rows 1-7) + `:2318-2320` (rows 8-10).

const multipliersAchievements: AchievementDef[] = (
  [
    { threshold: 2, pv: 5 },
    { threshold: 20, pv: 10, effect: freeMultiplierGrant(() => 1, 'multipliers-20') },
    { threshold: 100, pv: 15 },
    { threshold: 500, pv: 20, effect: freeMultiplierGrant(() => 1, 'multipliers-500') },
    { threshold: 2000, pv: 25, effect: freeMultiplierGrant(() => 3, 'multipliers-2000') },
    { threshold: 12500, pv: 30, effect: freeMultiplierGrant(() => 6, 'multipliers-12500') },
    { threshold: 100000, pv: 35, effect: freeMultiplierGrant(() => 10, 'multipliers-100000') },
    { threshold: 3e6, pv: 40 },
    { threshold: 3e7, pv: 45 },
    { threshold: 3e8, pv: 50 },
  ] as CountAchSpec[]
).map(
  (row): AchievementDef => ({
    id: `multipliers-${row.threshold}`,
    name: `Multipliers ${row.threshold}`,
    description: `Buy ${row.threshold}+ Multipliers.`,
    group: 'multipliers',
    tier: 'coin',
    pointValue: row.pv,
    requirement: (s) => Decimal.gte(s.multiplierBought(), row.threshold),
    effects: row.effect ? [row.effect] : [],
  }),
);

// ─── acceleratorBoosts group ─────────────────────────────────────────────────
// Canonical `Achievements.ts:1451-1485` (rows 1-7) + `:2321-2334` (rows 8-10).
// No reward rewards in first-arc canon for this group.

const acceleratorBoostsAchievements: AchievementDef[] = (
  [
    { threshold: 2, pv: 5 },
    { threshold: 10, pv: 10 },
    { threshold: 50, pv: 15 },
    { threshold: 200, pv: 20 },
    { threshold: 1000, pv: 25 },
    { threshold: 5000, pv: 30 },
    { threshold: 15000, pv: 35 },
    { threshold: 1e5, pv: 40 },
    { threshold: 1e6, pv: 45 },
    { threshold: 1e7, pv: 50 },
  ] as CountAchSpec[]
).map(
  (row): AchievementDef => ({
    id: `acceleratorBoosts-${row.threshold}`,
    name: `Accelerator Boosts ${row.threshold}`,
    description: `Buy ${row.threshold}+ Accelerator Boosts.`,
    group: 'acceleratorBoosts',
    tier: 'transcend',
    pointValue: row.pv,
    requirement: (s) => s.acceleratorBoostBought() >= row.threshold,
    effects: [],
  }),
);

// ─── prestigeCount group ─────────────────────────────────────────────────────
// Canonical `Achievements.ts:2727-2812`. 15 rows at thresholds 1, 10, 100,
// 1000, ... 1e20. Several rewards reach into reincarnation+ surfaces; first-arc
// port keeps the multiplicative reward shape and routes deferred surfaces as
// inert.

const prestigeCountAchievements: AchievementDef[] = [
  { threshold: 1, pv: 2 },
  { threshold: 10, pv: 4 }, // prestigeCountMultiplier — inert (no surface yet)
  { threshold: 100, pv: 6 }, // duplicationRuneUnlock — inert (default-active in port)
  { threshold: 1000, pv: 8 }, // offeringBonus — TODO(expansion) on offerings
  { threshold: 10000, pv: 10 },
  { threshold: 100000, pv: 12 },
  { threshold: 1e6, pv: 14 }, // transcendToPrestige — inert (no auto-prestige)
  { threshold: 1e7, pv: 16 },
  { threshold: 1e8, pv: 18 }, // transcensionCountMultiplier — inert
  { threshold: 1e9, pv: 20 },
  { threshold: 1e11, pv: 22 },
  { threshold: 1e13, pv: 24 },
  { threshold: 1e15, pv: 26 },
  { threshold: 1e17, pv: 28 },
  { threshold: 1e20, pv: 30 },
].map(
  (row): AchievementDef => ({
    id: `prestigeCount-${row.threshold}`,
    name: `Prestige ${row.threshold}`,
    description: `Prestige ${row.threshold}+ times.`,
    group: 'prestigeCount',
    tier: 'prestige',
    pointValue: row.pv,
    requirement: (s) => s.prestigeCount() >= row.threshold,
    effects: [],
  }),
);

// ─── transcensionCount group ─────────────────────────────────────────────────
// Canonical `Achievements.ts:2814-2898`. 15 rows. Reward closures route into
// later-arc surfaces (transcensionCountMultiplier, salvage, prismRuneUnlock,
// reincarnationToTranscend, reincarnationCountMultiplier) — port inert.

const transcensionCountAchievements: AchievementDef[] = [
  { threshold: 1, pv: 3 },
  { threshold: 10, pv: 6 },
  { threshold: 100, pv: 9 },
  { threshold: 1000, pv: 12 },
  { threshold: 10000, pv: 15 },
  { threshold: 100000, pv: 18 },
  { threshold: 1e6, pv: 21 },
  { threshold: 1e7, pv: 24 },
  { threshold: 1e8, pv: 27 },
  { threshold: 1e9, pv: 30 },
  { threshold: 3e10, pv: 33 },
  { threshold: 9e11, pv: 36 },
  { threshold: 2.7e13, pv: 39 },
  { threshold: 8.1e14, pv: 42 },
  { threshold: 1e17, pv: 45 },
].map(
  (row): AchievementDef => ({
    id: `transcensionCount-${row.threshold}`,
    name: `Transcend ${row.threshold}`,
    description: `Transcend ${row.threshold}+ times.`,
    group: 'transcensionCount',
    tier: 'transcend',
    pointValue: row.pv,
    requirement: (s) => s.transcendCount() >= row.threshold,
    effects: [],
  }),
);

// ─── challenge1..5 groups ────────────────────────────────────────────────────
// Canonical `Achievements.ts:990-1180`. 7 rows per challenge at completion
// counts {1, 3, 5, 10, 20, 50, 75}. Row 5 (idx 4, completions ≥ 20) grants
// taxReduction 0.96; rows 6-7 (≥50, ≥75) have no canonical reward.

const challengeThresholds: ReadonlyArray<{ count: number; pv: number; tax?: 0.96 }> = [
  { count: 1, pv: 5 },
  { count: 3, pv: 10 },
  { count: 5, pv: 15 },
  { count: 10, pv: 20 },
  { count: 20, pv: 25, tax: 0.96 },
  { count: 50, pv: 30 },
  { count: 75, pv: 35 },
];

function challengeAchievements(
  group: 'challenge1' | 'challenge2' | 'challenge3' | 'challenge4' | 'challenge5',
  idx: 1 | 2 | 3 | 4 | 5,
): AchievementDef[] {
  return challengeThresholds.map((row): AchievementDef => {
    const id = `${group}-${row.count}`;
    const effects: UpgradeGrant[] = [];
    if (row.tax !== undefined) effects.push(taxReductionGrant(row.tax, id));
    return {
      id,
      name: `Challenge ${idx} × ${row.count}`,
      description: `Complete Challenge ${idx} ${row.count}+ times.`,
      group,
      tier: 'transcend',
      pointValue: row.pv,
      requirement: (s) => s.challengeCompletions(idx) >= row.count,
      effects,
    };
  });
}

const challengeAchievementsAll: AchievementDef[] = [
  ...challengeAchievements('challenge1', 1),
  ...challengeAchievements('challenge2', 2),
  ...challengeAchievements('challenge3', 3),
  ...challengeAchievements('challenge4', 4),
  ...challengeAchievements('challenge5', 5),
];

// ─── Ungrouped first-arc rows ────────────────────────────────────────────────
// Canonical `Achievements.ts:541` (free achievement). The remaining ungrouped
// first-arc rows (no-multiplier / no-accelerator / no-coin-upgrade variants
// at lines 818-870) require tracking "did the player buy any X this prestige
// cycle" flags that aren't part of the engine port. TODO(canonical-fidelity):
// port these flags and re-enable the ungrouped no-X rows.

const ungroupedAchievements: AchievementDef[] = [
  {
    id: 'free-achievement',
    name: 'Free Achievement',
    description: 'A small reward for showing up.',
    group: 'ungrouped',
    tier: 'coin',
    pointValue: 5,
    requirement: () => true,
    effects: [],
  },
];

// ─── Aggregate export ────────────────────────────────────────────────────────

export const SCALER_ACHIEVEMENTS: AchievementDef[] = [
  ...ownedCoinAchievements,
  ...prestigePointGainAchievements,
  ...transcendPointGainAchievements,
  ...acceleratorsAchievements,
  ...multipliersAchievements,
  ...acceleratorBoostsAchievements,
  ...prestigeCountAchievements,
  ...transcensionCountAchievements,
  ...challengeAchievementsAll,
  ...ungroupedAchievements,
];
