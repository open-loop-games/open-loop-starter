// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Variables.ts
//   Variables.ts:21        upgradeCosts row 1 (coin band 1-20, log10 grid)
//   Variables.ts:22        upgradeCosts row 2 (prestige band 21-40, log10 grid)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//   Synergism.ts:2914-2982  per-upgrade rate-effect routing into coin{N}Multi
//   Synergism.ts:2848-2870  global coin multiplier `s` (upgrade 6, 12, 20)
//   Synergism.ts:4051-4059  upgrade 14/15 cascade-gate boosts (inert pre-cascade)
//   Synergism.ts:2436-2462  upgrades 21-25/32/45 — feed `freeUpgradeAccelerator`
//   Synergism.ts:2582-2627  upgrades 21-25/33/34/35/49/68 — feed `freeUpgradeMultiplier`
//   Synergism.ts:2985-2988  upgrade 36 — globalCrystalMultiplier
//                           ×= min(1e5000, prestigePoints^(1/500))
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Reset.ts
//   Reset.ts:1411-1413     resetUpgrades zeros 1-20 always
//   Reset.ts:1430-1432     resetUpgrades(2+) zeros 21-40 on prestige
// Canonical: open-loop-research/reference-code/SynergismOfficial/translations/en.json
//   upgrades.names + upgrades.descriptions  i18n strings
// ─────────────────────────────────────────────────────────────────────────────

import { Decimal, type DecimalSource, bn } from 'open-loop-engine';
import type { UpgradeDef, UpgradeGrant, ScalerGameState } from './types';

// ─── Skeleton ───
// Coin band 1–20: one-time buys whose cost is `10 ** costLog` of `coins`.
// Each entry's `effects` lists multiplicative grants this upgrade contributes
// while bought (`active`); the coin module expands `tier-global` scope into
// one grant per producer in the tier and binds via `chain.bind` through the
// purchasable category's declarative `grants` field.
//
// Effects fall into three fidelity tiers at leaf 1:
// - Canonical: math doesn't depend on later-arc state (upgrades 1–6, 10, 17, 20).
// - Inert-by-port: structure ports verbatim, but the closure reads later-arc
//   state that defaults to 0 / identity (upgrades 12, 13, 18, 19). The grant
//   self-activates when those tiers land in their leaves.
// - Stub at leaf 1: canonical effect routes through `freeMultiplier` /
//   `freeAccelerator` (upgrades 7, 8, 9, 11) which port with the Multiplier
//   rework, OR through the `upgrades[101..105]` cascade gate (upgrades 14, 15,
//   16) which is also inert pre-cascade. Listed here with empty effects;
//   a follow-up leaf wires them once the Multiplier free-amount mechanism
//   exists in the engine port.

/** Canonical `Synergism.ts:2837-2840` — first6CoinUp = (totalCoinOwned + 1) × min(1e30, 1.008 ^ totalCoinOwned). */
function first6CoinUp(state: ScalerGameState): DecimalSource {
  const total = bn(state.totalOwned('coin'));
  const totalNum = total.toNumber();
  const cap = Decimal.min(1e30, Decimal.pow(1.008, totalNum));
  return total.add(1).mul(cap);
}

