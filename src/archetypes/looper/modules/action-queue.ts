/**
 * Action queue module — player's ordered action lists with loadouts.
 *
 * Two parallel queues matching reference OMSI's `actions.current[]` / `actions.next[]`
 * data shape via the engine's multi-queue primitive:
 *
 * - **`activeLoopQueue`** — the list currently executing. Bound to the action
 *   runner. The UI shows live progress from this queue. Player edits never
 *   target it directly; contents are (re)populated by `startActiveLoop()` from the
 *   edit queue at loop boundaries.
 *
 * - **`editLoopQueue`** — the planning buffer. All player edits (add, remove,
 *   reorder, adjust loops, toggle disabled, clear, loadout load) target this
 *   queue. Never executes directly (`startOnEnqueue: false`). Stays freely
 *   editable during active execution without disturbing the running loop.
 *
 * At loop restart, `startActiveLoop(preserveActive)` either copies edit→active (default)
 * or leaves active alone (when "Keep current list active" is on). Loadouts
 * save/load against the edit queue exclusively.
 *
 * Reference: idleLoops/actions.js (Actions constructor, actions.current / actions.next)
 */

import {
  type EngineModule,
  type EngineContext,
  type Sequencer,
  type SequencerItem,
  createSequencer,
  persistent,
  type Persistent,
  withPersistentContext,
} from 'open-loop-engine';

// ============================================================================
// Types
// ============================================================================

/**
 * Per-item execution metadata.
 *
 * - `loops`: player-set repeat count (how many times to run this action)
 * - `loopsLeft`: remaining repetitions this loop execution
 * - `ticks`: ticks spent on current iteration
 * - `adjustedTicks`: computed cost after stat reduction (set by action runner)
 * - `manaUsed`: total mana spent on this action this loop
 * - `disabled`: toggle for skipping the action
 * - `failedCount`: failed attempts this loop (surfaced in the UI)
 * - `errorMessage`: last failure reason, cleared on successful completion
 * - `timeSpent`: real seconds elapsed on this item (speed-adjusted), reset per loop
 * - `goldRemaining`: gold on hand snapshotted at the last completion of this item
 * - `statExp`: actual XP accumulated per stat on this item this loop
 * - `collapsed`: UI state for travel rows
 *
 * Reference: idleLoops/actions.js lines 163-167, 23, 85, 263
 */
export interface ActionMeta {
  loops: number;
  loopsLeft: number;
  ticks: number;
  adjustedTicks: number;
  manaUsed: number;
  disabled: boolean;
  failedCount: number;
  errorMessage?: string;
  timeSpent: number;
  goldRemaining: number;
  statExp: Record<string, number>;
  collapsed: boolean;
}

/**
 * Loadout slot entry: a single queued action in a saved loadout.
 * `disabled` round-trips the edit-list disabled flag so load restores it.
 */
export interface LoadoutEntry {
  [key: string]: string | number | boolean | undefined;
  name: string;
  loops: number;
  disabled?: boolean;
}

/**
 * Number of user-saveable loadout slots (reference: 5, slots 1..5).
 * Slot 0 is a sentinel meaning "no loadout selected".
 */
const MAX_LOADOUT_SLOTS = 5;

// ============================================================================
// Module State (populated in install)
// ============================================================================

let activeLoopQueue: Sequencer<ActionMeta>;
let editLoopQueue: Sequencer<ActionMeta>;
let loadouts: Persistent<LoadoutEntry[][]>;
let loadoutNames: Persistent<string[]>;
let currentLoadout: Persistent<number>;
let repeatLastAction: Persistent<boolean>;
let addToTop: Persistent<boolean>;
let keepActiveLoopActive: Persistent<boolean>;
let queueAddAmount: Persistent<number>;

/** Completed ticks this loop (for progress display) */
let completedTicks = 0;

/**
 * Optional item decorator — called when edit-queue items are created.
 * Opt-in extension point; null by default.
 */
let itemDecorator: ((item: SequencerItem<ActionMeta>) => void) | null = null;

