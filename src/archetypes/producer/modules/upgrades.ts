import {
  Decimal,
  createPurchasableCategory,
  createCostRequirement,
  tunable,
  type Computable,
  type DecimalSource,
  type EngineModule,
  type Grant,
  type InjectionKey,
  type ModifierChain,
  type OverrideRegistry,
  type ProducerCategory,
  type PurchasableCategory,
} from 'open-loop-engine';
import type { ProducerData, ProducerDef, UpgradeDef } from '../data/types';
import {
  AllRateChainsKey,
  BuildingsKey,
  PrimaryResourceKey,
  ProducerTuningRegistryKey,
  type ProducerTunables,
} from './producers';

export const UpgradesKey: InjectionKey<PurchasableCategory<UpgradeDef>> = Symbol(
  'producer/upgrades',
) as InjectionKey<PurchasableCategory<UpgradeDef>>;

export function createUpgradesModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/upgrades',
    dependencies: ['producer/producers'],
    install(ctx) {
      const buildings = ctx.inject(BuildingsKey);
      const primary = ctx.inject(PrimaryResourceKey);
      const allChains = ctx.inject(AllRateChainsKey);
      const tuningRegistry = ctx.inject(ProducerTuningRegistryKey);

      const tier1Multiplier = tunable(
        tuningRegistry,
        'balance/tier1UpgradeMultiplier',
        () => data.balance.tier1UpgradeMultiplier,
      );

      const upgrades = createPurchasableCategory<UpgradeDef>({
        id: 'producer/upgrades',
        mapPurchasable: (def) => {
          const chain = resolveUpgradeTarget(def, buildings, allChains);
          const grants: Grant[] = [{ chain, mult: def.multiplier, description: def.name }];
          return {
            display: { title: def.name, description: def.description },
            requirements: createCostRequirement({
              resource: primary,
              cost: resolveUpgradeCost(def, data, tuningRegistry, tier1Multiplier),
            }),
            limit: 1,
            grants,
          };
        },
      });
      upgrades.register(data.upgrades);

      ctx.provide(UpgradesKey, upgrades);
    },
  };
}

// Tier-i upgrade cost is `producer.baseCost × balance.tier1UpgradeMultiplier`.
// Routing through a computed against the tunables lets the balance solver
// retune either axis via `pushScope` without mutating data or re-baking
// upgrade rows. The producer baseCost lookup prefers the registry (so
// scope-pushed producer costs flow through to tier-i upgrade cost, matching
// the solver's existing proposal-threading). Non-tier-i upgrades pass their
// static cost through unchanged.
function resolveUpgradeCost(
  def: UpgradeDef,
  data: ProducerData,
  registry: OverrideRegistry<ProducerTunables>,
  tier1Multiplier: Computable<DecimalSource>,
): Computable<DecimalSource> {
  if (!def.id.endsWith('-boost-i')) return def.cost;
  const producerId = def.id.slice(0, -'-boost-i'.length);
  const producer = data.producers.find((p) => p.id === producerId);
  if (!producer?.purchase) return def.cost;
  const baseCostKey = `producers/${producerId}/purchase/baseCost` as keyof ProducerTunables;
  // Getter form of Computable, not computed(). Avoids cross-brand Ref coerce
  // between the engine's bundled Vue and the starter's Vue — engine's
  // OverrideRegistry.scopeVersion already tracks reactivity via registry.get,
  // and the downstream Formula evaluator calls this getter on demand.
  return () => {
    void registry.scopeVersion.value;
    const baseCost = registry.has(baseCostKey)
      ? registry.get(baseCostKey)()
      : producer.purchase!.baseCost;
    return Decimal.mul(baseCost, (tier1Multiplier as { value: DecimalSource }).value);
  };
}

// `null` → all rate chains (headline). Any other id (including the click
// producer) routes to that producer's rate chain — the click producer is
// just a manual-trigger entry in `data.producers`, so no special case.
function resolveUpgradeTarget(
  def: UpgradeDef,
  buildings: ProducerCategory<ProducerDef>,
  allChains: ModifierChain[],
): ModifierChain | ModifierChain[] {
  if (def.targetProducerId === null) return allChains;
  const producer = buildings.getProducer(def.targetProducerId);
  if (!producer) {
    throw new Error(`Upgrade "${def.id}" targets unknown producer "${def.targetProducerId}"`);
  }
  return producer.rateChain;
}
