/**
 * Prestige mod — adds a Renown meta-currency on top of the loop.
 *
 * Renown is converted from gold via an independent conversion (sqrt-based).
 * Converting resets resources/actions/producers/upgrades (via the loop's
 * reset list), but Renown itself and skills persist. Each point of Renown
 * adds a flat +10% multiplier to every producer.
 */
import {
  Decimal,
  createResource,
  createIndependentConversion,
  createMultiplicativeModifier,
  beginPersistentContext,
  endPersistentContext,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type Conversion,
} from 'open-loop-engine';
import { coreState } from '@/modules/core';
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
  dependencies: ['core', 'loop'],
  install(_ctx: EngineContext) {
    const core = coreState!;

    beginPersistentContext('prestige');
    const renown = createResource<DecimalSource>(Decimal.dZero, {
      displayName: 'Renown',
    });
    endPersistentContext();

    // sqrt(gold / 10) — slow but steady
    const conversion = createIndependentConversion({
      baseResource: core.resources.gold,
      gainResource: renown,
      formula: (baseValue: DecimalSource) =>
        Decimal.sqrt(Decimal.div(baseValue, 10)),
      roundDownGain: true,
      onConvert: () => {
        // Reset run resources + upgrades. We do this manually rather than via
        // Reset so we can selectively skip renown itself.
        core.resources.wood.value = Decimal.dZero;
        core.resources.stone.value = Decimal.dZero;
        core.resources.gold.value = Decimal.dZero;
        core.upgrades.sharpAxe.amount.value = Decimal.dZero;
        core.upgrades.ironPickaxe.amount.value = Decimal.dZero;
        core.upgrades.foreman.amount.value = Decimal.dZero;
        for (const entry of core.producers.getAll()) {
          const repeatable = entry.producer.repeatable;
          if (repeatable) repeatable.amount.value = Decimal.dZero;
        }
      },
    });

    // Renown multiplier: each point of renown gives +10% to all producers
    const renownBoost = createMultiplicativeModifier({
      multiplier: () => Decimal.add(1, Decimal.mul(renown.value, 0.1)),
      description: 'Renown',
    });

    for (const entry of core.producers.getAll()) {
      entry.producer.rateChain.add(renownBoost);
    }

    prestigeState = {
      renown,
      conversion,
      resetRun: () => conversion.convert(),
    };

    setSlot('prestige-panel', PrestigePanel);
  },
};
