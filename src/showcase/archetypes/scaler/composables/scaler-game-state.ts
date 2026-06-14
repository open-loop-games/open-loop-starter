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

import { Decimal, type DecimalSource } from '@open-loop/engine';
import type { CounterId, RuneId, ScalerGameState, Tier, UpgradeGrant } from '../data';
import { COIN_UPGRADES, PRESTIGE_UPGRADES, TRANSCEND_UPGRADES } from '../data';
import {
  getCoinProducers,
  getCoinUpgrades,
  getAccelerator,
  getMultiplier,
  getCoinFreeAcceleratorChain,
  getCoinFreeMultiplierChain,
  getCoinAcceleratorPowerBonusChain,
} from '../modules/coin';
import {
  getDiamondProducers,
  getCrystalUpgrades,
  getPrestigeUpgrades,
  getPrestigePoints,
  getPrestigeShards,
  getCoinsThisPrestige,
  getPrestigeCount,
  getPrestigePointGain,
} from '../modules/prestige';
import {
  getMythosProducers,
  getTranscendUpgrades,
  getTranscendPoints,
  getTranscendShards,
  getCoinsThisTranscension,
  getTranscendCount,
  getTranscendPointGain,
  getAcceleratorBoostBought,
  getTranscendFreeAccelBoostChain,
} from '../modules/transcend';
import { getOfferings, getRuneLevel } from '../modules/runes';
import { getChallengesCategory } from '../modules/challenges';
import { getAchievementPoints } from '../modules/achievements';

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
      if (tier === 'transcend') {
        try {
          return getMythosProducers()?.getProducer(producerId)?.ownedCount.value ?? ZERO;
        } catch {
          return ZERO;
        }
      }
      return ZERO;
    },

    totalOwned(tier: Tier): DecimalSource {
      const cat = (() => {
        if (tier === 'coin') return getCoinProducers();
        if (tier === 'prestige') return getDiamondProducers();
        if (tier === 'transcend') {
          try {
            return getMythosProducers();
          } catch {
            return undefined;
          }
        }
        return undefined;
      })();
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
        case 'transcendPoints':
          try {
            return getTranscendPoints()?.value ?? ZERO;
          } catch {
            return ZERO;
          }
        case 'transcendShards':
        case 'transcend-shards':
          try {
            return getTranscendShards()?.value ?? ZERO;
          } catch {
            return ZERO;
          }
        case 'coinsThisTranscension':
          try {
            return getCoinsThisTranscension()?.value ?? ZERO;
          } catch {
            return ZERO;
          }
        case 'mythos-1-owned':
          // Coin upgrade 13 reads `firstGeneratedMythos + firstOwnedMythos + 1`
          // canonically. First-arc port collapses to the owned count alone —
          // the cascade-generated tally is mythos-internal and not load-bearing
          // on the coin upgrade's intent (mythos-presence boost).
          try {
            return getMythosProducers()?.getProducer('mythos-1')?.ownedCount.value ?? ZERO;
          } catch {
            return ZERO;
          }
        case 'prestigePointGain':
          // Reactive readout of the live prestige conversion gain — canonical
          // `G.prestigePointGain` (`Synergism.ts:3563-3565`). Read by achievement
          // predicates checking gain thresholds.
          try {
            return getPrestigePointGain()?.value ?? ZERO;
          } catch {
            return ZERO;
          }
        case 'transcendPointGain':
          try {
            return getTranscendPointGain()?.value ?? ZERO;
          } catch {
            return ZERO;
          }
        default:
          // Reincarnation / ascension refs land in their leaves.
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
      if (position <= 60) {
        const def = TRANSCEND_UPGRADES.find((u) => u.position === position);
        if (!def) return false;
        try {
          return getTranscendUpgrades()?.getPurchasable(def.id)?.active.value ?? false;
        } catch {
          return false;
        }
      }
      // Reincarnation band 61-80 lands in its leaf.
      return false;
    },

    acceleratorBought(): DecimalSource {
      return getAccelerator()?.amount.value ?? ZERO;
    },
    multiplierBought(): DecimalSource {
      return getMultiplier()?.amount.value ?? ZERO;
    },
    acceleratorBoostBought(): number {
      try {
        return getAcceleratorBoostBought()?.value ?? 0;
      } catch {
        return 0;
      }
    },

    crystalLevel(position: number): DecimalSource {
      const id = `crystal-${position}`;
      const crystals = getCrystalUpgrades();
      if (!crystals) return ZERO;
      const crystal = crystals.find((c) => c.id === id);
      return crystal?.amount.value ?? ZERO;
    },

    runeLevel(rune: RuneId): number {
      // Tolerates "runes module not yet installed" — same call-time-resolution
      // pattern as the cross-tier accessors above. Throws if accessed before
      // install completes; callers should not reach here on the first
      // category-register tick.
      try {
        return getRuneLevel(rune).value;
      } catch {
        return 0;
      }
    },

    offeringsValue(): DecimalSource {
      try {
        return getOfferings().value;
      } catch {
        return ZERO;
      }
    },

    prestigeCount(): number {
      try {
        return getPrestigeCount()?.value ?? 0;
      } catch {
        return 0;
      }
    },

    transcendCount(): number {
      try {
        return getTranscendCount()?.value ?? 0;
      } catch {
        return 0;
      }
    },

    achievementPoints(): number {
      try {
        return getAchievementPoints()?.value ?? 0;
      } catch {
        return 0;
      }
    },

    challengeCompletions(idx: 1 | 2 | 3 | 4 | 5): number {
      // Challenges module installs after composables consumers are constructed
      // (transcend depends on coin/prestige; challenges depends on transcend).
      // Lazy accessor + try/catch tolerates pre-install reads.
      try {
        return getChallengesCategory()?.getChallenge(`challenge-${idx}`)?.completions.value ?? 0;
      } catch {
        return 0;
      }
    },

    inTranscensionChallenge(): boolean {
      try {
        return getChallengesCategory()?.active.value !== null;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Resolve a data-side `UpgradeGrant` into one or more engine `Grant` entries.
 *
 * Multiplier grants: `tier-global` scope binds the same multiplier into every
 * producer's rateChain in the tier (array form of `Grant.chain`); `producer`
 * scope resolves to one chain by id. Cross-tier scopes — Crystal upgrades
 * binding into coin producers, transcend upgrades binding into coin/prestige
 * — flow through `scope.tier`, dispatching to the right category at expansion
 * time.
 *
 * Counter grants: emit an `add` Grant onto the named free-X aggregator chain
 * (`coin/free-accelerator`, etc). Coin/transcend modifier closures read each
 * chain's `apply(0)` (the additive sum of all earned-and-purchased
 * contributions) into `bought + free`-style totals.
 */
export function expandUpgradeGrant(grant: UpgradeGrant, state: ScalerGameState) {
  if (grant.kind === 'counter') {
    const chain = resolveCounterChain(grant.counter);
    if (chain == null) return undefined;
    return {
      chain,
      add: () => grant.value(state),
      description: grant.description,
    };
  }

  const { scope, multiplier, description } = grant;

  const resolveCategory = (tier: Tier) => {
    if (tier === 'coin') return getCoinProducers();
    if (tier === 'prestige') return getDiamondProducers();
    if (tier === 'transcend') {
      try {
        return getMythosProducers();
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const chains = (() => {
    const cat = resolveCategory(scope.tier);
    if (!cat) return undefined;
    if (scope.kind === 'producer') {
      return cat.getProducer(scope.producerId)?.rateChain;
    }
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

function resolveCounterChain(counter: CounterId) {
  try {
    if (counter === 'freeAccelerator') return getCoinFreeAcceleratorChain();
    if (counter === 'freeMultiplier') return getCoinFreeMultiplierChain();
    if (counter === 'acceleratorPowerBonus') return getCoinAcceleratorPowerBonusChain();
    if (counter === 'freeAccelBoost') return getTranscendFreeAccelBoostChain();
  } catch {
    return undefined;
  }
  return undefined;
}