/** Per-upgrade grant builders that close over a typed game-state accessor. */
const grantsByPosition: Record<number, UpgradeGrant[]> = {
  1: [
    {
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-1' },
      multiplier: first6CoinUp,
      description: 'Worker production / coin upgrade 1',
    },
  ],
  2: [
    {
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-2' },
      multiplier: first6CoinUp,
      description: 'Investment production / coin upgrade 2',
    },
  ],
  3: [
    {
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-3' },
      multiplier: first6CoinUp,
      description: 'Printer production / coin upgrade 3',
    },
  ],
  4: [
    {
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-4' },
      multiplier: first6CoinUp,
      description: 'Mint production / coin upgrade 4',
    },
  ],
  5: [
    {
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-5' },
      multiplier: first6CoinUp,
      description: 'Alchemy production / coin upgrade 5',
    },
  ],
  6: [
    {
      scope: { kind: 'tier-global', tier: 'coin' },
      multiplier: first6CoinUp,
      description: 'All coin production / coin upgrade 6',
    },
  ],
  // 7, 8, 9: feed `freeMultiplier` / `freeAccelerator`; ports with Multiplier rework.
  10: [
    {
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-1' },
      multiplier: (state) => {
        const inv = bn(state.producerOwned('coin', 'coin-2'));
        return Decimal.pow(2, Math.min(50, inv.toNumber() / 15));
      },
      description: 'Worker × Investment count / coin upgrade 10',
    },
  ],
  // 11: 1.02 ^ freeAccelerator — ports with Multiplier rework.
  12: [
    {
      scope: { kind: 'tier-global', tier: 'coin' },
      multiplier: (state) => {
        // Inert until prestige tier lands and `prestigePoints` accumulates;
        // canonical reads `player.prestigeCount` here, which is 0 at leaf 1.
        const prestigePoints = bn(state.resourceValue('prestigePoints'));
        const prestigeCount = prestigePoints.gt(0)
          ? Decimal.log(prestigePoints.add(1), 10).toNumber()
          : 0;
        return Decimal.min(1e4, Decimal.pow(1.01, prestigeCount));
      },
      description: 'Prestige count / coin upgrade 12',
    },
  ],
  13: [
    {
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-2' },
      multiplier: (state) => {
        // Inert until transcend tier; canonical reads `firstGeneratedMythos +
        // firstOwnedMythos` which are 0 pre-transcend.
        const myth = bn(state.resourceValue('mythos-1-owned'));
        return Decimal.min(1e50, Decimal.pow(myth.add(1), 4 / 3).mul(1e22));
      },
      description: 'Mythos / coin upgrade 13',
    },
  ],
  // 14, 15, 16: cascade-gate boosts. Inert until upgrades[101..105] land.
  17: [
    {
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-4' },
      multiplier: () => 1e100,
      description: 'Mint × 1e100 / coin upgrade 17',
    },
  ],
  18: [
    {
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-3' },
      multiplier: (state) => {
        const shards = bn(state.resourceValue('transcend-shards'));
        return Decimal.min(1e125, shards.add(1));
      },
      description: 'Transcend shards / coin upgrade 18',
    },
  ],
  19: [
    {
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-2' },
      multiplier: (state) => {
        const tp = bn(state.resourceValue('transcendPoints'));
        return Decimal.min(1e200, tp.mul(1e30).add(1));
      },
      description: 'Transcend points / coin upgrade 19',
    },
  ],
  20: [
    {
      scope: { kind: 'tier-global', tier: 'coin' },
      multiplier: (state) => {
        const total = bn(state.totalOwned('coin')).toNumber();
        return Decimal.pow(total / 4 + 1, 10);
      },
      description: 'Coin upgrade 1 base raised / coin upgrade 20',
    },
  ],
};

