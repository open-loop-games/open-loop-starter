/**
 * Mana module — the loop time budget resource.
 *
 * Mana IS time in Idle Loops. The pool starts at `INITIAL_MANA` (250
 * ticks = 5 seconds at 50 FPS) and can be extended mid-loop by actions like
 * Buy Mana, Smash Pots, and Wild Mana via `addMana()`.
 *
 * This module only owns the resource and the add helper. The per-tick drain
 * and end condition (`mana <= 0`) live in the loop module.
 *
 * Reference: idleLoops/saving.js (timeNeededInitial), idleLoops/driver.js
 * (addMana, timer/timeNeeded relationship)
 */

import {
  Decimal,
  type DecimalSource,
  type EngineModule,
  type EngineContext,
  bn,
  createResource,
  addResource,
  subtractResource,
  resetResource,
  type Resource,
  persistent,
  type Persistent,
  withPersistentContext,
} from '@open-loop/engine';

// ============================================================================
// Constants
// ============================================================================

/**
 * Initial mana pool in ticks. Vanilla: `5 * 50 = 250`.
 *
 * In vanilla this is `timeNeededInitial` — the starting value of `timeNeeded`
 * before any Buy Mana actions extend it.
 */
export const INITIAL_MANA = 250;

// ============================================================================
// Module State (populated in install)
// ============================================================================

/** Current mana remaining this loop (counts down from pool). Resets each loop. */
let manaResource: Resource<DecimalSource>;

/**
 * Total mana added this loop via addMana() calls (Buy Mana, Smash Pots, etc.).
 * Resets each loop. Used for display: total budget = INITIAL_MANA + manaAdded.
 */
let manaAdded: Persistent<DecimalSource>;

// ============================================================================
// Public API
// ============================================================================

/** Get the mana resource (for loop end condition checks, UI display, etc.) */
export function getMana(): Resource<DecimalSource> {
  return manaResource;
}

/** Current mana remaining */
export function getManaValue(): Decimal {
  return bn(manaResource.value);
}

/**
 * Total mana budget this loop: initial pool + all addMana() calls.
 *
 * In vanilla this is `timeNeeded` (starts at 250, grows with Buy Mana).
 * We track it as initial + added rather than a single counter.
 */
export function getTotalManaBudget(): Decimal {
  return Decimal.add(INITIAL_MANA, manaAdded.value);
}

/**
 * Add mana to the pool (extends the loop budget).
 *
 * Called by actions: Buy Mana (gold * 50), Smash Pots, Wild Mana, etc.
 * Reference: idleLoops/driver.js addMana
 */
export function addMana(amount: DecimalSource): void {
  addResource(manaResource, amount);
  manaAdded.value = Decimal.add(manaAdded.value, amount);
}

/**
 * Drain mana by a given amount.
 *
 * Called by the loop module's tick callback (1 per tick while running). Allows
 * negative — the loop's `endCondition` reads `mana <= 0` and a single tick
 * may overshoot the remaining budget.
 */
export function drainMana(amount: DecimalSource): void {
  subtractResource(manaResource, amount, { allowNegative: true });
}

/**
 * Reset mana to initial pool for a new loop.
 */
export function resetMana(): void {
  resetResource(manaResource);
  manaAdded.value = 0;
}

// ============================================================================
// Module
// ============================================================================

export const manaModule: EngineModule = {
  id: 'mana',
  install(_ctx: EngineContext) {
    ({ manaResource, manaAdded } = withPersistentContext('mana', () => ({
      // Mana starts at INITIAL_MANA each loop, drains toward 0
      manaResource: createResource(INITIAL_MANA, { displayName: 'Mana', precision: 0 }),
      // Track how much was added mid-loop (for total budget display)
      manaAdded: persistent<DecimalSource>(0, { name: 'manaAdded' }),
    })));
  },
};
