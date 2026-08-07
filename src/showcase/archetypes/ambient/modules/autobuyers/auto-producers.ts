import { persistent, type EngineContext, type EngineModule } from '@open-loop/engine';
import {
  setupPolicyAutoPurchase,
  selectionHybridPayback,
  type Producer,
  type ProducerCategory,
  type SelectionPolicy,
} from '@open-loop/engine';
import { getAutoProducers } from '../auto-producers';
import { AutomationTiersKey } from '../automation';
import type { AutoProducerDef } from '../../data/types';
import {
  AutobuyerMasterToggleKey,
  AutobuyerRegistryKey,
  autobuyerGate,
  type AutobuyerSpec,
} from './index';

// vanilla canonical (autobuyer set):
//   Ambient corpus — Cookie Clicker, Realm Grinder, Trimps, Rusty's
//     Retirement, Chillquarium — none ship a player-toggleable producer
//     auto-buy in the archetype's first arc. The first-arc port treats the
//     probe-side `setupPolicyAutoPurchase` install that preceded this module
//     (`balance/_engine.ts`, `buildAmbientSimEngine`) as the canonical
//     reference: bot behavior the player should be able to opt into, not a
//     fork-extension layer.
//
// Visibility unlocks (`modules/unlocks.ts`) deliberately stay out of this
// registry. Their `setupSweepAutoPurchase` install runs with `() => true`
// — soft reveals fire unconditionally on threshold cross. The Ambient
// archetype contract forbids player-pausable content reveals; gating them
// behind the master toggle would let "pause automation" mute new content
// reveals, which directly contradicts the archetype's no-pressure
// commitment.

export function buildAutoProducerPolicy(
  buildings: ProducerCategory<AutoProducerDef>,
): SelectionPolicy<Producer> {
  return selectionHybridPayback({
    getCost: (p) => p.repeatable!.getCost(1),
    getRate: (p) => p.computedRate.value,
    getResource: (p) => p.resource.value,
    getReserve: () => 0,
    getHeadlineRate: (p) => buildings.getTotalRate(p.resource),
  });
}

export function createAutoProducerAutobuyersModule(): EngineModule {
  return {
    id: 'ambient/autobuyers/auto-producers',
    dependencies: ['ambient/automation', 'ambient/auto-producers', 'ambient/autobuyers'],
    install(): void {
      // Wiring lives in connect() — autobuyers read category shape from
      // sibling modules' getters, populated only after every install() runs.
    },
    connect(ctx: EngineContext): void {
      const buildings = getAutoProducers();
      const tiers = ctx.inject(AutomationTiersKey);
      const master = ctx.inject(AutobuyerMasterToggleKey);
      const registry = ctx.inject(AutobuyerRegistryKey);

      const producerAutoBuy: AutobuyerSpec = {
        id: 'autobuyer/ambient/producers',
        groupId: 'producers',
        displayName: 'Producer auto-buy',
        // The `basic` tier is the whole gate here — there is no content
        // condition on top of it.
        tier: 'basic',
        isUnlocked: () => true,
        isActive: persistent<boolean>(false, { name: 'ambient-producers-active' }),
      };
      registry.push(producerAutoBuy);
      setupPolicyAutoPurchase(
        buildings,
        {
          enabled: autobuyerGate(tiers, master, producerAutoBuy),
          interval: 1,
          policy: buildAutoProducerPolicy(buildings),
        },
        ctx.onTick,
      );
    },
  };
}
