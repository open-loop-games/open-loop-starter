/**
 * useAutomation — generic recipe for tier-gated, throttled automation.
 *
 * A composition-agnostic wrapper over the engine's two generic automation
 * building blocks:
 * - {@link createAutomationTiers} — tracks which automation tiers are unlocked,
 *   auto-unlocking a tier when its `requirement` flips true (reactive, persisted).
 * - {@link createThrottle} — rate-limits how often the automation runs.
 *
 * It exposes the tier system, a throttle gate, `hasReached`, and derived UI
 * state — and nothing about *what* each tier does. The consumer wires the
 * per-tier behaviour in its own tick body:
 *
 * ```ts
 * const auto = useAutomation({
 *   id: 'my-game/automation',
 *   tiers: [
 *     { id: 'manual', name: 'Manual', order: 0 },
 *     { id: 'build',  name: 'Auto-Build',  order: 1, requirement: () => firstBuildingOwned.value },
 *     { id: 'assign', name: 'Auto-Assign', order: 2, requirement: () => someScienceDone.value },
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
 * Callable from a Vue setup OR from an engine module's `install()` — the tier
 * system opens its own `withPersistentContext(id)`, so it persists correctly in
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
  /** Persistence context ID for the tier system. */
  id: string;

  /** Tier definitions — see {@link AutomationTierDef}. Sorted internally by order. */
  tiers: AutomationTierDef[];

  /** Tier IDs that start unlocked. Defaults to the single lowest-order tier. */
  initiallyUnlocked?: string[];

  /**
   * Seconds between throttle-gate openings. `0` (default) fires every tick.
   * Applies to {@link UseAutomationReturn.shouldRun}.
   */
  throttleInterval?: number;
}

export interface UseAutomationReturn {
  /** The automation tier system — use for UI, event wiring, prestige resets. */
  tierSystem: AutomationTiers;

  /** The throttle gate backing {@link shouldRun}. */
  throttle: Throttle;

  /**
   * Throttle gate. Call in a tick callback; returns `true` at most once per
   * `throttleInterval`. Per-tier gating is the consumer's job (via {@link hasReached}).
   */
  shouldRun(dt: number): boolean;

  /** Whether automation has progressed to at least the given tier. */
  hasReached(tierId: string): boolean;

  /** Whether any tier past the lowest-order (manual) tier is unlocked. */
  isAutomated: ComputedRef<boolean>;

  /** The highest unlocked tier's ID. */
  currentTierId: ComputedRef<string>;

  /** Display name of the current tier. */
  currentTierName: ComputedRef<string>;
}

// ============================================================================
// Composable
// ============================================================================

export function useAutomation(options: UseAutomationOptions): UseAutomationReturn {
  const { id, tiers, initiallyUnlocked, throttleInterval = 0 } = options;

  const tierSystem = createAutomationTiers({ id, tiers, initiallyUnlocked });
  const throttle = createThrottle({ interval: throttleInterval });

  const sorted = tierSystem.tiers;
  const lowestOrder = sorted[0]?.order ?? 0;

  const isAutomated = computed(() => tierSystem.currentTierOrder.value > lowestOrder);
  const currentTierName = computed(
    () => sorted.find((t) => t.id === tierSystem.currentTierId.value)?.name ?? '',
  );

  return {
    tierSystem,
    throttle,
    shouldRun: (dt: number) => throttle.gate(dt),
    hasReached: (tierId: string) => tierSystem.hasReached(tierId),
    isAutomated,
    currentTierId: tierSystem.currentTierId,
    currentTierName,
  };
}
