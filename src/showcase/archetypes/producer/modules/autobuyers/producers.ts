import { persistent, type EngineContext, type EngineModule } from '@open-loop/engine';
import {
  Decimal,
  setupPolicyAutoPurchase,
  setupSweepAutoPurchase,
  selectionComposite,
  selectionPaybackPeriod,
  selectionCheapest,
  tunable,
  type Producer,
  type SelectionPolicy,
} from '@open-loop/engine';
import { getBuildings, getPrimaryResource, ProducerTuningRegistryKey } from '../producers';
import { getUpgrades } from '../upgrades';
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

// ─── Balance ────────────────────────────────────────────────────────────────
// Producer's spine is thin: two levers (buy a producer, sweep the upgrades) over
// one currency. The automation reads as "buy the most cost-effective producer;
// cold-start to cheapest when nothing produces yet" — the documented
// selectionComposite pairing, not an optimal-play scorer. Shortest-payback picks
// by the engine's canonical `purchaseBeatSeconds` (cost / total-rate), which
// self-advances tiers once they're affordable; the cheapest fallback covers the
// cold-start moment where no owned producer has a finite payback.
//
// Spend discipline is the single-currency analog of interlocker's per-input
// trigger buffer: hold back a fraction of the bank rather than spending to zero.
// `reserve = PRODUCER_RESERVE_FRACTION · cookies` folds into the driver's reserve
// knob; the default 0 spends freely, and the fraction is a `tunable()` so the
// harness sweeps it and a fork later exposes it as the player "% spend" slider.
const PRODUCER_RESERVE_FRACTION = 0;

/**
 * Shared producer selection policy — the single source of truth driving both the
 * shipping autobuyer (below) and the closed-form bot-policy walker
 * (`balance/predict.ts`). Since candidates are pre-filtered to affordable, the
 * old hybrid-payback wait-term was always zero here; payback-period is the
 * behavior-faithful, legible replacement.
 */
export function buildProducerPolicy(): SelectionPolicy<Producer> {
  return selectionComposite(
    selectionPaybackPeriod<Producer>((p) => p.purchaseBeatSeconds.value),
    selectionCheapest<Producer>((p) => p.repeatable!.getCost(1)),
  );
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
      const primary = getPrimaryResource();
      const master = ctx.inject(AutobuyerMasterToggleKey);
      const registry = ctx.inject(AutobuyerRegistryKey);

      const isUnlocked = () => true;

      // "% spend" reserve: keep `reserveFraction · bank` unspent. Tunable so the
      // harness sweeps it and a fork surfaces it as the player slider.
      const reserveFraction = tunable(
        ctx.inject(ProducerTuningRegistryKey),
        'balance/producerReserveFraction',
        () => PRODUCER_RESERVE_FRACTION,
      );

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
          policy: buildProducerPolicy(),
          reserve: () => Decimal.mul(reserveFraction.value, primary.value),
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
