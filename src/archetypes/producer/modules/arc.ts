import { computed, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { Decimal, persistent, type EngineModule, type InjectionKey } from 'open-loop-engine';
import type { ProducerData } from '../data/types';
import { BuildingsKey } from './producers';
import { UpgradesKey } from './upgrades';

export interface ArcState {
  /** True when all arc-closure conditions are currently satisfied. */
  complete: ComputedRef<boolean>;
  /** Latches true the first time `complete` flips true — survives save/load. */
  announced: Ref<boolean>;
  /** End-of-arc flavour line — surfaced by the UI layer on first crossing. */
  flavour: string;
}

export const ArcKey: InjectionKey<ArcState> = Symbol('producer/arc') as InjectionKey<ArcState>;

const DEFAULT_FLAVOUR =
  'The Bakery hums. Every tier purrs; every upgrade is paid off; the cookie tide is irreversible.';

export function createArcModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/arc',
    dependencies: ['producer/producers', 'producer/upgrades'],
    install(ctx) {
      const buildings = ctx.inject(BuildingsKey);
      const upgrades = ctx.inject(UpgradesKey);

      const announced = persistent<boolean>(false, { name: 'arcAnnounced' });

      const continuousIds = data.producers
        .filter((p) => p.trigger === 'continuous')
        .map((p) => p.id);
      // Arc-close requires owning every continuous producer AND buying every
      // in-arc upgrade. Tier-iii per-producer upgrades are post-arc content;
      // globals + tier-i/ii/iia per-producer are all required. Aligns beat-8
      // firing condition with the full in-arc content slate.
      const arcUpgradeIds = data.upgrades
        .filter((u) => !u.id.endsWith('-boost-iii'))
        .map((u) => u.id);

      const complete = computed(() => {
        for (const id of continuousIds) {
          const producer = buildings.getProducer(id);
          if (!producer) return false;
          if (!Decimal.gte(producer.count.value, 1)) return false;
        }
        for (const id of arcUpgradeIds) {
          const purchasable = upgrades.getPurchasable(id);
          if (!purchasable?.active.value) return false;
        }
        return true;
      });

      watch(
        complete,
        (isComplete) => {
          if (isComplete && !announced.value) announced.value = true;
        },
        { immediate: true },
      );

      ctx.provide(ArcKey, {
        complete,
        announced,
        flavour: DEFAULT_FLAVOUR,
      });
    },
  };
}
