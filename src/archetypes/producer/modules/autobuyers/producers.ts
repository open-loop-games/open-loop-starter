import { persistent, type EngineContext, type EngineModule } from 'open-loop-engine';
import {
  setupPolicyAutoPurchase,
  setupSweepAutoPurchase,
  selectionHybridPayback,
  type Producer,
  type ProducerCategory,
  type SelectionPolicy,
} from 'open-loop-engine';
import { getBuildings, type ProducerInstanceState } from '../producers';
import { getUpgrades } from '../upgrades';
import type { ProducerDef } from '../../data/types';
import {
  AutobuyerMasterToggleKey,
  AutobuyerRegistryKey,
  autobuyerGate,
  type AutobuyerSpec,
} from './index';

// vanilla canonical (autobuyer set):
//   CookieClickerSourceCode/main.js — Cookie Clicker has no in-game autobuyer
//     surface; the canonical "autobuy upgrades" behavior lives in player-side
//     mods (Frozen Cookies, Cookie Monster). The first-arc port treats the bot
//     behavior pre-OL-855 as the canonical reference point, since the bot
//     was already the implementation site.
//   SynergismOfficial/src/Automation.ts:73-86 — autoUpgrades sweep
//     (gated on player.upgrades[91]) is the closest external precedent for
//     the upgrade-sweep autobuyer; producer's first-arc port collapses to a
//     single-category sweep across all unlocked upgrades.
//
// Producer is single-category (not tier-stratified like scaler), so unlock
// gates ship as `() => true`: the click producer is reachable from sim-start
// and the cookie economy bootstraps from there. Forks that introduce tier
// gating (e.g. milestone-locked upgrade panels) can carry it through the
// `isUnlocked` slot without restructuring the spec.

export function buildProducerPolicy(
  buildings: ProducerCategory<ProducerDef, ProducerInstanceState>,
): SelectionPolicy<Producer> {
  return selectionHybridPayback({
    getCost: (p) => p.repeatable!.getCost(1),
    getRate: (p) => p.computedRate.value,
    getResource: (p) => p.resource.value,
    getReserve: () => 0,
    getHeadlineRate: (p) => buildings.getTotalRate(p.resource),
  });
}

export function createProducerAutobuyersModule(): EngineModule {
  return {
    id: 'producer/autobuyers/producers',
    dependencies: ['producer/producers', 'producer/upgrades', 'producer/autobuyers'],
    install(): void {
      // Wiring lives in connect() — autobuyers read category shape from the
      // sibling modules' getters, populated only after every install() has run.
    },
    connect(ctx: EngineContext): void {
      const buildings = getBuildings();
      const upgrades = getUpgrades();
      const master = ctx.inject(AutobuyerMasterToggleKey);
      const registry = ctx.inject(AutobuyerRegistryKey);

      const isUnlocked = () => true;

      // === producer auto-buy ===
      const producerAutoBuy: AutobuyerSpec = {
        id: 'autobuyer/producer/producers',
        groupId: 'producers',
        displayName: 'Producer auto-buy',
        isUnlocked,
        isActive: persistent<boolean>(false, { name: 'producer-producers-active' }),
      };
      registry.push(producerAutoBuy);
      setupPolicyAutoPurchase(
        buildings,
        {
          enabled: autobuyerGate(master, producerAutoBuy),
          interval: 1,
          policy: buildProducerPolicy(buildings),
        },
        ctx.onTick,
      );

      // === upgrade auto-buy ===
      // Adopts setupSweepAutoPurchase. Replaces the hand-rolled
      // `while (upgradeAccum >= upgradeInterval) sweep…` loop the
      // pre-OL-855 producer balance bot carried at bot.ts:117-132.
      const upgradeAutoBuy: AutobuyerSpec = {
        id: 'autobuyer/producer/upgrades',
        groupId: 'upgrades',
        displayName: 'Upgrade auto-buy',
        isUnlocked,
        isActive: persistent<boolean>(false, { name: 'producer-upgrades-active' }),
      };
      registry.push(upgradeAutoBuy);
      setupSweepAutoPurchase(
        upgrades.getAll().map((entry) => entry.purchasable),
        autobuyerGate(master, upgradeAutoBuy),
        ctx.onTick,
      );
    },
  };
}
