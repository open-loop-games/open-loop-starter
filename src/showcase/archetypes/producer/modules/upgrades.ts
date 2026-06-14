import { computed } from 'vue';
import {
  Decimal,
  createPurchasableCategory,
  createCostRequirement,
  tunable,
  type EngineModule,
  type Grant,
  type ModifierChain,
  type ProducerCategory,
  type PurchasableCategory,
} from '@open-loop/engine';
import type {
  CrossBuildingClickBonusUpgradeDef,
  MultiplierUpgradeDef,
  ProducerData,
  ProducerDef,
  UpgradeDef,
} from '../data/types';
import { CLICK_PRODUCER_ID } from '../data/producers';
import {
  ProducerTuningRegistryKey,
  getBuildings,
  getPrimaryResource,
  type ProducerInstanceState,
} from './producers';

type Buildings = ProducerCategory<ProducerDef, ProducerInstanceState>;

let upgrades: PurchasableCategory<UpgradeDef>;

export function getUpgrades(): PurchasableCategory<UpgradeDef> {
  return upgrades;
}

export function createUpgradesModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/upgrades',
    dependencies: ['producer/producers'],
    install(ctx) {
      const buildings = getBuildings();
      const primary = getPrimaryResource();
      const tuningRegistry = ctx.inject(ProducerTuningRegistryKey);

      // Wired through tunable() so balance scripts can retune the ×2
      // tiered-multiplier headline without rewriting every upgrade row.
      // Source: `Game.MakeTiered` wires ×2 into the building's rate
      // function on upgrade purchase (`main.js:10145–10155`).
      tunable(tuningRegistry, 'balance/tieredUpgradeMultiplier', () => 2);

      upgrades = createPurchasableCategory<UpgradeDef>({
        id: 'producer/upgrades',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.description },
          requirements: createCostRequirement({
            resource: primary,
            cost: def.cost,
          }),
          limit: 1,
          grants: resolveGrants(def, buildings),
        }),
      });
      upgrades.register(data.upgrades);
    },
  };
}

function resolveGrants(def: UpgradeDef, buildings: Buildings): Grant[] {
  switch (def.kind) {
    case 'multiplier':
      return resolveMultiplierGrants(def, buildings);
    case 'cross-building-click-bonus':
      return resolveCrossBuildingClickBonusGrants(def, buildings);
  }
}

function resolveMultiplierGrants(def: MultiplierUpgradeDef, buildings: Buildings): Grant[] {
  const chains = resolveChains(def.targetProducerId, buildings);
  return [{ chain: chains, mult: def.multiplier, description: def.name }];
}

// `null` → headline (every producer's rate chain). `string` → that
// producer's chain. `string[]` → chains for each id; canonical case is
// cursor tier upgrades binding to both 'click' and 'cursor'.
function resolveChains(
  target: MultiplierUpgradeDef['targetProducerId'],
  buildings: Buildings,
): ModifierChain | ModifierChain[] {
  if (target === null) {
    return buildings.getAll().map((entry) => entry.producer.rateChain);
  }
  const ids = Array.isArray(target) ? target : [target];
  const chains = ids.map((id) => {
    const producer = buildings.getProducer(id);
    if (!producer) {
      throw new Error(`Upgrade targets unknown producer "${id}"`);
    }
    return producer.rateChain;
  });
  return chains.length === 1 ? chains[0] : chains;
}

// Thousand fingers series: additive bind on the click producer's rate
// chain, contributing `perNonCursorBuilding × non-cursor-count`. The
// non-cursor count excludes both the manual click producer and the
// cursor building (canonical "non-cursor buildings" reading).
function resolveCrossBuildingClickBonusGrants(
  def: CrossBuildingClickBonusUpgradeDef,
  buildings: Buildings,
): Grant[] {
  const clickProducer = buildings.getProducer(CLICK_PRODUCER_ID);
  if (!clickProducer) {
    throw new Error(`Upgrade "${def.id}" requires the click producer to exist`);
  }
  const nonCursorCount = computed(() => {
    let count: Decimal = Decimal.dZero;
    for (const entry of buildings.getAll()) {
      if (entry.def.id === CLICK_PRODUCER_ID || entry.def.id === 'cursor') continue;
      count = count.add(entry.producer.count.value);
    }
    return count;
  });
  return [
    {
      chain: clickProducer.rateChain,
      add: computed(() => Decimal.mul(def.perNonCursorBuilding, nonCursorCount.value)),
      description: def.name,
    },
  ];
}
