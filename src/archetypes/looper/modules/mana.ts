/**
 * Mana module — the loop time budget resource.
 *
 * Mana IS time in Idle Loops. The pool starts at the `balance/initialMana`
 * tunable (vanilla canonical 250 ticks = 5 seconds at 50 FPS in vanilla
 * idle-loops driver) and can be extended mid-loop by actions like Buy Mana,
 * Smash Pots, and Wild Mana via `addMana()`.
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
  tunable,
} from '@open-loop/engine';
import { LooperTuningRegistryKey } from './tuning';

// ============================================================================
// Module State (populated in install)
// ============================================================================

/** Current mana remaining this loop (counts down from pool). Resets each loop. */
let manaResource: Resource<DecimalSource>;

/** Resolved initial-mana value captured at install time. Reads through the
 *  tuning registry so balance scopes (`pushScope` before engine boot) take
 *  effect on the fresh resource default. */
let initialManaValue: DecimalSource = 250;

/**
 * Total mana added this loop via addMana() calls (Buy Mana, Smash Pots, etc.).
 * Resets each loop. Used for display: total budget = initial pool + manaAdded.
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
  return Decimal.add(initialManaValue, manaAdded.value);
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
  dependencies: ['tuning'],
  install(ctx: EngineContext) {
    const tuningRegistry = ctx.inject(LooperTuningRegistryKey);
    // Vanilla canonical: initial mana pool of 250 ticks (5 sec × 50 FPS in
    // vanilla idle-loops driver; ~12.5 sim-seconds at the engine's 20 TPS).
    // Read once at install — the resource default captures the current
    // registry-scope value, so balance scopes pushed before engine boot
    // take effect; live `pushScope` mid-run does not retroactively change
    // the initial pool, which matches the vanilla reset semantics.
    const initialManaRef = tunable(tuningRegistry, 'balance/initialMana', () => 250);
    initialManaValue = initialManaRef.value;

    ({ manaResource, manaAdded } = withPersistentContext('mana', () => ({
      manaResource: createResource(initialManaValue, { displayName: 'Mana', precision: 0 }),
      manaAdded: persistent<DecimalSource>(0, { name: 'manaAdded' }),
    })));
  },
};
