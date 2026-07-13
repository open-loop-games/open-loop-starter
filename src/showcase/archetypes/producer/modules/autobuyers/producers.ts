import { persistent, type EngineContext, type EngineModule } from '@open-loop/engine';
import {
  Decimal,
  setupPolicyAutoPurchase,
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
// `reserve = fraction · cookies` folds into each auto-buyer's reserve knob; the
// fraction is a `tunable()` so the harness sweeps it and a fork later exposes it
// as the player "% spend" slider.
//
// Producers and upgrades carry SEPARATE fractions because they pull opposite
// ways on one bank: the producer reserve pools cookies toward the next tier and
// the expensive per-building ×2 upgrades (which cost ~10× a building and only
// clear once the bank has grown), while the upgrade sweep wants to grab those
// ×2s the instant they're affordable — a doubling for the price of a handful of
// buildings is always worth taking. So producers default to a pooling reserve
// and upgrades default to greedy (0).
const PRODUCER_RESERVE_FRACTION = 0.9;
const UPGRADE_RESERVE_FRACTION = 0;

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

      // "% spend" reserves: keep `fraction · bank` unspent. Tunable so the
      // harness sweeps them and a fork surfaces them as player sliders. Producers
      // pool; upgrades grab greedily (see § Balance above).
      const tuning = ctx.inject(ProducerTuningRegistryKey);
      const reserveFraction = tunable(
        tuning,
        'balance/producerReserveFraction',
        () => PRODUCER_RESERVE_FRACTION,
      );
      const upgradeReserveFraction = tunable(
        tuning,
        'balance/upgradeReserveFraction',
        () => UPGRADE_RESERVE_FRACTION,
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
      // Reserve-aware sweep: buy each affordable upgrade, but hold the bank
      // above the same `reserveFraction · bank` floor the producer auto-buy
      // honors, so a burst of upgrade unlocks can't drain the pool the producer
      // autobuyer is accumulating toward its next tier. With the default
      // fraction 0 this reduces to the plain "buy everything affordable" sweep.
      //
      // Runs through the spec's own `tick` (driven by the registry loop) rather
      // than `setupSweepAutoPurchase`, because that helper has no reserve knob:
      // a Purchasable doesn't expose its cost resource, so a general reserve
      // floor needs a resource handle the sweep can't reach. Producer is
      // single-currency — every upgrade costs the primary resource — so the
      // reserve check reads `primary.value` directly here.
      const sweepList = upgrades.getAll().map((entry) => entry.purchasable);
      const upgradeAutoBuy: AutobuyerSpec = {
        id: 'autobuyer/producer/upgrades',
        groupId: 'upgrades',
        displayName: 'Upgrade auto-buy',
        isUnlocked,
        isActive: persistent<boolean>(false, { name: 'producer-upgrades-active' }),
        tick: () => {
          for (const p of sweepList) {
            if (!p.canPurchase.value) continue;
            // Recompute the floor against the live bank each iteration so the
            // reserve holds cumulatively as earlier upgrades in the sweep spend.
            const reserve = Decimal.mul(upgradeReserveFraction.value, primary.value);
            const cost = Decimal.fromValue(p.getCost(p.amountToPurchase.value));
            if (Decimal.sub(primary.value, reserve).gte(cost)) p.purchaseMax();
          }
        },
      };
      registry.push(upgradeAutoBuy);
    },
  };
}
