import { persistent, type EngineContext, type EngineModule } from 'open-loop-engine';
import {
  setupPolicyAutoPurchase,
  setupSweepAutoPurchase,
  selectionHybridPayback,
  type Producer,
  type ProducerCategory,
  type SelectionPolicy,
} from 'open-loop-engine';
import { ScalerTiersKey } from '../tiers';
import type { ProducerDef } from '../../data/types';
import {
  AutobuyerMasterToggleKey,
  AutobuyerRegistryKey,
  autobuyerGate,
  type AutobuyerSpec,
} from './index';

// vanilla canonical (autobuyer set):
//   SynergismOfficial/src/Automation.ts:33-48 (buyAutobuyers — per-producer
//     unlock upgrades [81..86] paid in prestigePoints).
//   SynergismOfficial/src/Automation.ts:73-86 (autoUpgrades — coin upgrades
//     1..20 sweep, gated on player.upgrades[91]).
// Slim port collapses both into a tier-level registry: one autobuyer covers
// every antimatter producer, one covers every antimatter upgrade.
//
// Unlock-gate decision deferred: every slim-port autobuyer ships unlocked
// from the start. Milestone gating (Synergism's per-producer unlock-
// purchasable economy or AD's challenge-completion gating) is fork-
// extension territory at sub-leaf B; the spec carries `isUnlocked` so a
// future milestone wire-up needs no spec change.

export function buildTierProducerPolicy(
  producers: ProducerCategory<ProducerDef>,
): SelectionPolicy<Producer> {
  return selectionHybridPayback({
    getCost: (p) => p.repeatable!.getCost(1),
    getRate: (p) => p.computedRate.value,
    getResource: (p) => p.resource.value,
    getReserve: () => 0,
    getHeadlineRate: (p) => producers.getTotalRate(p.resource),
  });
}

export function createAntimatterAutobuyersModule(): EngineModule {
  return {
    id: 'scaler/autobuyers/antimatter',
    dependencies: ['scaler/antimatter', 'scaler/autobuyers'],
    install(): void {
      // Wiring lives in connect() — autobuyers read tier shape from
      // ScalerTiersKey, populated only after every tier's connect() has run.
    },
    connect(ctx: EngineContext): void {
      const tiers = ctx.inject(ScalerTiersKey);
      const tier = tiers.find((t) => t.id === 'antimatter');
      if (!tier) throw new Error('scaler/autobuyers/antimatter: antimatter tier missing');
      if (!tier.upgrades) {
        throw new Error('scaler/autobuyers/antimatter: antimatter upgrades missing');
      }

      const master = ctx.inject(AutobuyerMasterToggleKey);
      const registry = ctx.inject(AutobuyerRegistryKey);

      const isUnlocked = () => true;

      // === producer auto-buy ===
      const producerAutoBuy: AutobuyerSpec = {
        id: 'autobuyer/antimatter/producers',
        groupId: 'antimatter',
        displayName: 'Antimatter producer auto-buy',
        isUnlocked,
        isActive: persistent<boolean>(false, { name: 'antimatter-producers-active' }),
      };
      registry.push(producerAutoBuy);
      setupPolicyAutoPurchase(
        tier.producers,
        {
          enabled: autobuyerGate(master, producerAutoBuy),
          interval: 1,
          policy: buildTierProducerPolicy(tier.producers),
        },
        ctx.onTick,
      );

      // === upgrade auto-buy ===
      // Adopts setupSweepAutoPurchase (engine helper). Replaces the hand-
      // rolled `while (upgradeAccum >= upgradeInterval) sweep…` loop the
      // pre-OL-854 bot carried.
      const upgradeAutoBuy: AutobuyerSpec = {
        id: 'autobuyer/antimatter/upgrades',
        groupId: 'antimatter',
        displayName: 'Antimatter upgrade auto-buy',
        isUnlocked,
        isActive: persistent<boolean>(false, { name: 'antimatter-upgrades-active' }),
      };
      registry.push(upgradeAutoBuy);
      setupSweepAutoPurchase(
        tier.upgrades.getAll().map((entry) => entry.purchasable),
        autobuyerGate(master, upgradeAutoBuy),
        ctx.onTick,
      );
    },
  };
}
