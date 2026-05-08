/**
 * Autobuyers — engine-module content driving the Scaler archetype's automation.
 *
 * Canonical Synergism shape (`Automation.ts:50-145`): a single per-tick `autoUpgrades()`
 * sweep that for each band (coin / prestige / transcend) walks the affordable
 * not-yet-owned upgrades in index order and buys them. Producer auto-buy reuses
 * the same cheapest-affordable shape; auto-prestige fires `reset('prestige')`
 * whenever the canonical disjunction holds (`Synergism.ts:3614-3628`:
 * `coinsThisPrestige >= 1e16 OR prestigePointGain >= 100`). The first-arc port
 * lifts that disjunction into the `prestigeConversion`'s `anyOf` requirement
 * (see `modules/prestige.ts § Prestige conversion`), so the auto-prestige
 * autobuyer collapses to `if (canConvert.value) convert()`.
 *
 * Gating shape:
 * - Master kill-switch: `autoEnabled` persistent boolean. All autobuyers
 *   short-circuit when off.
 * - Per-autobuyer toggles: one persistent boolean per autobuyer, mirroring
 *   Synergism's `player.shoptoggles.{coin,prestige,...}` plus per-class toggles.
 * - Tier-presence gate: prestige autobuyers (diamond producers, prestige
 *   upgrade sweep, crystal upgrade sweep) gate on `prestigePoints.cumulative
 *   > 0` — the engine-side equivalent of canonical's "first prestige fired"
 *   landmark. The auto-prestige autobuyer itself is NOT tier-presence gated;
 *   it is what trips the gate.
 *
 * The per-autobuyer-unlock-purchasable economy that Synergism wraps around
 * each toggle (`upgrades[81..93]`, `Automation.ts:33-48` `buyAutobuyers`) is
 * deliberately deferred per spec § 2 — first-arc tier-presence gating via
 * `Resource.cumulative` is sufficient at first-arc scale; forks add the
 * unlock-purchasable rows alongside the existing autobuyer wiring.
 */

import { computed } from 'vue';
import {
  Decimal,
  type EngineModule,
  type EngineContext,
  type Persistent,
  persistent,
  selectionCheapest,
  setupPolicyAutoPurchase,
  setupSweepAutoPurchase,
} from 'open-loop-engine';
import { getCoinProducers, getAccelerator, getMultiplier, getCoinUpgrades } from '../coin';
import {
  getDiamondProducers,
  getCrystalUpgrades,
  getPrestigeUpgrades,
  getPrestigeConversion,
  getPrestigePoints,
} from '../prestige';
import { getOfferings, getRuneDefs, getRuneLevel, sacrificeRune } from '../runes';
import type { RuneId } from '../../data';

// ============================================================================
// Module state (populated in install)
// ============================================================================

let autoEnabled: Persistent<boolean>;
let toggleCoinProducers: Persistent<boolean>;
let toggleAcceleratorMultiplier: Persistent<boolean>;
let toggleCoinUpgrades: Persistent<boolean>;
let togglePrestige: Persistent<boolean>;
let toggleDiamondProducers: Persistent<boolean>;
let togglePrestigeUpgrades: Persistent<boolean>;
let toggleCrystalUpgrades: Persistent<boolean>;
let toggleAutoSacrifice: Persistent<boolean>;

// ============================================================================
// Public access
// ============================================================================

export interface AutobuyerToggles {
  coinProducers: Persistent<boolean>;
  acceleratorMultiplier: Persistent<boolean>;
  coinUpgrades: Persistent<boolean>;
  prestige: Persistent<boolean>;
  diamondProducers: Persistent<boolean>;
  prestigeUpgrades: Persistent<boolean>;
  crystalUpgrades: Persistent<boolean>;
  autoSacrifice: Persistent<boolean>;
}

export function getAutoEnabled(): Persistent<boolean> {
  return autoEnabled;
}

export function getAutobuyerToggles(): AutobuyerToggles {
  return {
    coinProducers: toggleCoinProducers,
    acceleratorMultiplier: toggleAcceleratorMultiplier,
    coinUpgrades: toggleCoinUpgrades,
    prestige: togglePrestige,
    diamondProducers: toggleDiamondProducers,
    prestigeUpgrades: togglePrestigeUpgrades,
    crystalUpgrades: toggleCrystalUpgrades,
    autoSacrifice: toggleAutoSacrifice,
  };
}

// ============================================================================
// Engine module
// ============================================================================

