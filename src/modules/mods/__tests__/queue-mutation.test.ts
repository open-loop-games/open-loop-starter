import { describe, it, expect } from 'vitest';
import {
  applyMutation,
  randomMutation,
  type QueueItem,
} from '@/modules/mods/idle-loops/workbench/queue-mutation';

describe('applyMutation', () => {
  const base: QueueItem[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

  it('swap exchanges two entries', () => {
    const result = applyMutation(base, { kind: 'swap', indexA: 0, indexB: 2 });
    expect(result.map((i) => i.id)).toEqual(['c', 'b', 'a', 'd']);
    expect(base.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']); // input unmodified
  });

  it('swap with same index is a no-op clone', () => {
    const result = applyMutation(base, { kind: 'swap', indexA: 1, indexB: 1 });
    expect(result.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(result).not.toBe(base);
  });

  it('duplicate inserts a copy directly after the source', () => {
    const result = applyMutation(base, { kind: 'duplicate', sourceIndex: 1 });
    expect(result.map((i) => i.id)).toEqual(['a', 'b', 'b', 'c', 'd']);
  });

  it('remove deletes the item at index when length > 2', () => {
    const result = applyMutation(base, { kind: 'remove', index: 2 });
    expect(result.map((i) => i.id)).toEqual(['a', 'b', 'd']);
  });

  it('remove is a no-op when length is 2', () => {
    const short: QueueItem[] = [{ id: 'a' }, { id: 'b' }];
    const result = applyMutation(short, { kind: 'remove', index: 0 });
    expect(result.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('insert adds a new action at the target index', () => {
    const result = applyMutation(base, { kind: 'insert', index: 1, actionId: 'x' });
    expect(result.map((i) => i.id)).toEqual(['a', 'x', 'b', 'c', 'd']);
  });

  it('insert at end appends', () => {
    const result = applyMutation(base, { kind: 'insert', index: base.length, actionId: 'x' });
    expect(result.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd', 'x']);
  });

  it('swap throws on out-of-range index', () => {
    expect(() => applyMutation(base, { kind: 'swap', indexA: 0, indexB: 10 })).toThrow();
  });

  it('insert throws on out-of-range index', () => {
    expect(() => applyMutation(base, { kind: 'insert', index: 10, actionId: 'x' })).toThrow();
  });
});

describe('randomMutation', () => {
  const pool = ['train-str', 'train-int', 'meditate'];

  function seededRng(values: number[]): () => number {
    let i = 0;
    return () => values[i++ % values.length]!;
  }

  it('returns null for empty queue and empty pool', () => {
    expect(randomMutation([], [])).toBeNull();
  });

  it('returns a valid mutation for a populated queue', () => {
    const queue: QueueItem[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const mutation = randomMutation(queue, pool);
    expect(mutation).not.toBeNull();
    // Any kind is valid; applying it should not throw
    expect(() => applyMutation(queue, mutation!)).not.toThrow();
  });

  it('omits "remove" when queue length is 2', () => {
    const queue: QueueItem[] = [{ id: 'a' }, { id: 'b' }];
    // Force kind index 2 (would be 'remove' if it were present). With only
    // swap/duplicate/insert available, idx 2 wraps to 'insert'.
    const mutation = randomMutation(queue, pool, seededRng([0.99, 0, 0]));
    expect(mutation?.kind).not.toBe('remove');
  });

  it('produces distinct swap indices', () => {
    const queue: QueueItem[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    // Force kind = swap (idx 0), indexA = 1, indexB = 1 → should adjust to different
    const mutation = randomMutation(queue, pool, seededRng([0, 0.5, 0.5]));
    if (mutation?.kind === 'swap') {
      expect(mutation.indexA).not.toBe(mutation.indexB);
    }
  });
});
