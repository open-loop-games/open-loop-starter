/**
 * Antimatter Dimensions — total-conversion archetype mod.
 *
 * Layer 0 (OL-460): antimatter + 8 dimensions. Layer 0+ (OL-467): DimBoost,
 * Galaxy, Tickspeed, Sacrifice. Layer 1 (OL-461): Infinity Points, IP
 * upgrades, Infinity reset that cascades `'ad-layer0'`. Challenges (OL-462):
 * IC1/IC2/IC3. Layer 2 (OL-463): Eternity Points, EP upgrades, Eternity reset
 * that cascades through `layer1Reset` into `'ad-layer0'`.
 *
 * State is split across scoped persistent contexts so the growing set of
 * resets can target them by ID:
 *   - `'ad-layer0'` — antimatter + dim counts + purchasable levels + maxAntimatter
 *                     + boost/galaxy counts, tickspeed, sacrifice multiplier
 *   - `'ad-layer1'` — IP + maxIP + IP upgrade levels + infinity-run timer
 *   - `'ad-layer2'` — EP + EP upgrade levels + eternity-run timer
 *   - `'ad-meta'`   — never-reset: hasReachedInfinity, lifetimeInfinities,
 *                     hasReachedEternity, lifetimeEternities, totalTimePlayed.
 *                     Challenge completions persist in the category's own
 *                     per-challenge contexts (also never reset).
 */
import {
  withPersistentContext,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type ModifierChain,
  type Conversion,
  type Reset,
  type Purchasable,
  type PurchasableCategory,
  type Persistent,
  type Challenge,
  type ChallengeCategory,
} from 'open-loop-engine';
import type { ComputedRef } from 'vue';
import { setSlot } from '@/modules/ui-registry';
import AntimatterLayout from '@/ui/layouts/AntimatterLayout.vue';
import {
  dimensionDefs,
  STARTING_ANTIMATTER,
  type ADChallengeDef,
  type EPUpgradeDef,
  type IPUpgradeDef,
} from './content';
import { installDimensions, type ADDimension } from './dimensions';
import { installLayer1, installLayer2 } from './layers';
import { installChallenges } from './challenges';

export interface AntimatterDimensionsState {
  antimatter: Resource<DecimalSource>;
  maxAntimatter: Resource<DecimalSource>;
  dims: ADDimension[];
  productionChain: ModifierChain;
  // Layer 0+ mid-loop (OL-467)
  boostCount: Resource<DecimalSource>;
  galaxyCount: Resource<DecimalSource>;
  tickspeed: Purchasable;
  sacrificeMult: Resource<DecimalSource>;
  boostCost: ComputedRef<DecimalSource>;
  galaxyCost: ComputedRef<DecimalSource>;
  sacrificeGain: ComputedRef<DecimalSource>;
  canBoost: ComputedRef<boolean>;
  canGalaxy: ComputedRef<boolean>;
  canSacrifice: ComputedRef<boolean>;
  doBoost: () => boolean;
  doGalaxy: () => boolean;
  doSacrifice: () => boolean;
  // Layer 1
  infinityPoints: Resource<DecimalSource>;
  maxInfinityPoints: Resource<DecimalSource>;
  infinityTimer: Persistent<number>;
  totalTimePlayed: Persistent<number>;
  hasReachedInfinity: Persistent<boolean>;
  lifetimeInfinities: Resource<DecimalSource>;
  conversion: Conversion;
  layer1Reset: Reset;
  ipUpgrades: PurchasableCategory<IPUpgradeDef>;
  // Infinity Challenges (OL-462)
  challenges: ChallengeCategory<ADChallengeDef>;
  ic1: Challenge;
  ic2: Challenge;
  ic3: Challenge;
  // Layer 2 (OL-463)
  eternityPoints: Resource<DecimalSource>;
  eternityTimer: Persistent<number>;
  hasReachedEternity: Persistent<boolean>;
  lifetimeEternities: Resource<DecimalSource>;
  eternityConversion: Conversion;
  layer2Reset: Reset;
  epUpgrades: PurchasableCategory<EPUpgradeDef>;
}

export const AntimatterDimensionsKey: InjectionKey<AntimatterDimensionsState> =
  Symbol('antimatter-dimensions') as InjectionKey<AntimatterDimensionsState>;

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

      const layer1 = installLayer1(ctx, layer0);
      const challengeLayer = installChallenges(ctx, layer0, layer1);
      const layer2 = installLayer2(ctx, layer0, layer1);

      const state: AntimatterDimensionsState = {
        antimatter: layer0.antimatter,
        maxAntimatter: layer0.maxAntimatter,
        dims: layer0.dims,
        productionChain: layer0.productionChain,
        boostCount: layer0.boostCount,
        galaxyCount: layer0.galaxyCount,
        tickspeed: layer0.tickspeed,
        sacrificeMult: layer0.sacrificeMult,
        boostCost: layer0.boostCost,
        galaxyCost: layer0.galaxyCost,
        sacrificeGain: layer0.sacrificeGain,
        canBoost: layer0.canBoost,
        canGalaxy: layer0.canGalaxy,
        canSacrifice: layer0.canSacrifice,
        doBoost: layer0.doBoost,
        doGalaxy: layer0.doGalaxy,
        doSacrifice: layer0.doSacrifice,
        ...layer1,
        ...challengeLayer,
        ...layer2,
      };
      ctx.provide(AntimatterDimensionsKey, state);

      setSlot('game-layout', AntimatterLayout);
    },
  };
}

export const antimatterDimensionsModule: EngineModule = createAntimatterDimensionsModule();