// ============================================================================
// Factories
// ============================================================================

/** Build a fresh metadata block for a queued action. */
function buildMeta(loops: number): ActionMeta {
  return {
    loops,
    loopsLeft: loops,
    ticks: 0,
    adjustedTicks: 0,
    manaUsed: 0,
    disabled: false,
    failedCount: 0,
    timeSpent: 0,
    goldRemaining: 0,
    statExp: {},
    collapsed: false,
  };
}

/** Reset execution metadata on an item (for loop restart). */
function resetMeta(meta: ActionMeta): ActionMeta {
  return {
    ...meta,
    loopsLeft: meta.loops,
    ticks: 0,
    adjustedTicks: 0,
    manaUsed: 0,
    failedCount: 0,
    errorMessage: undefined,
    timeSpent: 0,
    goldRemaining: 0,
    statExp: {},
  };
}

// ============================================================================
// Public API — queue access
// ============================================================================

/** Get the active (currently-executing) queue. Bound to the action runner. */
export function getActiveLoopQueue(): Sequencer<ActionMeta> {
  return activeLoopQueue;
}

/** Get the edit (planning) queue. All player edits target this. */
export function getEditLoopQueue(): Sequencer<ActionMeta> {
  return editLoopQueue;
}

/** Items in the active queue (what's running this loop). */
export function getActiveList(): SequencerItem<ActionMeta>[] {
  return activeLoopQueue.items.value;
}

/** Items in the edit queue (what the player is planning). */
export function getEditList(): SequencerItem<ActionMeta>[] {
  return editLoopQueue.items.value;
}

/** Cursor position in the active queue. */
export function getActiveCursor(): number {
  return activeLoopQueue.cursor;
}

/**
 * Vanilla parity for `getNextValidAction() == null`: the active queue has
 * items but the cursor has walked past the end (last item completed, or all
 * remaining items got skipped by canRun).
 *
 * Reference: idleLoops/actions.js Actions.tick — `shouldRestart = true` when
 * `getNextValidAction()` returns null.
 */
export function isActiveQueueExhausted(): boolean {
  const items = activeLoopQueue.items.value;
  if (items.length === 0) return false;
  return activeLoopQueue.cursor >= items.length;
}

/** Get completed ticks this loop */
export function getCompletedTicks(): number {
  return completedTicks;
}

/** Add to completed ticks (called by action runner on action completion) */
export function addCompletedTicks(ticks: number): void {
  completedTicks += ticks;
}

// ============================================================================
// Cursor-item live-update helpers
// ============================================================================

/**
 * Immutably patch the metadata of the active-queue item at the cursor.
 * Used for live-ticking fields (timeSpent, statExp) where per-tick updates
 * must remain reactive for the detail-pane UI.
 */
export function patchCursorMeta(patch: (meta: ActionMeta) => ActionMeta): void {
  const items = activeLoopQueue.items.value;
  const idx = activeLoopQueue.cursor;
  if (idx < 0 || idx >= items.length) return;
  const updated = [...items];
  updated[idx] = { ...updated[idx], metadata: patch(updated[idx].metadata) };
  activeLoopQueue.items.value = updated;
}

/** Accumulate per-stat XP gains onto the current cursor item's statExp map. */
export function accumulateCurrentItemStatExp(gains: Record<string, number>): void {
  patchCursorMeta((meta) => {
    const next = { ...meta.statExp };
    for (const [stat, amt] of Object.entries(gains)) {
      if (!amt) continue;
      next[stat] = (next[stat] ?? 0) + amt;
    }
    return { ...meta, statExp: next };
  });
}

/** Add real seconds to the current cursor item's timeSpent. */
export function accumulateCurrentItemTime(dt: number): void {
  if (dt <= 0) return;
  patchCursorMeta((meta) => ({ ...meta, timeSpent: meta.timeSpent + dt }));
}

/** Set a decorator called on every edit-queue item at add time */
export function setItemDecorator(fn: (item: SequencerItem<ActionMeta>) => void): void {
  itemDecorator = fn;
}

