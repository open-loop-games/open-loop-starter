import { describe, expect, it } from 'vitest';
import {
  categorySpreadOf,
  formatCategorySpread,
  formatSpread,
  seedBatch,
  spreadOf,
} from '../spread';

describe('seedBatch', () => {
  it('is reproducible and distinct', () => {
    expect(seedBatch(4)).toEqual(seedBatch(4));
    expect(new Set(seedBatch(32)).size).toBe(32);
  });

  it('draws a different batch per base', () => {
    expect(seedBatch(4, 1)).not.toEqual(seedBatch(4, 2));
  });
});

describe('spreadOf', () => {
  const runs = [{ v: 1 }, { v: 5 }, { v: 3 }];

  it('summarises each named metric over the batch', () => {
    const out = spreadOf(runs, { v: (r) => r.v });
    expect(out.v).toMatchObject({ min: 1, max: 5, median: 3, avg: 3, count: 3 });
  });

  // A run that ended before a quantity existed has no reading; substituting
  // zero would invent one and drag the median with it.
  it('drops non-finite samples and counts only contributors', () => {
    const out = spreadOf([...runs, { v: NaN }, { v: Infinity }], { v: (r) => r.v });
    expect(out.v!.count).toBe(3);
    expect(out.v!.max).toBe(5);
  });

  it('omits a metric with no finite sample rather than reporting zeros', () => {
    expect(spreadOf([{ v: NaN }], { v: (r) => r.v })).toEqual({});
    expect(spreadOf([], { v: () => 1 })).toEqual({});
  });
});

describe('categorySpreadOf', () => {
  const pick = (r: { cause: string }) => r.cause;

  it('tallies and reports the modal share', () => {
    const out = categorySpreadOf(
      [{ cause: 'hp' }, { cause: 'hp' }, { cause: 'hp' }, { cause: 'timer' }],
      pick,
    );
    expect(out.counts).toEqual({ hp: 3, timer: 1 });
    expect(out).toMatchObject({ total: 4, modal: 'hp', modalShare: 0.75, distinct: 2 });
  });

  // 1.0 is the reading a spine target is written against — an outcome that
  // never varied across the batch.
  it('reports a share of 1 when the outcome never varied', () => {
    expect(categorySpreadOf([{ cause: 'hp' }, { cause: 'hp' }], pick).modalShare).toBe(1);
  });

  it('resolves a tie to the category seen first', () => {
    expect(categorySpreadOf([{ cause: 'b' }, { cause: 'a' }], pick).modal).toBe('b');
  });

  it('reports an empty batch without inventing a modal category', () => {
    expect(categorySpreadOf([], pick)).toMatchObject({ total: 0, modal: '', modalShare: 0 });
  });
});

describe('formatting', () => {
  it('prints median and observed range, formatter applied to all three', () => {
    const stats = spreadOf([{ v: 1 }, { v: 5 }, { v: 3 }], { v: (r) => r.v }).v!;
    expect(formatSpread(stats)).toBe('3 [1–5]');
    expect(formatSpread(stats, (n) => n.toFixed(1))).toBe('3.0 [1.0–5.0]');
  });

  it('orders a category tally most frequent first', () => {
    const out = categorySpreadOf([{ c: 'a' }, { c: 'b' }, { c: 'b' }], (r) => r.c);
    expect(formatCategorySpread(out)).toBe('b 2 · a 1');
  });
});
