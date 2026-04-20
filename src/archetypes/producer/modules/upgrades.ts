import {
  createPurchasableCategory,
  createCostRequirement,
  type EngineModule,
  type Grant,
  type InjectionKey,
  type ModifierChain,
  type PurchasableCategory,
} from 'open-loop-engine';
import type { ProducerData, UpgradeDef } from '../data/types';
import { BuildingsKey, PrimaryResourceKey } from './producers';

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

      const clickChain = buildings.getProducer('click')!.rateChain;
      const continuousChains: ModifierChain[] = [];
      for (const p of data.producers) {
        if (p.trigger !== 'continuous') continue;
        const producer = buildings.getProducer(p.id);
        if (producer) continuousChains.push(producer.rateChain);
      }
      const allChains: ModifierChain[] = [clickChain, ...continuousChains];

      const upgrades = createPurchasableCategory<UpgradeDef>({
        id: 'producer/upgrades',
        mapPurchasable: (def) => {
          const chain = resolveUpgradeTarget(def, buildings, clickChain, allChains);
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

function resolveUpgradeTarget(
  def: UpgradeDef,
  buildings: { getProducer(id: string): { rateChain: ModifierChain } | undefined },
  clickChain: ModifierChain,
  allChains: ModifierChain[],
): ModifierChain | ModifierChain[] {
  if (def.targetProducerId === null) return allChains;
  if (def.targetProducerId === 'click') return clickChain;
  const producer = buildings.getProducer(def.targetProducerId);
  if (!producer) {
    throw new Error(`Upgrade "${def.id}" targets unknown producer "${def.targetProducerId}"`);
  }
  return producer.rateChain;
}
