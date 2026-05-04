import type {
  ChallengeCategory,
  ChallengeDef as EngineChallengeDef,
  Conversion,
  DecimalSource,
  InjectionKey,
  ProducerCategory,
  PurchasableCategory,
  Reset,
  Resource,
} from 'open-loop-engine';
import type {
  AntimatterUpgradeDef,
  CrystalUpgradeDef,
  ProducerDef,
  Tier,
  TranscendUpgradeDef,
} from '../data/types';

// A scaler "tier" is the archetype-specific composition of engine-native
// pieces (currency, optional shards, producers, optional upgrades, optional
// conversion + reset, optional challenges) into one prestige-layer bundle.
// The engine has no `Layer` primitive — it ships the per-piece registries
// (`ResourceRegistryKey`, `CategoriesKey`) and lets consumers compose. This
// shape is the scaler-side composition.
export interface ScalerTier {
  id: Tier;
  currency: Resource<DecimalSource>;
  shards?: Resource<DecimalSource>;
  producers: ProducerCategory<ProducerDef>;
  upgrades?: PurchasableCategory<AntimatterUpgradeDef | CrystalUpgradeDef | TranscendUpgradeDef>;
  conversion?: Conversion;
  reset?: Reset;
  challenges?: ChallengeCategory<EngineChallengeDef>;
}

// Single key for the per-archetype tier registry. Antimatter creates the
// array (no deps → installs first); prestige + transcend inject the array
// in connect() and push their own entries. Iteration order follows
// dependency order: antimatter → prestige → transcend.
export const ScalerTiersKey: InjectionKey<ScalerTier[]> = Symbol('scaler/tiers') as InjectionKey<
  ScalerTier[]
>;
