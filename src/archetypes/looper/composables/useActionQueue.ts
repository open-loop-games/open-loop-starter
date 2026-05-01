/**
 * Vue bridge for the action queue module.
 *
 * Two parallel queues:
 * - `activeQueue` / `getActiveList` — what's currently running
 * - `editQueue` / `getEditList` — what the player is editing
 *
 * All edit operations target the edit queue. Read activeQueue for live
 * progress display and editQueue for the editable list.
 */

import {
  getActiveLoopQueue,
  getEditLoopQueue,
  getActiveList,
  getEditList,
  getActiveCursor,
  getCompletedTicks,
  addAction,
  insertActionAt,
  removeAction,
  reorderAction,
  adjustLoops,
  toggleActionDisabled,
  toggleActionCollapsed,
  splitAction,
  capActionAdditive,
  getEditLoopsFor,
  clearActions,
  startActiveLoop,
  bootstrapActiveFromSave,
  getRepeatLastAction,
  getAddToTop,
  getKeepActiveLoopActive,
  getQueueAddAmount,
  getCurrentLoadout,
  getLoadouts,
  getLoadoutNames,
  saveLoadout,
  loadLoadout,
  clearLoadout,
  renameLoadout,
  LOADOUT_SLOT_COUNT,
  type ActionMeta,
  type LoadoutEntry,
} from '../modules/action-queue';

export function useActionQueue() {
  return {
    /** Active (executing) queue */
    activeQueue: getActiveLoopQueue(),
    /** Edit (planning) queue — all mutators target this */
    editQueue: getEditLoopQueue(),
    /** Items currently executing */
    getActiveList,
    /** Items the player is editing */
    getEditList,
    /** Cursor position in the active queue */
    getActiveCursor,
    /** Completed ticks this loop */
    getCompletedTicks,
    /** Add an action to the edit queue */
    addAction,
    /** Insert an action at an explicit index (cross-column drag) */
    insertActionAt,
    /** Remove from edit queue by index */
    removeAction,
    /** Reorder edit queue (drag-and-drop) */
    reorderAction,
    /** Change loop count on an edit item */
    adjustLoops,
    /** Toggle disabled flag on an edit item */
    toggleActionDisabled,
    /** Toggle UI collapsed flag on an edit item */
    toggleActionCollapsed,
    /** Split an edit item in half, inserting a twin at index+1 */
    splitAction,
    /** Apply additive cap */
    capActionAdditive,
    /** Count non-disabled loops of an action on the edit list */
    getEditLoopsFor,
    /** Clear the edit queue */
    clearActions,
    /** Start/restart the active loop from the edit queue */
    startActiveLoop,
    /** Bootstrap active from edit on save load */
    bootstrapActiveFromSave,
    /** Repeat-last-action toggle (persistent ref) */
    repeatLastAction: getRepeatLastAction(),
    /** Add-to-top toggle (persistent ref) */
    addToTop: getAddToTop(),
    /** "Keep current list active" toggle (persistent ref) */
    keepActiveLoopActive: getKeepActiveLoopActive(),
    /** Shared amount-to-add count */
    queueAddAmount: getQueueAddAmount(),
    /** Current loadout slot index (persistent ref, 0 = none) */
    currentLoadout: getCurrentLoadout(),
    /** All loadout slots (persistent ref) */
    loadouts: getLoadouts(),
    /** Per-slot display names (persistent ref) */
    loadoutNames: getLoadoutNames(),
    /** Save edit list to loadout slot */
    saveLoadout,
    /** Load loadout into edit list */
    loadLoadout,
    /** Clear a loadout slot */
    clearLoadout,
    /** Rename a loadout slot */
    renameLoadout,
    /** Max loadout slot index */
    LOADOUT_SLOT_COUNT,
  };
}

export type { ActionMeta, LoadoutEntry };
