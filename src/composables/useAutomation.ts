/**
 * useAutomation — recipe composable for wiring automation tiers to strategies
 *
 * Orchestrates the engine's automation building blocks:
 * - AutomationTiers: tracks which tiers are unlocked
 * - ConditionalStrategy: rule-based queue fill (if/then)
 * - PriorityStrategy: priority-based queue fill
 * - Throttle: rate-limits automation tick callbacks
 *
 * The game defines tiers, rules, and candidates. This composable wires them
 * into a single FillStrategy that evolves as tiers unlock.
 *
 * @example
 * ```ts
 * const auto = useAutomation({
 *   id: 'automation',
 *   tiers: [
 *     { id: 'manual', name: 'Manual', order: 0 },
 *     { id: 'sequencer', name: 'Sequencer', order: 1,
 *       requirement: () => stats.manualCasts.value >= 10 },
 *     { id: 'conditionals', name: 'Conditionals', order: 3,
 *       requirement: () => zones.isUnlocked('elemental_trials') },
 *     { id: 'priorities', name: 'Priorities', order: 4,
 *       requirement: () => zones.isUnlocked('fusion_chambers') },
 *   ],
 *   getRules: () => playerRules.value,
 *   getCandidates: () => spellPriorities.value,
 *   throttleInterval: 0.5,
 * });
 *
 * // Assign the composite strategy to your queue
 * queue.fillStrategy = auto.strategy;
 *
 * // Wire the throttled auto-buy into your tick
 * ctx.onTick((dt) => {
 *   if (auto.shouldAutoBuy(dt)) {
 *     attemptAutoBuy();
 *   }
 * });
 * ```
 */

import { computed, type ComputedRef } from 'vue';
import {
  createAutomationTiers,
  createConditionalStrategy,
  createPriorityStrategy,
  createCompositeStrategy,
  createThrottle,
  type AutomationTiers,
  type AutomationTierDef,
  type ConditionalRule,
  type FillStrategy,
  type SequencerItem,
  type Throttle,
} from 'open-loop-engine';

// ============================================================================
// Types
// ============================================================================

export interface UseAutomationOptions<M = void> {
  /** Persistence context ID for the tier system. */
  id: string;

  /** Tier definitions — see {@link AutomationTierDef}. */
  tiers: AutomationTierDef[];

  /** Tier IDs that start unlocked. Defaults to lowest-order tier. */
  initiallyUnlocked?: string[];

  /**
   * Tier ID at which conditional rules become active.
   * When the player hasn't reached this tier, rules are ignored.
   * Defaults to the second-lowest-order tier (index 1).
   */
  conditionalTier?: string;

  /**
   * Tier ID at which priority fill becomes active.
   * When the player hasn't reached this tier, priority candidates are ignored.
   * Defaults to the third-lowest-order tier (index 2).
   */
  priorityTier?: string;

  /**
   * Returns the current conditional rules. Called each tick.
   * Rules are evaluated top-to-bottom; first match wins.
   * Only active when {@link conditionalTier} is reached.
   */
  getRules?: () => ConditionalRule<M>[];

  /**
   * Returns priority candidates for the queue fill.
   * Only active when {@link priorityTier} is reached.
   */
  getCandidates?: () => (SequencerItem<M> & { priority: number })[];

  /**
   * Interval in seconds for the auto-buy throttle.
   * Pass 0 or omit to disable throttling (check every tick).
   */
  throttleInterval?: number;
}

export interface UseAutomationReturn<M = void> {
  /** The automation tier system — use for UI, event wiring, prestige resets. */
  tierSystem: AutomationTiers;

  /**
   * Composite fill strategy that evolves with tier unlocks.
   * Assign to `queue.fillStrategy`. Internally:
   * - If conditionalTier reached: evaluates rules first
   * - If priorityTier reached: falls back to priority candidates
   * - Otherwise: returns null (manual play)
   */
  strategy: FillStrategy<M>;

  /**
   * Throttle gate for auto-buy or other periodic automation.
   * Call `shouldAutoBuy(dt)` in your tick callback.
   */
  throttle: Throttle;

  /** Shorthand: call in a tick callback to check if auto-buy should fire. */
  shouldAutoBuy(dt: number): boolean;

  /** Whether any automation is active (past manual tier). */
  isAutomated: ComputedRef<boolean>;

  /** Display name of the current tier. */
  currentTierName: ComputedRef<string>;
}

// ============================================================================
// Composable
// ============================================================================

export function useAutomation<M = void>(
  options: UseAutomationOptions<M>,
): UseAutomationReturn<M> {
  const {
    id,
    tiers: tierDefs,
    initiallyUnlocked,
    getRules,
    getCandidates,
    throttleInterval = 0,
  } = options;

  // --- Tier system ---
  const tierSystem = createAutomationTiers({
    id,
    tiers: tierDefs,
    initiallyUnlocked,
  });

  // Resolve which tiers gate which features
  const sorted = tierSystem.tiers;
  const conditionalTier = options.conditionalTier ?? sorted[1]?.id;
  const priorityTier = options.priorityTier ?? sorted[2]?.id;

  // --- Conditional strategy (gated by tier) ---
  const conditionalStrategy = createConditionalStrategy<M>(() => {
    if (!conditionalTier || !tierSystem.hasReached(conditionalTier)) return [];
    return getRules?.() ?? [];
  });

  // --- Priority strategy (gated by tier) ---
  const priorityStrategy = createPriorityStrategy<M>(() => {
    if (!priorityTier || !tierSystem.hasReached(priorityTier)) return [];
    return getCandidates?.() ?? [];
  });

  // --- Composite: conditionals first, then priority fallback ---
  const strategy = createCompositeStrategy<M>(conditionalStrategy, priorityStrategy);

  // --- Throttle for auto-buy ---
  const throttle = createThrottle({ interval: throttleInterval });

  function shouldAutoBuy(dt: number): boolean {
    // Only auto-buy if past manual tier
    if (tierSystem.currentTierOrder.value <= (sorted[0]?.order ?? 0)) return false;
    return throttle.gate(dt);
  }

  // --- Derived state for UI ---
  const isAutomated = computed(() => {
    const lowestOrder = sorted[0]?.order ?? 0;
    return tierSystem.currentTierOrder.value > lowestOrder;
  });

  const currentTierName = computed(() => {
    const id = tierSystem.currentTierId.value;
    return tierSystem.tiers.find((t) => t.id === id)?.name ?? '';
  });

  return {
    tierSystem,
    strategy,
    throttle,
    shouldAutoBuy,
    isAutomated,
    currentTierName,
  };
}
