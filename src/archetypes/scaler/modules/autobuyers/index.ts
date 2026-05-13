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
} from '@open-loop/engine';
import { getCoinProducers, getAccelerator, getMultiplier, getCoinUpgrades } from '../coin';
import {
  getDiamondProducers,
  getCrystalUpgrades,
  getPrestigeUpgrades,
  getPrestigeConversion,
  getPrestigePoints,
} from '../prestige';
import {
  getMythosProducers,
  getTranscendUpgrades,
  getTranscendConversion,
  getTranscendPoints,
  getAcceleratorBoostCost,
  boostAccelerator,
} from '../transcend';
import { getOfferings, getRuneDefs, getRuneLevel, sacrificeRune } from '../runes';
import { getChallengesCategory } from '../challenges';
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
let toggleTranscend: Persistent<boolean>;
let toggleMythosProducers: Persistent<boolean>;
let toggleTranscendUpgrades: Persistent<boolean>;
let toggleAcceleratorBoost: Persistent<boolean>;
let toggleChallengeSweep: Persistent<boolean>;

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
  transcend: Persistent<boolean>;
  mythosProducers: Persistent<boolean>;
  transcendUpgrades: Persistent<boolean>;
  acceleratorBoost: Persistent<boolean>;
  challengeSweep: Persistent<boolean>;
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
    transcend: toggleTranscend,
    mythosProducers: toggleMythosProducers,
    transcendUpgrades: toggleTranscendUpgrades,
    acceleratorBoost: toggleAcceleratorBoost,
    challengeSweep: toggleChallengeSweep,
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
    toggleTranscend = persistent<boolean>(true, { name: 'autoTranscend' });
    toggleMythosProducers = persistent<boolean>(true, { name: 'autoMythosProducers' });
    toggleTranscendUpgrades = persistent<boolean>(true, { name: 'autoTranscendUpgrades' });
    toggleAcceleratorBoost = persistent<boolean>(true, { name: 'autoAcceleratorBoost' });
    toggleChallengeSweep = persistent<boolean>(true, { name: 'autoChallengeSweep' });

    // Tier-presence: prestige autobuyers act once first prestige has fired.
    // `Resource.cumulative` is `lifetime: true` (engine-side; per
    // `core/resource.ts` tracker registration) so it survives every module-
    // scoped reset including the prestige reset itself, making
    // `cumulative > 0` a one-way latch from the first conversion fire onward.
    const prestigePoints = getPrestigePoints();
    const prestigeUnlocked = computed(() => Decimal.gt(prestigePoints.cumulative?.value ?? 0, 0));

    // Transcend tier-presence — same one-way latch, gated on first transcend.
    // Auto-transcend itself is NOT tier-presence gated (it trips this gate);
    // mythos auto-buy + transcend upgrade sweep are gated.
    const transcendPoints = getTranscendPoints();
    const transcendUnlocked = computed(() => Decimal.gt(transcendPoints.cumulative?.value ?? 0, 0));

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

    // ─── Auto-transcend (NOT tier-presence gated — this trips the gate) ────
    // Engine-side counterpart to `Synergism.ts:3629-3637`'s
    // `resetCheck('transcension')`: the canonical
    // `coinsThisTranscension.gte(1e100) || G.transcendPointGain.gte(0.5)`
    // disjunction lives inside `transcendConversion.canConvert` via the
    // `anyOf` requirement set in `modules/transcend.ts`, so the autobuyer
    // collapses to a guard and a `convert()` call. Mirrors auto-prestige
    // shape (line 159+ above): first transcend is manual, ratcheting begins
    // on the second once `transcendPoints.cumulative > 0` opens the rest of
    // the transcend automation.
    const transcendConversion = getTranscendConversion();
    ctx.onTick(() => {
      if (!autoEnabled.value || !toggleTranscend.value) return;
      if (!transcendConversion.canConvert.value) return;
      transcendConversion.convert();
    });

    // ─── Auto-Challenge-Sweep (tier-presence gated on transcend) ───────────
    // Engine-side counterpart to canonical `Challenges.ts:664-769`'s
    // `runChallengeSweep` state machine (enter / exit / start / wait). The
    // engine's tick scan calls `complete(false)` on goal-met (auto-completes
    // + auto-exits), so the consumer-side state machine collapses to a
    // one-liner: when nothing is active and not all challenges are maxed,
    // enter the next unmaxed challenge in registration order.
    //
    // Gate: transcendUnlocked. Mirror of auto-prestige / auto-transcend
    // shape — first-challenge-entry is manual (player toggles on); engine
    // ratchets through subsequent runs once the goal-met cycle completes.
    ctx.onTick(() => {
      if (!autoEnabled.value || !toggleChallengeSweep.value) return;
      if (!transcendUnlocked.value) return;
      const cat = getChallengesCategory();
      if (!cat) return;
      if (cat.active.value !== null) return;
      if (cat.allMaxed.value) return;
      const next = cat.getAll().find((e) => !e.challenge.maxed.value);
      next?.challenge.enter();
    });

    // ─── Auto-Accelerator-Boost (tier-presence gated on prestige) ──────────
    // Bespoke action — `boostAccelerator()` spends prestigePoints and fires
    // `prestigeReset.reset()`, so neither `setupPolicyAutoPurchase` nor
    // `setupSweepAutoPurchase` fits. Mirrors auto-prestige / auto-transcend
    // shape: guard + action call on tick.
    //
    // Gate: prestigeUnlocked. Boost depends on prestigePoints accruing, which
    // happens after first prestige fires; gating on transcendUnlocked would
    // deny the boost ratchet during the long prestige-cycle phase between
    // first-prestige and first-transcend (which is exactly when the player
    // most wants the boost contribution into coin rateChain). Auto-prestige
    // races auto-boost cleanly — auto-boost zeros coins via the prestige
    // reset side-effect, so auto-prestige finds nothing to convert on the
    // immediate-next tick and waits for coins to rebuild.
    const boostCost = getAcceleratorBoostCost();
    ctx.onTick(() => {
      if (!autoEnabled.value || !toggleAcceleratorBoost.value) return;
      if (!prestigeUnlocked.value) return;
      if (Decimal.lt(prestigePoints.value, boostCost.value)) return;
      boostAccelerator();
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

    // ─── Transcend tier (tier-presence gated on transcendPoints.cumulative) ─
    setupPolicyAutoPurchase(
      getMythosProducers(),
      {
        enabled: () => autoEnabled.value && toggleMythosProducers.value && transcendUnlocked.value,
        policy: selectionCheapest((p) => p.repeatable!.getCost(1)),
      },
      ctx.onTick,
    );

    setupSweepAutoPurchase(
      getTranscendUpgrades()
        .getAll()
        .map((e) => e.purchasable),
      () => autoEnabled.value && toggleTranscendUpgrades.value && transcendUnlocked.value,
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
