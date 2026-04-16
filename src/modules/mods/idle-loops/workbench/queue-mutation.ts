/**
 * Queue mutation — discriminated union of operations that transform a
 * list-mode Sequencer's action list.
 *
 * Adapted from open-loop-engine's harness perturbation pattern
 * (src/harness/perturbation.ts). Retargeted from ModifierChain mutations to
 * Sequencer queue mutations. `applyMutation` is pure: it returns a new
 * array rather than calling Sequencer methods, so callers can compare
 * candidates before committing one to the live engine.
 */

export interface QueueItem {
  id: string;
}

export type QueueMutation =
  | { kind: 'swap'; indexA: number; indexB: number }
  | { kind: 'duplicate'; sourceIndex: number }
  | { kind: 'remove'; index: number }
  | { kind: 'insert'; index: number; actionId: string };

/**
 * Apply a mutation to a queue snapshot. Pure — returns a new array.
 *
 * Throws on out-of-range indices. A `remove` on a queue of length ≤ 2 is a
 * no-op (returns the input unchanged) — the Sequencer needs at least 2
 * actions to make progress per loop.
 */
export function applyMutation(queue: readonly QueueItem[], mutation: QueueMutation): QueueItem[] {
  switch (mutation.kind) {
    case 'swap': {
      if (mutation.indexA === mutation.indexB) return queue.slice();
      const next = queue.slice();
      const a = next[mutation.indexA];
      const b = next[mutation.indexB];
      if (!a || !b) throw new Error(`swap: index out of range (${mutation.indexA}, ${mutation.indexB})`);
      next[mutation.indexA] = b;
      next[mutation.indexB] = a;
      return next;
    }
    case 'duplicate': {
      const source = queue[mutation.sourceIndex];
      if (!source) throw new Error(`duplicate: index out of range (${mutation.sourceIndex})`);
      const next = queue.slice();
      next.splice(mutation.sourceIndex + 1, 0, { id: source.id });
      return next;
    }
    case 'remove': {
      if (queue.length <= 2) return queue.slice();
      if (mutation.index < 0 || mutation.index >= queue.length) {
        throw new Error(`remove: index out of range (${mutation.index})`);
      }
      const next = queue.slice();
      next.splice(mutation.index, 1);
      return next;
    }
    case 'insert': {
      if (mutation.index < 0 || mutation.index > queue.length) {
        throw new Error(`insert: index out of range (${mutation.index})`);
      }
      const next = queue.slice();
      next.splice(mutation.index, 0, { id: mutation.actionId });
      return next;
    }
  }
}

/**
 * Pick a random mutation for a queue. Returns null if no valid mutation
 * exists (e.g., empty queue and empty action pool).
 *
 * Mutation selection is uniform over the kinds that are legal for the
 * current queue. "bump-loop-count" is modeled as `duplicate` — insert an
 * extra copy of an action adjacent to the original.
 */
export function randomMutation(
  queue: readonly QueueItem[],
  actionPool: readonly string[],
  rng: () => number = Math.random,
): QueueMutation | null {
  const kinds: QueueMutation['kind'][] = [];
  if (queue.length >= 2) kinds.push('swap');
  if (queue.length >= 1) kinds.push('duplicate');
  if (queue.length > 2) kinds.push('remove');
  if (actionPool.length > 0) kinds.push('insert');
  if (kinds.length === 0) return null;

  const kind = kinds[Math.floor(rng() * kinds.length)]!;
  switch (kind) {
    case 'swap': {
      const indexA = Math.floor(rng() * queue.length);
      let indexB = Math.floor(rng() * queue.length);
      if (indexB === indexA) indexB = (indexA + 1) % queue.length;
      return { kind: 'swap', indexA, indexB };
    }
    case 'duplicate':
      return { kind: 'duplicate', sourceIndex: Math.floor(rng() * queue.length) };
    case 'remove':
      return { kind: 'remove', index: Math.floor(rng() * queue.length) };
    case 'insert': {
      const actionId = actionPool[Math.floor(rng() * actionPool.length)]!;
      const index = Math.floor(rng() * (queue.length + 1));
      return { kind: 'insert', index, actionId };
    }
  }
}
