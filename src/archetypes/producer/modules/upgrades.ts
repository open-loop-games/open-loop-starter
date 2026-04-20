import {
  createPurchasableCategory,
  createCostRequirement,
  type EngineModule,
  type Grant,
  type InjectionKey,
  type ModifierChain,
  type ProducerCategory,
  type PurchasableCategory,
} from 'open-loop-engine';
import type { ProducerData, ProducerDef, UpgradeDef } from '../data/types';
import { AllRateChainsKey, BuildingsKey, PrimaryResourceKey } from './producers';

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

      const upgrades = createPurchasableCategory<UpgradeDef>({
        id: 'producer/upgrades',
        mapPurchasable: (def) => {
          const chain = resolveUpgradeTarget(def, buildings, allChains);
          const grants: Grant[] = [{ chain, mult: def.multiplier, description: def.name }];
          return {
            display: { title: def.name, description: def.description },
            requirements: createCostRequirement({ resource: primary, cost: def.cost }),
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
