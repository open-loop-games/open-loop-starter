/**
 * Shared game-state accessor + upgrade-grant expander for the Scaler archetype.
 *
 * Pulled out of `modules/coin.ts` at leaf 2 so cross-tier reads
 * (`resourceValue('prestigePoints')`, `producerOwned('prestige', id)`, etc.)
 * resolve via direct sibling-import from both tier modules without circular
 * dependencies. Each tier module's `install()` calls `buildScalerGameState()`
 * once and threads the resulting state into its purchasable category mapper;
 * the methods read live engine refs at call time, so install order doesn't
 * matter for correctness — every method evaluates after both modules have
 * registered.
 *
 * Adoption: this is the second iteration of the cross-tier accessor pattern.
 * Leaf 1 captured `gameState` locally inside `coin.ts:install`; leaf 2 lifts
 * it here so prestige-tier upgrade closures and the prestige conversion's
 * gain formula see the same accessor surface as coin upgrades.
 */

import { Decimal, type DecimalSource } from 'open-loop-engine';
import type { ScalerGameState, Tier, UpgradeGrant } from '../data';
import { COIN_UPGRADES, PRESTIGE_UPGRADES } from '../data';
import { getCoinProducers, getCoinUpgrades, getAccelerator, getMultiplier } from '../modules/coin';
import {
  getDiamondProducers,
  getCrystalUpgrades,
  getPrestigeUpgrades,
  getPrestigePoints,
  getPrestigeShards,
  getCoinsThisPrestige,
} from '../modules/prestige';

const ZERO: DecimalSource = 0;

/**
 * Build a fresh `ScalerGameState` accessor over live module refs. Methods
 * resolve at call-time, so the accessor stays valid across resets and
 * cross-tier state mutations without rebinding.
 */
export function buildScalerGameState(): ScalerGameState {
  return {
    // Every accessor below tolerates "module not yet installed" — coin
    // installs before prestige, but coin upgrade grants evaluate during
    // `coinUpgradesCategory.register(COIN_UPGRADES)` (engine resolves
    // modifier descriptions eagerly via `chain.bind`). Cross-tier reads of
    // prestige state at that point return ZERO; the closures re-evaluate
    // on every chain read post-install, so live values flow through once
    // the prestige module finishes wiring.
    producerOwned(tier: Tier, producerId: string): DecimalSource {
      if (tier === 'coin') {
        return getCoinProducers()?.getProducer(producerId)?.ownedCount.value ?? ZERO;
      }
      if (tier === 'prestige') {
        return getDiamondProducers()?.getProducer(producerId)?.ownedCount.value ?? ZERO;
      }
      return ZERO;
    },

    totalOwned(tier: Tier): DecimalSource {
      const cat =
        tier === 'coin'
          ? getCoinProducers()
          : tier === 'prestige'
            ? getDiamondProducers()
            : undefined;
      if (!cat) return ZERO;
      let total: DecimalSource = ZERO;
      for (const entry of cat.getAll()) {
        total = Decimal.add(total, entry.producer.ownedCount.value);
      }
      return total;
    },

    resourceValue(id: string): DecimalSource {
      switch (id) {
        case 'prestigePoints':
          return getPrestigePoints()?.value ?? ZERO;
        case 'prestigeShards':
        case 'prestige-shards':
          return getPrestigeShards()?.value ?? ZERO;
        case 'coinsThisPrestige':
          return getCoinsThisPrestige()?.value ?? ZERO;
        default:
          // Transcend / reincarnation refs land in their own leaves.
          return ZERO;
      }
    },

    upgradeBought(position: number): boolean {
      if (position <= 20) {
        const def = COIN_UPGRADES.find((u) => u.position === position);
        if (!def) return false;
        return getCoinUpgrades()?.getPurchasable(def.id)?.active.value ?? false;
      }
      if (position <= 40) {
        const def = PRESTIGE_UPGRADES.find((u) => u.position === position);
        if (!def) return false;
        return getPrestigeUpgrades()?.getPurchasable(def.id)?.active.value ?? false;
      }
      // Transcend band 41-60 lands in its leaf.
      return false;
    },

    acceleratorBought(): DecimalSource {
      return getAccelerator()?.amount.value ?? ZERO;
    },
    multiplierBought(): DecimalSource {
      return getMultiplier()?.amount.value ?? ZERO;
    },

    crystalLevel(position: number): DecimalSource {
      const id = `crystal-${position}`;
      const crystals = getCrystalUpgrades();
      if (!crystals) return ZERO;
      const crystal = crystals.find((c) => c.id === id);
      return crystal?.amount.value ?? ZERO;
    },
  };
}

/**
 * Resolve a data-side `UpgradeGrant` into one or more engine `Grant` entries.
 *
 * `tier-global` scope binds the same multiplier into every producer's
 * rateChain in the tier (array form of `Grant.chain`); `producer` scope
 * resolves to one chain by id. Cross-tier scopes — Crystal upgrades binding
 * into coin producers, transcend upgrades binding into coin/prestige — flow
 * through `scope.tier`, dispatching to the right category at expansion time.
 */
export function expandUpgradeGrant(grant: UpgradeGrant, state: ScalerGameState) {
  const { scope, multiplier, description } = grant;

  const chains = (() => {
    if (scope.kind === 'producer') {
      const cat = scope.tier === 'coin' ? getCoinProducers() : getDiamondProducers();
      return cat.getProducer(scope.producerId)?.rateChain;
    }
    // tier-global — bind into every producer in the tier
    const cat = scope.tier === 'coin' ? getCoinProducers() : getDiamondProducers();
    return cat.getAll().map((e) => e.producer.rateChain);
  })();

  if (chains == null || (Array.isArray(chains) && chains.length === 0)) {
    return undefined;
  }

  return {
    chain: chains,
    mult: () => multiplier(state),
    description,
  };
}
