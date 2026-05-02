import type { TierConfig } from '../composables/useTier';
import type { CrystalUpgradeDef, TranscendUpgradeDef } from '../data/types';
import {
  AcceleratorBoostKey,
  AntimatterAcceleratorKey,
  AntimatterCoinKey,
  AntimatterMultiplierKey,
  AntimatterProducersKey,
  AntimatterRateChainsKey,
  AntimatterTotalRateKey,
  ChallengesKey,
  CrystalUpgradesKey,
  PrestigeConversionKey,
  PrestigePointsKey,
  PrestigeProducersKey,
  PrestigeRateChainsKey,
  PrestigeShardRateKey,
  PrestigeShardsKey,
  TranscendConversionKey,
  TranscendPointsKey,
  TranscendProducersKey,
  TranscendRateChainsKey,
  TranscendShardRateKey,
  TranscendShardsKey,
  TranscendUpgradesKey,
} from '../modules';

export const ANTIMATTER_TIER: TierConfig = {
  id: 'antimatter',
  title: 'Antimatter',
  currencyDisplay: 'Coins',
  currencyKey: AntimatterCoinKey,
  producerCategoryKey: AntimatterProducersKey,
  rateChainsKey: AntimatterRateChainsKey,
  totalRateKey: AntimatterTotalRateKey,
  extraPurchasables: [
    {
      key: AntimatterAcceleratorKey,
      role: 'accelerator',
      costCurrencyDisplay: 'Coins',
    },
    {
      key: AntimatterMultiplierKey,
      role: 'multiplier',
      costCurrencyDisplay: 'Coins',
    },
  ],
};

export const PRESTIGE_TIER: TierConfig<CrystalUpgradeDef> = {
  id: 'prestige',
  title: 'Prestige',
  currencyDisplay: 'Prestige Points',
  shardsDisplay: 'Prestige Shards',
  currencyKey: PrestigePointsKey,
  shardsKey: PrestigeShardsKey,
  producerCategoryKey: PrestigeProducersKey,
  rateChainsKey: PrestigeRateChainsKey,
  totalRateKey: PrestigeShardRateKey,
  upgradeCategoryKey: CrystalUpgradesKey,
  conversionKey: PrestigeConversionKey,
};

export const TRANSCEND_TIER: TierConfig<TranscendUpgradeDef> = {
  id: 'transcend',
  title: 'Transcendence',
  currencyDisplay: 'Transcend Points',
  shardsDisplay: 'Transcend Shards',
  currencyKey: TranscendPointsKey,
  shardsKey: TranscendShardsKey,
  producerCategoryKey: TranscendProducersKey,
  rateChainsKey: TranscendRateChainsKey,
  totalRateKey: TranscendShardRateKey,
  upgradeCategoryKey: TranscendUpgradesKey,
  conversionKey: TranscendConversionKey,
  challengesKey: ChallengesKey,
  // Acc Boost is the cross-currency standalone purchasable. The TierPanel's
  // #extras slot owns its rendering in 2b.3 (cost in prestigePoints, not
  // transcendPoints — engine enforces via createCostRequirement; the display
  // hint here is for the UI label only).
  extraPurchasables: [
    {
      key: AcceleratorBoostKey,
      role: 'acc-boost',
      costCurrencyDisplay: 'Prestige Points',
    },
  ],
};

export const TIER_CONFIGS = {
  antimatter: ANTIMATTER_TIER,
  prestige: PRESTIGE_TIER,
  transcend: TRANSCEND_TIER,
} as const;