export const autobuyersModule: EngineModule = {
  id: 'scaler-autobuyers',
  dependencies: ['scaler-coin', 'scaler-prestige'],

  install(ctx: EngineContext) {
    autoEnabled = persistent<boolean>(true, { name: 'autoEnabled' });
    toggleCoinProducers = persistent<boolean>(true, { name: 'autoCoinProducers' });
    toggleAcceleratorMultiplier = persistent<boolean>(true, {
      name: 'autoAcceleratorMultiplier',
    });
    toggleCoinUpgrades = persistent<boolean>(true, { name: 'autoCoinUpgrades' });
    togglePrestige = persistent<boolean>(true, { name: 'autoPrestige' });
    toggleDiamondProducers = persistent<boolean>(true, { name: 'autoDiamondProducers' });
    togglePrestigeUpgrades = persistent<boolean>(true, { name: 'autoPrestigeUpgrades' });
    toggleCrystalUpgrades = persistent<boolean>(true, { name: 'autoCrystalUpgrades' });
    toggleAutoSacrifice = persistent<boolean>(true, { name: 'autoSacrifice' });

    // Tier-presence: prestige autobuyers act once first prestige has fired.
    // `Resource.cumulative` is `lifetime: true` (engine-side; per
    // `core/resource.ts` tracker registration) so it survives every module-
    // scoped reset including the prestige reset itself, making
    // `cumulative > 0` a one-way latch from the first conversion fire onward.
    const prestigePoints = getPrestigePoints();
    const prestigeUnlocked = computed(() => Decimal.gt(prestigePoints.cumulative?.value ?? 0, 0));

    // ─── Coin tier ─────────────────────────────────────────────────────────
    setupPolicyAutoPurchase(
      getCoinProducers(),
      {
        enabled: () => autoEnabled.value && toggleCoinProducers.value,
        policy: selectionCheapest((p) => p.repeatable!.getCost(1)),
      },
      ctx.onTick,
    );

    setupSweepAutoPurchase(
      [getAccelerator(), getMultiplier()],
      () => autoEnabled.value && toggleAcceleratorMultiplier.value,
      ctx.onTick,
    );

    setupSweepAutoPurchase(
      getCoinUpgrades()
        .getAll()
        .map((e) => e.purchasable),
      () => autoEnabled.value && toggleCoinUpgrades.value,
      ctx.onTick,
    );

    // ─── Auto-prestige (NOT tier-presence gated — this trips the gate) ─────
    // Engine-side counterpart to `Synergism.ts:3614-3628`'s `resetCheck('prestige')`:
    // the canonical `coinsThisPrestige.gte(1e16) || G.prestigePointGain.gte(100)`
    // disjunction lives inside `prestigeConversion.canConvert` via the `anyOf`
    // requirement set in `modules/prestige.ts`, so the autobuyer collapses to
    // a guard and a `convert()` call.
    const prestigeConversion = getPrestigeConversion();
    ctx.onTick(() => {
      if (!autoEnabled.value || !togglePrestige.value) return;
      if (!prestigeConversion.canConvert.value) return;
      prestigeConversion.convert();
    });

    // ─── Prestige tier (tier-presence gated) ───────────────────────────────
    setupPolicyAutoPurchase(
      getDiamondProducers(),
      {
        enabled: () => autoEnabled.value && toggleDiamondProducers.value && prestigeUnlocked.value,
        policy: selectionCheapest((p) => p.repeatable!.getCost(1)),
      },
      ctx.onTick,
    );

    setupSweepAutoPurchase(
      getPrestigeUpgrades()
        .getAll()
        .map((e) => e.purchasable),
      () => autoEnabled.value && togglePrestigeUpgrades.value && prestigeUnlocked.value,
      ctx.onTick,
    );

    setupSweepAutoPurchase(
      getCrystalUpgrades(),
      () => autoEnabled.value && toggleCrystalUpgrades.value && prestigeUnlocked.value,
      ctx.onTick,
    );

    // ─── Auto-sacrifice (tier-presence gated) ──────────────────────────────
    // Single flat toggle per leaf-3 shape. Each tick picks the lowest-level
    // rune and consumes the entire offerings pool into it. Canonical
    // `Automation.ts` runs 5 separate per-rune autobuyers gated on
    // `upgrades[83..87]`; the unlock-purchasable economy ships fork-extension
    // per spec § 5, so the first-arc port collapses to a round-robin-by-
    // lowest-level pick. No `setupSweep/PolicyAutoPurchase` fits — sacrifice
    // is a single-button-with-budget action, not a sweep.
    const offerings = getOfferings();
    const runeDefs = getRuneDefs();
    const runeLevels: ReadonlyArray<{ id: RuneId; level: () => number }> = runeDefs.map((def) => ({
      id: def.id,
      level: () => getRuneLevel(def.id).value,
    }));

    ctx.onTick(() => {
      if (!autoEnabled.value || !toggleAutoSacrifice.value) return;
      if (!prestigeUnlocked.value) return;
      if (Decimal.lte(offerings.value, 0)) return;

      // Pick the rune with the lowest current level. Ties resolve by canonical
      // sacrifice order (Speed → Duplication → Prism → Thrift → SI), which is
      // the array order from `getRuneDefs()`.
      let target = runeLevels[0];
      let minLevel = target.level();
      for (let i = 1; i < runeLevels.length; i++) {
        const l = runeLevels[i].level();
        if (l < minLevel) {
          minLevel = l;
          target = runeLevels[i];
        }
      }

      sacrificeRune(target.id, offerings.value);
    });
  },
};
