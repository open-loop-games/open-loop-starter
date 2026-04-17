/**
 * Prestige mod — adds a Renown meta-currency on top of the loop.
 *
 * Engine systems demonstrated:
 *   - createIndependentConversion (resource transformation with gain formula)
 *   - createPersistentEffectSystem (renown bonus as a persistent conditional effect)
 *
 * Renown is converted from gold via an independent conversion (sqrt-based).
 * Converting resets resources/actions/producers/upgrades (via the loop's
 * reset list), but Renown itself and skills persist. The renown bonus is
 * registered through the persistent-effect system (not raw chain.add) so
 * EffectSystemRegistry provides full modifier→source attribution.
 *
 * Cross-references:
 *   - gathering.ts provides resources reset on conversion
 *   - economy.ts provides upgrades reset + productionChain for renown modifier
 */
import {
  Decimal,
  createResource,
  createIndependentConversion,
  createReset,
  createMultiplicativeModifier,
  createPersistentEffectSystem,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type Conversion,
} from 'open-loop-engine';
import { GatheringKey } from '@/modules/village-gatherer/gathering';
import { EconomyKey } from '@/modules/village-gatherer/economy';
import { setSlot } from '@/modules/ui-registry';
import PrestigePanel from '@/ui/panels/PrestigePanel.vue';

export interface PrestigeState {
  renown: Resource<DecimalSource>;
  conversion: Conversion;
  resetRun: () => void;
}

export const PrestigeKey: InjectionKey<PrestigeState> = Symbol('prestige') as InjectionKey<PrestigeState>;

export const prestigeModule: EngineModule = {
  id: 'prestige',
  dependencies: ['gathering', 'economy', 'loop'],
  install(ctx: EngineContext) {
    const g = ctx.inject(GatheringKey);
    const e = ctx.inject(EconomyKey);

    const renown = createResource<DecimalSource>(Decimal.dZero, { displayName: 'Renown' });

    // Reset gathering + economy on prestige conversion.
    // Renown lives in the prestige module context, so it's not in scope.
    const prestigeReset = createReset({
      resetModules: ['gathering', 'economy'],
    });

    // sqrt(gold / 10) — slow but steady
    const conversion = createIndependentConversion({
      baseResource: g.resources.gold,
      gainResource: renown,
      formula: (baseValue: DecimalSource) =>
        Decimal.sqrt(Decimal.div(baseValue, 10)),
      roundDownGain: true,
      reset: prestigeReset,
    });

    // Renown modifier via persistent-effect system (not raw chain.add)
    // so EffectSystemRegistry attributes the modifier to this source.
    const effects = createPersistentEffectSystem({ id: 'prestige-effects' });
    effects.register([{
      id: 'renown-boost',
      active: () => Decimal.gt(renown.value, 0),
      modifiers: [{
        chain: e.productionChain,
        modifier: () => createMultiplicativeModifier({
          multiplier: () => Decimal.add(1, Decimal.mul(renown.value, 0.1)),
          description: 'Renown',
        }),
      }],
    }]);

    const state: PrestigeState = {
      renown,
      conversion,
      resetRun: () => conversion.convert(),
    };

    ctx.provide(PrestigeKey, state);
    setSlot('prestige-panel', PrestigePanel);
  },
};
