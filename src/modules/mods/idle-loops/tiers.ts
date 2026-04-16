/**
 * Idle-loops recommendation tier ladder — single source of truth for the
 * achievement thresholds that unlock each recommendation-strategy rung.
 *
 * The numeric thresholds are consumed in two places:
 *   - loop.ts — strategy `canApply` gates read the same threshold
 *   - UI panels — render the ladder and unlock progress to the player
 *
 * Tier ids are the strategy ids they install (plus `tier-0` for the
 * unassisted baseline).
 */

export interface RecommendationTierDef {
  /** Stable identifier (matches strategy id where applicable). */
  id: string;
  /** Short player-facing label. */
  label: string;
  /** Strategy id installed at this tier, or null for baseline. */
  strategyId: string | null;
  /** Earned-achievement count required to unlock this tier. */
  achievementsRequired: number;
  /** One-sentence description for the tier preview UI. */
  description: string;
}

export const RECOMMENDATION_TIERS: readonly RecommendationTierDef[] = [
  {
    id: 'tier-0',
    label: 'Manual',
    strategyId: null,
    achievementsRequired: 0,
    description: 'Seed queue runs unmodified; no recommendations.',
  },
  {
    id: 'il-best-replay',
    label: 'Advisor',
    strategyId: 'il-best-replay',
    achievementsRequired: 1,
    description: 'Surface the best str-xp run as a suggestion.',
  },
  {
    id: 'il-optimizer',
    label: 'Optimizer',
    strategyId: 'il-best-replay',
    achievementsRequired: 3,
    description: 'Auto-apply the advisor recommendation each loop.',
  },
  {
    id: 'il-mutate-best',
    label: 'Mutate (blind)',
    strategyId: 'il-mutate-best',
    achievementsRequired: 5,
    description: 'Propose random queue mutations; measure over two loops.',
  },
  {
    id: 'il-mutate-best-sensitivity',
    label: 'Mutate (scored)',
    strategyId: 'il-mutate-best',
    achievementsRequired: 6,
    description: 'Score mutation candidates with scratch-engine simulation.',
  },
  {
    id: 'il-goal',
    label: 'Goal',
    strategyId: 'il-goal',
    achievementsRequired: 8,
    description: 'Replay the best run for a player-selected metric.',
  },
] as const;

/** Lookup the current-active tier for a given earned-achievement count. */
export function currentRecommendationTier(earnedCount: number): RecommendationTierDef {
  let active = RECOMMENDATION_TIERS[0]!;
  for (const tier of RECOMMENDATION_TIERS) {
    if (earnedCount >= tier.achievementsRequired) active = tier;
  }
  return active;
}

/** The next tier to unlock, or null if all tiers are unlocked. */
export function nextRecommendationTier(earnedCount: number): RecommendationTierDef | null {
  for (const tier of RECOMMENDATION_TIERS) {
    if (earnedCount < tier.achievementsRequired) return tier;
  }
  return null;
}
