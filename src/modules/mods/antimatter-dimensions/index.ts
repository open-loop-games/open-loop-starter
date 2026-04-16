/**
 * Antimatter Dimensions — total-conversion archetype mod (OL-460 / OL-369 4b).
 *
 * Layer 0 skeleton: antimatter resource + 4 dimensions with per-10-pack cost
 * scaling and cascade production. No prestige wiring yet — Layers 1 (Infinity)
 * and 2 (Eternity) land in 4c and 4e.
 *
 * Persistent state is split into scoped contexts so future `resetModules:
 * ['ad-layer0']` can target Layer 0's refs without pulling in challenge
 * rewards or higher-layer currencies.
 */
import {
  withPersistentContext,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type ModifierChain,
} from 'open-loop-engine';
import { setSlot } from '@/modules/ui-registry';
import AntimatterLayout from '@/ui/layouts/AntimatterLayout.vue';
import { dimensionDefs, STARTING_ANTIMATTER } from './content';
import { installDimensions, type ADDimension } from './dimensions';

export interface AntimatterDimensionsState {
  antimatter: Resource<DecimalSource>;
  dims: ADDimension[];
  productionChain: ModifierChain;
}

export const AntimatterDimensionsKey: InjectionKey<AntimatterDimensionsState> =
  Symbol('antimatter-dimensions') as InjectionKey<AntimatterDimensionsState>;

/**
 * Factory for the AD module. Follows the idle-loops shape so 4f's sensitivity
 * harness can spin up scratch engines with fresh module instances.
 */
export function createAntimatterDimensionsModule(): EngineModule {
  return {
    id: 'antimatter-dimensions',
    dependencies: ['settings', 'ui-registry'],
    install(ctx: EngineContext) {
      const layer0 = withPersistentContext('ad-layer0', () =>
        installDimensions(ctx, {
          startingAntimatter: STARTING_ANTIMATTER,
          dimensions: dimensionDefs,
        }),
      );

      const state: AntimatterDimensionsState = {
        antimatter: layer0.antimatter,
        dims: layer0.dims,
        productionChain: layer0.productionChain,
      };
      ctx.provide(AntimatterDimensionsKey, state);

      setSlot('game-layout', AntimatterLayout);
    },
  };
}

export const antimatterDimensionsModule: EngineModule = createAntimatterDimensionsModule();