/** Get the current item decorator (if any) */
export function getItemDecorator(): ((item: SequencerItem<ActionMeta>) => void) | null {
  return itemDecorator;
}

// ============================================================================
// Public API — player editing operations (all target editLoopQueue)
// ============================================================================

/**
 * Add an action to the edit queue with a given loop count.
 *
 * Respects the addToTop toggle. Initializes execution metadata.
 * Reference: idleLoops/actions.js addAction
 */
export function addAction(actionId: string, loops: number): void {
  const item: SequencerItem<ActionMeta> = { id: actionId, metadata: buildMeta(loops) };
  if (itemDecorator) itemDecorator(item);

  if (addToTop.value) {
    editLoopQueue.items.value = [item, ...editLoopQueue.items.value];
  } else {
    editLoopQueue.enqueue(item);
  }
}

/**
 * Insert an action at an explicit index in the edit queue.
 *
 * Used by cross-column drag-and-drop where the drop target dictates position.
 * Clamps to [0, items.length]. Ignores `addToTop` — explicit index always wins.
 */
export function insertActionAt(index: number, actionId: string, loops: number): void {
  const item: SequencerItem<ActionMeta> = { id: actionId, metadata: buildMeta(loops) };
  if (itemDecorator) itemDecorator(item);

  const current = editLoopQueue.items.value;
  const clamped = Math.max(0, Math.min(index, current.length));
  const next = [...current];
  next.splice(clamped, 0, item);
  editLoopQueue.items.value = next;
}

/** Remove an action from the edit queue by index */
export function removeAction(index: number): void {
  editLoopQueue.remove(index);
}

/** Move an action within the edit queue (drag-and-drop reordering) */
export function reorderAction(from: number, to: number): void {
  editLoopQueue.reorder(from, to);
}

/** Adjust the loop count of an edit action at the given index */
export function adjustLoops(index: number, newLoops: number): void {
  const items = [...editLoopQueue.items.value];
  if (index < 0 || index >= items.length) return;
  items[index] = {
    ...items[index],
    metadata: {
      ...items[index].metadata,
      loops: Math.max(0, newLoops),
      loopsLeft: Math.max(0, newLoops),
    },
  };
  editLoopQueue.items.value = items;
}

/** Toggle an edit action's disabled state */
export function toggleActionDisabled(index: number): void {
  const items = [...editLoopQueue.items.value];
  if (index < 0 || index >= items.length) return;
  items[index] = {
    ...items[index],
    metadata: { ...items[index].metadata, disabled: !items[index].metadata.disabled },
  };
  editLoopQueue.items.value = items;
}

/** Toggle an edit action's UI-collapsed flag (travel rows only, visually). */
export function toggleActionCollapsed(index: number): void {
  const items = [...editLoopQueue.items.value];
  if (index < 0 || index >= items.length) return;
  items[index] = {
    ...items[index],
    metadata: { ...items[index].metadata, collapsed: !items[index].metadata.collapsed },
  };
  editLoopQueue.items.value = items;
}

/**
 * Split an edit-queue item in half, inserting a twin at `index + 1`.
 *
 * Reference idleLoops/driver.js split(): `ceil(loops/2)` on the new twin,
 * `floor(loops/2)` on the original.
 */
export function splitAction(index: number): void {
  const items = editLoopQueue.items.value;
  if (index < 0 || index >= items.length) return;
  const orig = items[index];
  if (orig.metadata.loops <= 1) return;

  const twinLoops = Math.ceil(orig.metadata.loops / 2);
  const origLoops = Math.floor(orig.metadata.loops / 2);

  const twinMeta = buildMeta(twinLoops);
  twinMeta.disabled = orig.metadata.disabled;
  const twin: SequencerItem<ActionMeta> = { id: orig.id, metadata: twinMeta };
  if (itemDecorator) itemDecorator(twin);

  const updated = [...items];
  updated[index] = {
    ...orig,
    metadata: { ...orig.metadata, loops: origLoops, loopsLeft: origLoops },
  };
  updated.splice(index + 1, 0, twin);
  editLoopQueue.items.value = updated;
}