const COIN_BAND_DESCRIPTIONS: Record<number, { name: string; description: string }> = {
  1: { name: 'Upgrade 1', description: 'Increase production of Workers per producer bought.' },
  2: { name: 'Upgrade 2', description: 'Increase production of Investments per producer bought.' },
  3: { name: 'Upgrade 3', description: 'Increase production of Printers per producer bought.' },
  4: { name: 'Upgrade 4', description: 'Increase production of Mints per producer bought.' },
  5: { name: 'Upgrade 5', description: 'Increase production of Alchemies per producer bought.' },
  6: { name: 'Upgrade 6', description: 'Increase all production based on producers bought.' },
  7: { name: 'Upgrade 7', description: 'Gain free multipliers based on your purchased Alchemies.' },
  8: { name: 'Upgrade 8', description: 'Gain 1 free Accelerator per 7 purchased Multipliers.' },
  9: { name: 'Upgrade 9', description: 'Gain 1 free Multiplier per 10 purchased Accelerators.' },
  10: {
    name: 'Upgrade 10',
    description: 'Improve Workers based on the first 750 purchased Investments.',
  },
  11: { name: 'Upgrade 11', description: 'Accelerators improve generation production by 2% each.' },
  12: {
    name: 'Upgrade 12',
    description: 'Each Prestige multiplies production by 1.01, multiplicatively (Max: 1e4x).',
  },
  13: { name: 'Upgrade 13', description: 'Augments buff the production of Investments.' },
  14: { name: 'Upgrade 14', description: 'Free Accelerators buff generation of Printers.' },
  15: { name: 'Upgrade 15', description: 'Free Accelerators buff generation of Mints.' },
  16: { name: 'Upgrade 16', description: 'Acceleration Multiplier buffs Diamond gain.' },
  17: { name: 'Upgrade 17', description: 'Multiply Mint production by 1e+100.' },
  18: { name: 'Upgrade 18', description: 'Multiply Printer production based on Mythos Shards.' },
  19: { name: 'Upgrade 19', description: 'Multiply Investment production based on Mythos.' },
  20: { name: 'Upgrade 20', description: 'Coin upgrade 1 is raised to the eleventh power.' },
};

const COST_LOG_BY_POSITION: Record<number, number> = {
  1: 6,
  2: 7,
  3: 8,
  4: 10,
  5: 12,
  6: 20,
  7: 35,
  8: 50,
  9: 75,
  10: 100,
  11: 55,
  12: 75,
  13: 125,
  14: 150,
  15: 200,
  16: 250,
  17: 500,
  18: 750,
  19: 1000,
  20: 1500,
};

export const COIN_UPGRADES: UpgradeDef[] = Array.from({ length: 20 }, (_, i): UpgradeDef => {
  const position = i + 1;
  const { name, description } = COIN_BAND_DESCRIPTIONS[position];
  return {
    id: `upgrade-${position}`,
    position,
    tier: 'coin',
    costLog: COST_LOG_BY_POSITION[position],
    name,
    description,
    effects: grantsByPosition[position] ?? [],
  };
});

// ─── Skeleton ───
// Prestige band 21-40: cost = `10^costLog` of `prestigePoints`. Reset on every
// prestige (`Reset.ts:1430-1432`) — these are run-time loadout, distinct from
// the cumulative-across-prestige `prestigePoints` currency that pays for them.
//
// Effect fidelity at first arc:
// - Canonical lift: upgrade 36 (binds into globalCrystalMultiplier on the
//   diamond rateChain via `min(1e5000, prestigePoints^(1/500))`).
// - Inert-by-port: 21-25, 32-35, 37 — canonical math feeds free-Accelerator /
//   free-Multiplier mechanism (deferred with leaf-1's Accelerator/Multiplier
//   rework). 38, 39, 40 read from later-arc state. Empty effects[] until
//   the relevant mechanisms land.

const prestigeGrantsByPosition: Record<number, UpgradeGrant[]> = {
  // 21-25: each grants `+5/+4/+3/+2/+1` free Accelerator and `+1` free
  // Multiplier in canonical, then `1.01^sum` multiplies the result. Both
  // contributions feed mechanisms that arrive with the upgrade-7/8/9/11
  // free-amount rework. Inert-by-port until then.

  // 32-35: feed free-Accelerator (`+min(500, log(PP+1, 1e25))` on 32) /
  // free-Multiplier scalars (`+totalAcceleratorBoost` on 33, `0.03/0.02 *`
  // scalars on 34/35). Inert-by-port — same blocker as 21-25.

  36: [
    {
      scope: { kind: 'tier-global', tier: 'prestige' },
      multiplier: (state) => {
        const pp = bn(state.resourceValue('prestigePoints'));
        if (pp.lte(0)) return 1;
        return Decimal.min('1e5000', Decimal.pow(pp, 1 / 500));
      },
      description: 'Crystal multiplier from prestige points / prestige upgrade 36',
    },
  ],

  // 37: globalCrystalMultiplier *= ` ... player.researches[X] / dilation ...`
  // Inert at first arc (researches not ported).

  // 38, 39, 40: read from `Statistics.ts` paths — Diamond 4×3 / Diamond 19 /
  // miscellaneous. Inert until those bindings land.
};

