/**
 * useAutomation — generic recipe for throttled automation behind automation tiers.
 *
 * A game-agnostic wrapper over the engine's two generic automation
 * building blocks:
 * - {@link createAutomationTiers} — tracks which automation tiers are unlocked,
 *   auto-unlocking a tier when its `unlockWhen` flips true (reactive, persisted).
 * - {@link createThrottle} — rate-limits how often the automation runs.
 *
 * It exposes the automation tiers, a throttle, `hasReached`, and derived UI
 * state — and nothing about *what* each tier does. The consumer wires the
 * per-tier behaviour in its own tick handler:
 *
 * ```ts
 * const auto = useAutomation({
 *   id: 'my-game/automation',
 *   tiers: [
 *     { id: 'manual', displayName: 'Manual', order: 0 },
 *     { id: 'build',  displayName: 'Auto-Build',  order: 1, unlockWhen: () => firstBuildingOwned.value },
 *     { id: 'assign', displayName: 'Auto-Assign', order: 2, unlockWhen: () => someScienceDone.value },
 *   ],
 *   throttleInterval: 1,
 * });
 *
 * ctx.onTick((dt) => {
 *   if (!auto.shouldRun(dt)) return;
 *   if (auto.hasReached('build'))  autoBuild();
 *   if (auto.hasReached('assign')) autoAssign();
 * });
 * ```
 *
 * A queue-fill game (Sequencer consumer) composes its own `FillStrategy` from the
 * engine's strategy primitives (`createConditionalStrategy` / `createPriorityStrategy`
 * / `createCompositeStrategy`), guarding each with `auto.hasReached(...)`, and
 * assigns it to `queue.fillStrategy`. That wiring is game-specific, so it lives in
 * the consumer, not here.
 *
 * Callable from a Vue setup OR from a module's `install()` — the automation
 * tiers open their own `withPersistentContext(id)`, so they persist correctly in
 * either place.
 */

import { computed, type ComputedRef } from 'vue';
import {
  createAutomationTiers,
  createThrottle,
  type AutomationTiers,
  type AutomationTierDef,
  type Throttle,
} from '@open-loop/engine';

// ============================================================================
// Types
// ============================================================================

export interface UseAutomationOptions {
  /** Persistent context id for the automation tiers. */
  id: string;

  /** Automation tier defs — see {@link AutomationTierDef}. Sorted internally by order. */
  tiers: AutomationTierDef[];

  /** Automation tier ids that start unlocked. Defaults to the single lowest-order tier. */
  initiallyUnlocked?: string[];

  /**
   * Seconds between throttle openings. `0` (default) fires every tick.
   * Applies to {@link UseAutomationReturn.shouldRun}.
   */
  throttleInterval?: number;
}

export interface UseAutomationReturn {
  /** The engine's automation tiers — use for UI, event wiring, prestige resets. */
  automationTiers: AutomationTiers;

  /** The throttle backing {@link shouldRun}. */
  throttle: Throttle;

  /**
   * Throttle check. Call in a tick handler; returns `true` at most once per
   * `throttleInterval`. Per-tier checks are the consumer's job (via {@link hasReached}).
   */
  shouldRun(dt: number): boolean;

  /** Whether automation has progressed to at least the given automation tier. */
  hasReached(tierId: string): boolean;

  /** Whether any automation tier past the lowest-order (manual) one is unlocked. */
  isAutomated: ComputedRef<boolean>;

  /** The highest unlocked automation tier's id. */
  currentTierId: ComputedRef<string>;

  /** Display name of the current automation tier. */
  currentTierName: ComputedRef<string>;
}

// ============================================================================
// Composable
// ============================================================================

export function useAutomation(options: UseAutomationOptions): UseAutomationReturn {
  const { id, tiers, initiallyUnlocked, throttleInterval = 0 } = options;

  const automationTiers = createAutomationTiers({ id, tiers, initiallyUnlocked });
  const throttle = createThrottle({ interval: throttleInterval });

  const sorted = automationTiers.tiers;
  const lowestOrder = sorted[0]?.order ?? 0;

  const isAutomated = computed(() => automationTiers.currentTierOrder.value > lowestOrder);
  const currentTierName = computed(
    () => sorted.find((t) => t.id === automationTiers.currentTierId.value)?.displayName ?? '',
  );

  return {
    automationTiers,
    throttle,
    shouldRun: (dt: number) => throttle.ready(dt),
    hasReached: (tierId: string) => automationTiers.hasReached(tierId),
    isAutomated,
    currentTierId: automationTiers.currentTierId,
    currentTierName,
  };
}