/**
 * Count how many loops of `actionId` exist in the edit queue, optionally
 * excluding one index. Disabled items are excluded.
 */
export function getEditLoopsFor(actionId: string, excludeIndex = -1): number {
  let total = 0;
  const items = editLoopQueue.items.value;
  for (let i = 0; i < items.length; i++) {
    if (i === excludeIndex) continue;
    const it = items[i];
    if (it.id !== actionId) continue;
    if (it.metadata.disabled) continue;
    total += it.metadata.loops;
  }
  return total;
}

/**
 * Apply an additive cap to an edit-queue item's loops.
 *
 * Reference: idleLoops/driver.js capAmount / capTraining
 */
export function capActionAdditive(index: number, target: number): void {
  const items = editLoopQueue.items.value;
  if (index < 0 || index >= items.length) return;
  const self = items[index];

  const otherActive = getEditLoopsFor(self.id, index);
  const alreadyExisting = otherActive + (self.metadata.disabled ? self.metadata.loops : 0);
  const newLoops = target - alreadyExisting;

  const nextLoops = Math.max(0, self.metadata.loops + newLoops);

  const updated = [...items];
  updated[index] = {
    ...self,
    metadata: { ...self.metadata, loops: nextLoops, loopsLeft: nextLoops },
  };
  editLoopQueue.items.value = updated;
}

/** Clear all actions from the edit queue */
export function clearActions(): void {
  editLoopQueue.clear();
}

// ============================================================================
// Public API — loop lifecycle
// ============================================================================

/**
 * Copy the edit queue into the active queue and reset the cursor.
 *
 * Called on initial play / manual restart / loop-end unless `preserveActive`
 * is set. With `preserveActive`, leaves active contents untouched and only
 * resets its cursor (replay the same list from the top).
 */
export function startActiveLoop(preserveActive = false): void {
  completedTicks = 0;

  if (!preserveActive) {
    const fresh: SequencerItem<ActionMeta>[] = editLoopQueue.items.value.map((item) => ({
      id: item.id,
      metadata: resetMeta(item.metadata),
    }));
    activeLoopQueue.items.value = fresh;
  } else {
    const refreshed = activeLoopQueue.items.value.map((item) => ({
      ...item,
      metadata: resetMeta(item.metadata),
    }));
    activeLoopQueue.items.value = refreshed;
  }

  activeLoopQueue.resetCursor();
}

/**
 * Reset the action queues for a new loop.
 *
 * Reference: idleLoops/actions.js restart()
 */
export function restartActionQueue(preserveActive = false): void {
  startActiveLoop(preserveActive);
}

/**
 * If active has items from a prior save but the runner hasn't started,
 * kick it off. Called on game load bootstrap.
 */
export function bootstrapActiveFromSave(): void {
  const active = activeLoopQueue.items.value;
  const edit = editLoopQueue.items.value;

  if (active.length === 0 && edit.length > 0) {
    startActiveLoop(false);
    return;
  }

  if (active.length > 0) {
    // Resume path: the dispatcher reads queue.currentItem each tick, cursor is consistent.
  }
}

// ============================================================================
// Public API — settings toggles
// ============================================================================

/** Get the repeat-last-action toggle (persistent ref) */
export function getRepeatLastAction(): Persistent<boolean> {
  return repeatLastAction;
}

/** Get the add-to-top toggle (persistent ref) */
export function getAddToTop(): Persistent<boolean> {
  return addToTop;
}

/**
 * Get the "Keep current list active" toggle (persistent ref).
 * When true, loop restart does not copy edit→active.
 */
export function getKeepActiveLoopActive(): Persistent<boolean> {
  return keepActiveLoopActive;
}

/**
 * Get the shared "amount to add" ref read by available-actions click handlers.
 * Reference: idleLoops/driver.js actions.addAmount
 */
export function getQueueAddAmount(): Persistent<number> {
  return queueAddAmount;
}

