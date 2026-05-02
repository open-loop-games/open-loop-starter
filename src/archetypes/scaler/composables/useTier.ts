import type { ComputedRef } from 'vue';
import type {
  ChallengeCategory,
  ChallengeDef as EngineChallengeDef,
  Conversion,
  DecimalSource,
  InjectionKey,
  ModifierChain,
  ProducerCategory,
  Purchasable,
  PurchasableCategory,
  Resource,
} from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { CrystalUpgradeDef, ProducerDef, Tier, TranscendUpgradeDef } from '../data/types';
import { useProducers, type ProducerRow } from './useProducers';
import { useUpgrades, type UpgradeRow } from './useUpgrades';
import { useTierReset, type TierResetApi } from './useTierReset';

/**
 * UI-presentation config for one prestige tier. Inject keys are referenced
 * here — `useTier` reads them at render time so the engine state flows
 * through reactively. Lives next to the composable rather than in
 * `data/` because it's UI-presentation, not engine-construction config.
 */
export interface TierConfig<UpgradeDef extends { id: string } = { id: string }> {
  id: Tier;
  /** Title shown on the tier-header band and on the tab trigger. */
  title: string;
  /** Display label for the cumulative currency (e.g. 'Coins', 'Prestige Points'). */
  currencyDisplay: string;
  /** Optional shards display label, present on Prestige + Transcend. */
  shardsDisplay?: string;

  currencyKey: InjectionKey<Resource<DecimalSource>>;
  shardsKey?: InjectionKey<Resource<DecimalSource>>;
  producerCategoryKey: InjectionKey<ProducerCategory<ProducerDef>>;
  rateChainsKey: InjectionKey<ModifierChain[]>;
  totalRateKey?: InjectionKey<ComputedRef<DecimalSource>>;

  /** Category-shaped upgrades (Crystal / Transcend). Antimatter omits this. */
  upgradeCategoryKey?: InjectionKey<PurchasableCategory<UpgradeDef>>;
  /** Standalone purchasables outside any category (Acc, Mult, AccBoost). */
  extraPurchasables?: ExtraPurchasableRef[];

  /** Conversion that drives the reset button (Prestige + Transcend only). */
  conversionKey?: InjectionKey<Conversion>;

  /** Transcend-only — challenges live solely on the outermost tier. */
  challengesKey?: InjectionKey<ChallengeCategory<EngineChallengeDef>>;
}

export interface ExtraPurchasableRef {
  key: InjectionKey<Purchasable>;
  /** Display role; UI grouping driven by this. */
  role: 'accelerator' | 'multiplier' | 'acc-boost';
  /** Currency the purchasable spends. UI uses this only for label/tooltip
   *  context — engine enforces the actual cost via `createCostRequirement`. */
  costCurrencyDisplay: string;
}

export interface TierState {
  id: Tier;
  config: TierConfig;
  currency: Resource<DecimalSource>;
  shards?: Resource<DecimalSource>;
  producers: ComputedRef<ProducerRow[]>;
  rateChains: ModifierChain[];
  totalRate?: ComputedRef<DecimalSource>;
  upgrades?: ComputedRef<UpgradeRow<{ id: string }>[]>;
  extraPurchasables: { ref: ExtraPurchasableRef; purchasable: Purchasable }[];
  reset?: TierResetApi;
  challenges?: ChallengeCategory<EngineChallengeDef>;
}

/**
 * Compose a tier's UI-facing state bag from its config. Internally calls
 * the parameterized composables (`useProducers`, `useUpgrades`,
 * `useTierReset`) and resolves any standalone purchasables via
 * `useModule`. Components that need only one slice (e.g. a sidebar
 * chain readout) can call the building blocks directly — `useTier` is
 * for any consumer that wants the whole bag.
 */
export function useTier<
  UpgradeDef extends { id: string } = CrystalUpgradeDef | TranscendUpgradeDef,
>(config: TierConfig<UpgradeDef>): TierState {
  const currency = useModule(config.currencyKey);
  const shards = config.shardsKey ? useModule(config.shardsKey) : undefined;
  const rateChains = useModule(config.rateChainsKey);
  const totalRate = config.totalRateKey ? useModule(config.totalRateKey) : undefined;
  const producers = useProducers(config.producerCategoryKey);
  const upgrades = config.upgradeCategoryKey
    ? (useUpgrades(config.upgradeCategoryKey) as unknown as ComputedRef<
        UpgradeRow<{ id: string }>[]
      >)
    : undefined;
  const reset = config.conversionKey ? useTierReset(config.conversionKey) : undefined;
  const challenges = config.challengesKey ? useModule(config.challengesKey) : undefined;

  const extraPurchasables = (config.extraPurchasables ?? []).map((ref) => ({
    ref,
    purchasable: useModule(ref.key),
  }));

  return {
    id: config.id,
    config: config as TierConfig,
    currency,
    shards,
    producers,
    rateChains,
    totalRate: totalRate as ComputedRef<DecimalSource> | undefined,
    upgrades,
    extraPurchasables,
    reset,
    challenges,
  };
}
