/**
 * Action queue module — player's planning buffer (edit queue) and loadout system.
 *
 * The edit queue is a `Sequencer<EditPayload>` in planning mode
 * (`startOnEnqueue: false`). It never dispatches; player edits (add, remove,
 * reorder, adjust loops, toggle disabled, clear, loadout load) target it
 * exclusively. The active (executing) queue lives in `action-runner.ts` as
 * the internal sequencer of `activeLoopCategory`; copy-into-active on loop
 * boundaries is the consumer-side bridge.
 *
 * Reference: idleLoops/actions.js (Actions constructor, actions.next as the
 * editable plan; actions.current as the executing list).
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
} from '@open-loop/engine';

// ============================================================================
// Types
// ============================================================================

/**
 * Edit-queue payload. The plan carries player-set loop count and a disabled
 * toggle. Runtime state (loopsLeft, ticks, manaUsed, statExp, etc.) lives on
 * the active queue's `ActionItemMetadata<ActionPayload>` shape and only
 * materializes when `startActiveLoop()` copies the plan into the active
 * category.
 *
 * Reference: idleLoops/actions.js lines 163-167 (planning-shape fields only).
 */
export interface EditPayload {
  loops: number;
  disabled: boolean;
}

/**
 * Loadout slot entry: a single queued action in a saved loadout.
 * `disabled` round-trips the edit-list disabled flag so load restores it.
 *
 * Index signature is load-bearing: retention's `Persistent<State>` constraint
 * requires recursively-serializable state, which the index satisfies.
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

let editLoopQueue: Sequencer<EditPayload>;
let loadouts: Persistent<LoadoutEntry[][]>;
let loadoutNames: Persistent<string[]>;
let currentLoadout: Persistent<number>;
let repeatLastAction: Persistent<boolean>;
let addToTop: Persistent<boolean>;
let keepActiveLoopActive: Persistent<boolean>;
let queueAddAmount: Persistent<number>;

/**
 * Optional item decorator — called when edit-queue items are created.
 * Opt-in extension point; null by default.
 */
let itemDecorator: ((item: SequencerItem<EditPayload>) => void) | null = null;

// ============================================================================
// Factories
// ============================================================================

function buildEditPayload(loops: number): EditPayload {
  return { loops, disabled: false };
}

// ============================================================================
// Public API — queue access
// ============================================================================

/** Get the edit (planning) queue. All player edits target this. */
export function getEditLoopQueue(): Sequencer<EditPayload> {
  return editLoopQueue;
}

/** Items in the edit queue (what the player is planning). */
export function getEditList(): SequencerItem<EditPayload>[] {
  return editLoopQueue.items.value;
}

/** Set a decorator called on every edit-queue item at add time */
export function setItemDecorator(fn: (item: SequencerItem<EditPayload>) => void): void {
  itemDecorator = fn;
}

/** Get the current item decorator (if any) */
export function getItemDecorator(): ((item: SequencerItem<EditPayload>) => void) | null {
  return itemDecorator;
}

// ============================================================================
// Public API — player editing operations (all target editLoopQueue)
// ============================================================================

/**
 * Add an action to the edit queue with a given loop count.
 *
 * Respects the addToTop toggle. Reference: idleLoops/actions.js addAction
 */
export function addAction(actionId: string, loops: number): void {
  const item: SequencerItem<EditPayload> = { id: actionId, metadata: buildEditPayload(loops) };
  if (itemDecorator) itemDecorator(item);

  if (addToTop.value) {
    editLoopQueue.enqueue(item, { at: 0 });
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
  const item: SequencerItem<EditPayload> = { id: actionId, metadata: buildEditPayload(loops) };
  if (itemDecorator) itemDecorator(item);

  const clamped = Math.max(0, Math.min(index, editLoopQueue.items.value.length));
  editLoopQueue.enqueue(item, { at: clamped });
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
    metadata: { ...items[index].metadata, loops: Math.max(0, newLoops) },
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

  const twinMeta: EditPayload = { loops: twinLoops, disabled: orig.metadata.disabled };
  const twin: SequencerItem<EditPayload> = { id: orig.id, metadata: twinMeta };
  if (itemDecorator) itemDecorator(twin);

  const updated = [...items];
  updated[index] = {
    ...orig,
    metadata: { ...orig.metadata, loops: origLoops },
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
    metadata: { ...self.metadata, loops: nextLoops },
  };
  editLoopQueue.items.value = updated;
}

/** Clear all actions from the edit queue */
export function clearActions(): void {
  editLoopQueue.clear();
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

  const items: SequencerItem<EditPayload>[] = entries.map((entry) => {
    const meta: EditPayload = { loops: entry.loops, disabled: !!entry.disabled };
    const item: SequencerItem<EditPayload> = { id: entry.name, metadata: meta };
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
    editLoopQueue = createSequencer<EditPayload>({
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
        { name: 'loadouts' },
      ),
      loadoutNames: persistent<string[]>(
        Array.from({ length: MAX_LOADOUT_SLOTS }, () => ''),
        { name: 'loadoutNames' },
      ),
      currentLoadout: persistent(0, { name: 'currentLoadout' }),
      repeatLastAction: persistent(false, { name: 'repeatLastAction' }),
      addToTop: persistent(false, { name: 'addToTop' }),
      keepActiveLoopActive: persistent(false, { name: 'keepActiveLoopActive' }),
      queueAddAmount: persistent(1, { name: 'queueAddAmount' }),
    })));
  },
};
