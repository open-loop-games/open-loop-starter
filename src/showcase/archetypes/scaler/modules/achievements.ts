/**
 * Achievements module — owns the first-arc achievement category + global AP
 * curve.
 *
 * Surfaces:
 * - `achievementsCategory` — `createAchievementCategory<AchievementDef, void>`
 *   over `SCALER_ACHIEVEMENTS`. Per-row `requirement` is a Vue `computed` that
 *   evaluates `def.requirement(state)` against the live `ScalerGameState`
 *   accessor; the engine auto-completes via `watch` on the requirement
 *   (`createAchievement` — `achievement.ts:1-26`). Per-row `grants` flow through
 *   the existing `expandUpgradeGrant` pipeline so multiplier and counter
 *   reward shapes share routing with upgrades.
 * - `achievementPoints` — reactive sum of `def.pointValue` over earned rows;
 *   read by `ScalerGameState.achievementPoints()` (transcend upgrade 47 +
 *   the AP-curve global multiplier below).
 * - **Global AP curve** — multiplicative grant on coin + prestige tier-global
 *   rateChains. Curve formula declared-invention until canonical Synergism's
 *   `getAchievementMultiplier` shape is recovered into the snapshot —
 *   placeholder `1 + 0.001 * AP^0.8` (smooth log-shape so first-arc AP
 *   accumulation renders in the rateChain readout without dominating).
 *
 * Persistence: each `createAchievement` allocates `persistent()` refs for
 * `earned` + `earnedAt` scoped to `{achievements}/{def.id}` (engine-managed).
 * The achievements category-id (`'scaler-achievements'`) is NOT a member of
 * any tier reset's `resetModules`, so earned state survives all first-arc
 * resets without explicit `keep:` exemption per spec § 5.
 */

// TODO(canonical-fidelity): port `getAchievementMultiplier` curve from
// canonical Synergism (path: snapshot lookup at `achievements.ts` once the AP
// curve is recovered). The placeholder below is shape-faithful (smooth log,
// monotonic in AP) but not byte-anchored.

import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  type DecimalSource,
  type EngineModule,
  type EngineContext,
  type AchievementCategory,
  createAchievementCategory,
  createMultiplicativeModifier,
} from '@open-loop/engine';
import { SCALER_ACHIEVEMENTS, type AchievementDef } from '../data';
import { buildScalerGameState, expandUpgradeGrant } from './scaler-game-state';
import { getCoinProducers } from './coin';
import { getDiamondProducers } from './prestige';

// ============================================================================
// Module state (populated in install)
// ============================================================================

let achievementsCategory: AchievementCategory<AchievementDef, void>;
let achievementPoints: ComputedRef<number>;

// ============================================================================
// Public access
// ============================================================================

export function getAchievementsCategory(): AchievementCategory<AchievementDef, void> {
  return achievementsCategory;
}

/** Reactive sum of earned-row pointValues — the AP curve input. */
export function getAchievementPoints(): ComputedRef<number> {
  return achievementPoints;
}

// ============================================================================
// AP curve
// ============================================================================

/**
 * Global achievement multiplier from accumulated AP. Smooth log-shape
 * placeholder (`1 + 0.001 * AP^0.8`); identity 1 at AP=0 so the binding is
 * a no-op until the first achievement earns. Bound onto coin + prestige
 * tier-global rateChains.
 */
function apCurve(ap: number): DecimalSource {
  if (ap <= 0) return 1;
  return Decimal.add(1, Decimal.mul(0.001, Decimal.pow(ap, 0.8)));
}

// ============================================================================
// Engine module
// ============================================================================

export const achievementsModule: EngineModule = {
  id: 'scaler-achievements',
  dependencies: ['scaler-coin', 'scaler-prestige', 'scaler-transcend'],

  install(_ctx: EngineContext) {
    const state = buildScalerGameState();

    achievementsCategory = createAchievementCategory<AchievementDef, void>({
      id: 'scaler-achievements',
      mapAchievement: (def) => {
        const grants = def.effects
          .map((e) => expandUpgradeGrant(e, state))
          .filter((g): g is NonNullable<typeof g> => g !== undefined);
        return {
          display: { title: def.name, description: def.description },
          requirement: computed(() => def.requirement(state)),
          grants,
        };
      },
    });
    achievementsCategory.register(SCALER_ACHIEVEMENTS);

    // Reactive AP — sums pointValue over earned rows.
    achievementPoints = computed(() => {
      let total = 0;
      for (const entry of achievementsCategory.getAll()) {
        if (entry.achievement.earned.value) total += entry.def.pointValue;
      }
      return total;
    });

    // Global AP curve — bind on every coin + prestige producer's rateChain
    // as a single named multiplicative source. Cross-tier sibling-import
    // pattern (mirrors `runes.ts:258+`).
    const coinChains = getCoinProducers()
      .getAll()
      .map((e) => e.producer.rateChain);
    const prestigeChains = getDiamondProducers()
      .getAll()
      .map((e) => e.producer.rateChain);
    const apMod = createMultiplicativeModifier({
      multiplier: () => apCurve(achievementPoints.value),
      description: 'Achievement Points (AP curve)',
    });
    for (const chain of [...coinChains, ...prestigeChains]) {
      chain.bind({ modifier: apMod });
    }
  },
};