const PRESTIGE_BAND_DESCRIPTIONS: Record<number, { name: string; description: string }> = {
  21: {
    name: 'Diamond Upgrade 1',
    description: 'Gain free Accelerators / Multipliers (deferred).',
  },
  22: {
    name: 'Diamond Upgrade 2',
    description: 'Gain free Accelerators / Multipliers (deferred).',
  },
  23: {
    name: 'Diamond Upgrade 3',
    description: 'Gain free Accelerators / Multipliers (deferred).',
  },
  24: {
    name: 'Diamond Upgrade 4',
    description: 'Gain free Accelerators / Multipliers (deferred).',
  },
  25: {
    name: 'Diamond Upgrade 5',
    description: 'Gain free Accelerators / Multipliers (deferred).',
  },
  26: {
    name: 'Diamond Upgrade 6',
    description: 'Crystal upgrade scaling (inert until later-arc).',
  },
  27: {
    name: 'Diamond Upgrade 7',
    description: 'Crystal upgrade scaling (inert until later-arc).',
  },
  28: {
    name: 'Diamond Upgrade 8',
    description: 'Crystal upgrade scaling (inert until later-arc).',
  },
  29: {
    name: 'Diamond Upgrade 9',
    description: 'Crystal upgrade scaling (inert until later-arc).',
  },
  30: {
    name: 'Diamond Upgrade 10',
    description: 'Crystal upgrade scaling (inert until later-arc).',
  },
  31: {
    name: 'Diamond Upgrade 11',
    description: 'Reduces transcend requirements (inert until transcend).',
  },
  32: {
    name: 'Diamond Upgrade 12',
    description: 'Free Accelerators from prestige points (deferred).',
  },
  33: {
    name: 'Diamond Upgrade 13',
    description: 'Free Multiplier from Accelerator Boosts (deferred).',
  },
  34: { name: 'Diamond Upgrade 14', description: 'Free-Multiplier scalar (deferred).' },
  35: { name: 'Diamond Upgrade 15', description: 'Free-Multiplier scalar (deferred).' },
  36: {
    name: 'Diamond Upgrade 16',
    description: 'Crystal multiplier ×= min(1e5000, prestigePoints^(1/500)).',
  },
  37: { name: 'Diamond Upgrade 17', description: 'Crystal multiplier from researches (inert).' },
  38: { name: 'Diamond Upgrade 18', description: 'Diamond production scalar (inert).' },
  39: { name: 'Diamond Upgrade 19', description: 'Diamond production scalar (inert).' },
  40: { name: 'Diamond Upgrade 20', description: 'Late-arc reincarnation tie-in (inert).' },
};

const PRESTIGE_COST_LOG_BY_POSITION: Record<number, number> = {
  21: 5,
  22: 15,
  23: 25,
  24: 40,
  25: 60,
  26: 45,
  27: 75,
  28: 100,
  29: 125,
  30: 150,
  31: 150,
  32: 400,
  33: 800,
  34: 1600,
  35: 3200,
  36: 10000,
  37: 20000,
  38: 50000,
  39: 100000,
  40: 200000,
};

export const PRESTIGE_UPGRADES: UpgradeDef[] = Array.from({ length: 20 }, (_, i): UpgradeDef => {
  const position = i + 21;
  const { name, description } = PRESTIGE_BAND_DESCRIPTIONS[position];
  return {
    id: `upgrade-${position}`,
    position,
    tier: 'prestige',
    costLog: PRESTIGE_COST_LOG_BY_POSITION[position],
    name,
    description,
    effects: prestigeGrantsByPosition[position] ?? [],
  };
});
