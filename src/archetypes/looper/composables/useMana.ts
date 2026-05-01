/**
 * Vue bridge for the mana module.
 */

import { getMana, getManaValue, getTotalManaBudget, addMana, INITIAL_MANA } from '../modules/mana';

export function useMana() {
  return {
    /** The mana resource ref (reactive) */
    mana: getMana(),
    /** Current mana remaining */
    getManaValue,
    /** Total budget this loop (initial + added) */
    getTotalManaBudget,
    /** Extend the mana pool */
    addMana,
    /** Starting mana per loop */
    INITIAL_MANA,
  };
}
