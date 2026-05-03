import { computed, type ComputedRef } from 'vue';
import type {
  ChallengeCategory,
  ChallengeDef as EngineChallengeDef,
  Conversion,
  DecimalSource,
  InjectionKey,
  ModifierChain,
  ProducerCategory,
  Purchasable,
  Resource,
} from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { CrystalUpgradeDef, ProducerDef, Tier, TranscendUpgradeDef } from '../data/types';
import type { UpgradeRoster } from '../modules';
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

  /** Roster-shaped upgrades (Crystal / Transcend). Antimatter omits this. */
  upgradeRosterKey?: InjectionKey<UpgradeRoster<UpgradeDef>>;
  /** Standalone purchasables outside any roster (Acc, Mult, AccBoost). */
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
  totalRate: ComputedRef<DecimalSource>;
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
 *
 * `rateChains` and `totalRate` derive from the producer category — they're
 * one-liners off `producerCategory.getAll()` rather than separate injection
 * keys, since the category is already in scope.
 */
export function useTier<
  UpgradeDef extends { id: string } = CrystalUpgradeDef | TranscendUpgradeDef,
>(config: TierConfig<UpgradeDef>): TierState {
  const currency = useModule(config.currencyKey);
  const shards = config.shardsKey ? useModule(config.shardsKey) : undefined;
  const producerCategory = useModule(config.producerCategoryKey);
  const rateChains = producerCategory.getAll().map((entry) => entry.producer.rateChain);
  // Producers in scaler always emit into shards (when present) or the tier's
  // own currency (antimatter case where coins are both currency and output).
  const outputResource = shards ?? currency;
  const totalRate = computed(() => producerCategory.getTotalRate(outputResource));
  const producers = useProducers(config.producerCategoryKey);
  const upgrades = config.upgradeRosterKey
    ? (useUpgrades(config.upgradeRosterKey) as unknown as ComputedRef<UpgradeRow<{ id: string }>[]>)
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
    totalRate,
    upgrades,
    extraPurchasables,
    reset,
    challenges,
  };
}