// ============================================================================
// Public API — loadout system
// ============================================================================

/** Max user-saveable slot index (slots 1..MAX_LOADOUT_SLOTS; 0 = none) */
export const LOADOUT_SLOT_COUNT = MAX_LOADOUT_SLOTS;

function isValidSlot(slot: number): boolean {
  return slot >= 1 && slot <= MAX_LOADOUT_SLOTS;
}

/** Get the current loadout index (0 = none, 1..MAX_LOADOUT_SLOTS = saved slots) */
export function getCurrentLoadout(): Persistent<number> {
  return currentLoadout;
}

/** Get all loadout slot contents (index 0 reserved/unused) */
export function getLoadouts(): Persistent<LoadoutEntry[][]> {
  return loadouts;
}

/** Get per-slot display names (index = slot - 1; empty string = unnamed) */
export function getLoadoutNames(): Persistent<string[]> {
  return loadoutNames;
}

/**
 * Save the current edit list to a loadout slot.
 * Reference: idleLoops/driver.js saveList
 */
export function saveLoadout(slot: number): void {
  if (!isValidSlot(slot)) return;
  const snapshot: LoadoutEntry[] = editLoopQueue.items.value.map((item) => ({
    name: item.id,
    loops: item.metadata.loops,
    disabled: item.metadata.disabled || undefined,
  }));
  const all = [...loadouts.value];
  all[slot] = snapshot;
  loadouts.value = all;
}

/**
 * Load a loadout into the edit list.
 * Reference: idleLoops/driver.js loadList
 */
export function loadLoadout(slot: number): void {
  if (!isValidSlot(slot)) return;
  const entries = loadouts.value[slot];
  if (!entries || entries.length === 0) {
    editLoopQueue.clear();
    return;
  }

  const items: SequencerItem<ActionMeta>[] = entries.map((entry) => {
    const meta = buildMeta(entry.loops);
    if (entry.disabled) meta.disabled = true;
    const item: SequencerItem<ActionMeta> = { id: entry.name, metadata: meta };
    if (itemDecorator) itemDecorator(item);
    return item;
  });
  editLoopQueue.items.value = items;
}

/** Wipe a loadout slot (contents and name). */
export function clearLoadout(slot: number): void {
  if (!isValidSlot(slot)) return;
  const all = [...loadouts.value];
  all[slot] = [];
  loadouts.value = all;
  const names = [...loadoutNames.value];
  names[slot - 1] = '';
  loadoutNames.value = names;
}

/** Rename a loadout slot. Empty string means "unnamed". */
export function renameLoadout(slot: number, name: string): void {
  if (!isValidSlot(slot)) return;
  const trimmed = name.trim().slice(0, 30);
  const names = [...loadoutNames.value];
  names[slot - 1] = trimmed;
  loadoutNames.value = names;
}

// ============================================================================
// Module
// ============================================================================

export const actionQueueModule: EngineModule = {
  id: 'action-queue',
  install(_ctx: EngineContext) {
    activeLoopQueue = createSequencer<ActionMeta>({
      id: 'active-loop',
      mode: 'list',
    });

    editLoopQueue = createSequencer<ActionMeta>({
      id: 'edit-loop',
      mode: 'list',
      startOnEnqueue: false,
    });

    ({
      loadouts,
      loadoutNames,
      currentLoadout,
      repeatLastAction,
      addToTop,
      keepActiveLoopActive,
      queueAddAmount,
    } = withPersistentContext('action-queue', () => ({
      loadouts: persistent<LoadoutEntry[][]>(
        Array.from({ length: MAX_LOADOUT_SLOTS + 1 }, () => []),
      ),
      loadoutNames: persistent<string[]>(Array.from({ length: MAX_LOADOUT_SLOTS }, () => '')),
      currentLoadout: persistent(0),
      repeatLastAction: persistent(false),
      addToTop: persistent(false),
      keepActiveLoopActive: persistent(false),
      queueAddAmount: persistent(1),
    })));
  },
};
