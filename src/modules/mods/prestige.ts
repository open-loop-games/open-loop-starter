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
  createMultiplicativeModifier,
  createPersistentEffectSystem,
  beginPersistentContext,
  endPersistentContext,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type Conversion,
} from 'open-loop-engine';
import { gatheringState } from '@/modules/gathering';
import { economyState } from '@/modules/economy';
import { setSlot } from '@/modules/ui-registry';
import PrestigePanel from '@/ui/panels/PrestigePanel.vue';

export interface PrestigeState {
  renown: Resource<DecimalSource>;
  conversion: Conversion;
  resetRun: () => void;
}

export let prestigeState: PrestigeState | null = null;

export const prestigeModule: EngineModule = {
  id: 'prestige',
  dependencies: ['gathering', 'economy', 'loop'],
  install(_ctx: EngineContext) {
    const g = gatheringState!;
    const e = economyState!;

    beginPersistentContext('prestige');
    const renown = createResource<DecimalSource>(Decimal.dZero, {
      displayName: 'Renown',
    });
    endPersistentContext();

    // sqrt(gold / 10) — slow but steady
    const conversion = createIndependentConversion({
      baseResource: g.resources.gold,
      gainResource: renown,
      formula: (baseValue: DecimalSource) =>
        Decimal.sqrt(Decimal.div(baseValue, 10)),
      roundDownGain: true,
      onConvert: () => {
        // Reset run resources + upgrades
        g.resources.wood.value = Decimal.dZero;
        g.resources.stone.value = Decimal.dZero;
        g.resources.gold.value = Decimal.dZero;
        e.upgrades.sharpAxe.amount.value = Decimal.dZero;
        e.upgrades.ironPickaxe.amount.value = Decimal.dZero;
        e.upgrades.foreman.amount.value = Decimal.dZero;
        for (const entry of e.producers.getAll()) {
          const repeatable = entry.producer.repeatable;
          if (repeatable) repeatable.amount.value = Decimal.dZero;
        }
      },
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

    prestigeState = {
      renown,
      conversion,
      resetRun: () => conversion.convert(),
    };

    setSlot('prestige-panel', PrestigePanel);
  },
};
