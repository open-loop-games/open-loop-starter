// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Variables.ts
//   Variables.ts:21        upgradeCosts row 1 (coin band 1-20, log10 grid)
//   Variables.ts:22        upgradeCosts row 2 (prestige band 21-40, log10 grid)
//   Variables.ts:23        upgradeCosts row 3 (transcend band 41-60, log10 grid)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//   Synergism.ts:2914-2982  per-upgrade rate-effect routing into coin{N}Multi
//   Synergism.ts:2848-2870  global coin multiplier `s` (upgrade 6, 12, 20)
//   Synergism.ts:2851-2862  globalCoinMultiplier base `s` (upgrades 41, 43, 48)
//   Synergism.ts:2916-2974  coinOneMulti..coinFiveMulti (upgrades 56-60)
//   Synergism.ts:3047-3081  globalMythosMultiplier (upgrades 42, 47, 51, 52)
//   Synergism.ts:3099-3116  mythosupgrade13/14/15 (upgrades 53, 54, 55)
//   Synergism.ts:4051-4059  upgrade 14/15 cascade-gate boosts (inert pre-cascade)
//   Synergism.ts:2436-2462  upgrades 21-25/32/45 — feed `freeUpgradeAccelerator`
//   Synergism.ts:2582-2627  upgrades 21-25/33/34/35/49/68 — feed `freeUpgradeMultiplier`
//   Synergism.ts:2985-2988  upgrade 36 — globalCrystalMultiplier
//                           ×= min(1e5000, prestigePoints^(1/500))
//   Synergism.ts:3586-3594  upgrade 44 — transcendPointGain × min(1e6, 1.01^transcendCount)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Reset.ts
//   Reset.ts:1411-1413     resetUpgrades zeros 1-20 always
//   Reset.ts:1430-1432     resetUpgrades(2+) zeros 21-40 on prestige
//   Reset.ts:1376-1442     resetUpgrades(2) zeros 41-60 on transcend (via the
//                          shared band-walk; transcend reset bundles
//                          ['scaler-coin','scaler-prestige','scaler-transcend']
//                          so band 41-60 falls out of module-scoped sweep)
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
      kind: 'multiplier',
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-1' },
      multiplier: first6CoinUp,
      description: 'Worker production / coin upgrade 1',
    },
  ],
  2: [
    {
      kind: 'multiplier',
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-2' },
      multiplier: first6CoinUp,
      description: 'Investment production / coin upgrade 2',
    },
  ],
  3: [
    {
      kind: 'multiplier',
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-3' },
      multiplier: first6CoinUp,
      description: 'Printer production / coin upgrade 3',
    },
  ],
  4: [
    {
      kind: 'multiplier',
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-4' },
      multiplier: first6CoinUp,
      description: 'Mint production / coin upgrade 4',
    },
  ],
  5: [
    {
      kind: 'multiplier',
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-5' },
      multiplier: first6CoinUp,
      description: 'Alchemy production / coin upgrade 5',
    },
  ],
  6: [
    {
      kind: 'multiplier',
      scope: { kind: 'tier-global', tier: 'coin' },
      multiplier: first6CoinUp,
      description: 'All coin production / coin upgrade 6',
    },
  ],
  // 7, 8, 9: feed `freeMultiplier` / `freeAccelerator`; ports with Multiplier rework.
  10: [
    {
      kind: 'multiplier',
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
      kind: 'multiplier',
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
      kind: 'multiplier',
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
      kind: 'multiplier',
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-4' },
      multiplier: () => 1e100,
      description: 'Mint × 1e100 / coin upgrade 17',
    },
  ],
  18: [
    {
      kind: 'multiplier',
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
      kind: 'multiplier',
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
      kind: 'multiplier',
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
      kind: 'multiplier',
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

// ─── Skeleton ───
// Transcend band 41-60: cost = `10^costLog` of `transcendPoints`. Single-buy
// (`Variables.ts:9` `Upgrade.transcend = 'transcendPoints'`). Reset on every
// transcend (`Reset.ts:1376-1442`'s `resetUpgrades(2)` walks bands 21-40 and
// 41-60 together — module-scoped sweep handles it via `resetModules:
// ['scaler-coin','scaler-prestige','scaler-transcend']`).
//
// Effect fidelity at first arc — 9 active routes lift verbatim into rate-
// chain bindings; 11 routes ship inert with documented reasons:
//
// - **Active (9):**
//   - 41 → globalCoinMultiplier `s` × min(1e30, sqrt(transcendPoints+4))
//          (`Synergism.ts:2851-2854`)
//   - 42 → globalMythosMultiplier × min(1e50,
//          ((prestigePoints+1)^(1/50))/2.5+1) (`:3047-3055`)
//   - 43 → globalCoinMultiplier `s` × min(1e30, 1.01^transcendCount)
//          (`:2856-2858`)
//   - 47 → globalMythosMultiplier × 1.01^achievementPoints ×
//          (achievementPoints/5+1) (`:3057-3061`) — closure ports
//          verbatim; achievementPoints is 0 at first arc → identity 1.
//   - 56-60 → coinOneMulti..coinFiveMulti × {1e5000, 1e7500, 1e15000,
//          1e25000, 1e35000} (`:2916-2974`)
//
// - **Inert at first arc (11):**
//   - 44 — modifies `transcendPointGain` (conversion output, not a chain bind);
//     defer to balance leaf or transcend-conversion-modifier follow-up.
//   - 45, 49 — feed `freeUpgradeAccelerator` / `freeUpgradeMultiplier`
//     pipelines (`:2457-2462, :2600-2605`); pending the cumulative-buy free-
//     amount rework that upgrades 7/8/9/11 also depend on.
//   - 46 — sets `tuSevenMulti = 1.05` feeding `acceleratorPower` formula
//     (`:2505-2507, :2516`); same blocker as 45/49.
//   - 48 — globalCoinMultiplier `s` × ((totalAccelerator × totalMultiplier)
//     /1000+1)^8 (`:2859-2862`); reaches into the cumulative-buy free-amount
//     machinery (totalAccelerator/totalMultiplier counts include free
//     amounts), defer with rework.
//   - 50 — only fires inside a challenge (`:2649-2654`); leaf 6.
//   - 51 — globalMythosMultiplier × totalAcceleratorBoost^2 (`:3062-3065`);
//     totalAcceleratorBoost = 0 pre-OL-905 would zero mythos production.
//   - 52 — globalMythosMultiplier × globalMythosMultiplier^0.025
//     (`:3067-3070`); self-referencing recursion — cannot bind a chain to
//     itself. Defer to a dedicated handler when the mythos-self-feedback
//     pattern earns a primitive.
//   - 53, 54 — mythosupgrade13/14 ×= acceleratorEffect^(1/125) /
//     multiplierEffect^(1/180) (`:3102-3110`); these multipliers are
//     per-mythos-producer (mythos-5 / mythos-4 in the cascade `:3253-3273`),
//     reaching into the same `acceleratorEffect`/`multiplierEffect` machinery
//     as the cumulative-buy rework.
//   - 55 — mythosupgrade15 × 1e1000^min(1000, buildingPower-1) (`:3112-3115`);
//     buildingPower lands with ascensions (later-arc).

const transcendGrantsByPosition: Record<number, UpgradeGrant[]> = {
  41: [
    {
      kind: 'multiplier',
      scope: { kind: 'tier-global', tier: 'coin' },
      multiplier: (state) => {
        const tp = bn(state.resourceValue('transcendPoints'));
        return Decimal.min(1e30, Decimal.pow(tp.add(4), 1 / 2));
      },
      description: 'Coin multiplier from transcend points / transcend upgrade 41',
    },
  ],
  42: [
    {
      kind: 'multiplier',
      scope: { kind: 'tier-global', tier: 'transcend' },
      multiplier: (state) => {
        const pp = bn(state.resourceValue('prestigePoints'));
        return Decimal.min(
          1e50,
          Decimal.pow(pp.add(1), 1 / 50)
            .div(2.5)
            .add(1),
        );
      },
      description: 'Mythos multiplier from prestige points / transcend upgrade 42',
    },
  ],
  43: [
    {
      kind: 'multiplier',
      scope: { kind: 'tier-global', tier: 'coin' },
      multiplier: (state) => {
        const tc = state.transcendCount();
        return Decimal.min(1e30, Decimal.pow(1.01, tc));
      },
      description: 'Coin multiplier from transcend count / transcend upgrade 43',
    },
  ],
  // 44, 45, 46 — see citation block above (transcendPointGain modifier /
  // freeUpgradeAccelerator / acceleratorPower; ship inert).
  47: [
    {
      kind: 'multiplier',
      scope: { kind: 'tier-global', tier: 'transcend' },
      multiplier: (state) => {
        // Inert until achievements (leaf 7) — `achievementPoints` is 0
        // pre-leaf-7 so 1.01^0 × (0/5+1) = 1. Closure ports verbatim.
        const ap = state.achievementPoints();
        return Decimal.mul(Decimal.pow(1.01, ap), ap / 5 + 1);
      },
      description: 'Mythos multiplier from achievements / transcend upgrade 47',
    },
  ],
  // 48-55 — see citation block above (cumulative-buy machinery /
  // challenge-conditional / Accelerator Boost / mythos-self-feedback /
  // acceleratorEffect / multiplierEffect / buildingPower; ship inert).
  56: [
    {
      kind: 'multiplier',
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-1' },
      multiplier: () => '1e5000',
      description: 'Worker × 1e5000 / transcend upgrade 56',
    },
  ],
  57: [
    {
      kind: 'multiplier',
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-2' },
      multiplier: () => '1e7500',
      description: 'Investment × 1e7500 / transcend upgrade 57',
    },
  ],
  58: [
    {
      kind: 'multiplier',
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-3' },
      multiplier: () => '1e15000',
      description: 'Printer × 1e15000 / transcend upgrade 58',
    },
  ],
  59: [
    {
      kind: 'multiplier',
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-4' },
      multiplier: () => '1e25000',
      description: 'Mint × 1e25000 / transcend upgrade 59',
    },
  ],
  60: [
    {
      kind: 'multiplier',
      scope: { kind: 'producer', tier: 'coin', producerId: 'coin-5' },
      multiplier: () => '1e35000',
      description: 'Alchemy × 1e35000 / transcend upgrade 60',
    },
  ],
};

const TRANSCEND_BAND_DESCRIPTIONS: Record<number, { name: string; description: string }> = {
  41: { name: 'Mythos Upgrade 1', description: 'Coin multiplier scales with transcend points.' },
  42: { name: 'Mythos Upgrade 2', description: 'Mythos multiplier scales with prestige points.' },
  43: { name: 'Mythos Upgrade 3', description: 'Coin multiplier scales with transcend count.' },
  44: {
    name: 'Mythos Upgrade 4',
    description: 'Transcend point gain ×= 1.01^transcendCount (deferred).',
  },
  45: {
    name: 'Mythos Upgrade 5',
    description: 'Free Accelerators from transcend shards (deferred).',
  },
  46: { name: 'Mythos Upgrade 6', description: 'Accelerator power bonus (deferred).' },
  47: { name: 'Mythos Upgrade 7', description: 'Mythos multiplier from achievement points.' },
  48: {
    name: 'Mythos Upgrade 8',
    description: 'Coin multiplier from accelerator/multiplier counts (deferred).',
  },
  49: {
    name: 'Mythos Upgrade 9',
    description: 'Free Multipliers from transcend points (deferred).',
  },
  50: { name: 'Mythos Upgrade 10', description: 'In-challenge Multiplier scaling (deferred).' },
  51: {
    name: 'Mythos Upgrade 11',
    description: 'Mythos multiplier from accelerator boosts (deferred until OL-905).',
  },
  52: {
    name: 'Mythos Upgrade 12',
    description: 'Mythos multiplier compounds itself (deferred — self-recursive shape).',
  },
  53: { name: 'Mythos Upgrade 13', description: 'Mythos-5 boost from acceleration (deferred).' },
  54: {
    name: 'Mythos Upgrade 14',
    description: 'Mythos-4 boost from multiplication (deferred).',
  },
  55: { name: 'Mythos Upgrade 15', description: 'Mythos-3 boost from building power (inert).' },
  56: { name: 'Mythos Upgrade 16', description: 'Multiply Worker production by 1e5000.' },
  57: { name: 'Mythos Upgrade 17', description: 'Multiply Investment production by 1e7500.' },
  58: { name: 'Mythos Upgrade 18', description: 'Multiply Printer production by 1e15000.' },
  59: { name: 'Mythos Upgrade 19', description: 'Multiply Mint production by 1e25000.' },
  60: { name: 'Mythos Upgrade 20', description: 'Multiply Alchemy production by 1e35000.' },
};

// Cost-log row 3 of `Variables.ts:23`.
const TRANSCEND_COST_LOG_BY_POSITION: Record<number, number> = {
  41: 1,
  42: 2,
  43: 3,
  44: 5,
  45: 6,
  46: 7,
  47: 42,
  48: 65,
  49: 87,
  50: 150,
  51: 300,
  52: 500,
  53: 1000,
  54: 1500,
  55: 2000,
  56: 3000,
  57: 6000,
  58: 12000,
  59: 25000,
  60: 75000,
};

export const TRANSCEND_UPGRADES: UpgradeDef[] = Array.from({ length: 20 }, (_, i): UpgradeDef => {
  const position = i + 41;
  const { name, description } = TRANSCEND_BAND_DESCRIPTIONS[position];
  return {
    id: `upgrade-${position}`,
    position,
    tier: 'transcend',
    costLog: TRANSCEND_COST_LOG_BY_POSITION[position],
    name,
    description,
    effects: transcendGrantsByPosition[position] ?? [],
  };
});
