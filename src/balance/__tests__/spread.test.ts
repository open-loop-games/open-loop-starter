import { describe, expect, it } from 'vitest';
import { beatResultsOf, formatSpread, seedBatch, spreadOf } from '../spread';

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

describe('formatting', () => {
  it('prints median and observed range, formatter applied to all three', () => {
    const stats = spreadOf([{ v: 1 }, { v: 5 }, { v: 3 }], { v: (r) => r.v }).v!;
    expect(formatSpread(stats)).toBe('3 [1–5]');
    expect(formatSpread(stats, (n) => n.toFixed(1))).toBe('3.0 [1.0–5.0]');
  });
});

describe('beatResultsOf', () => {
  it('summarises each beat over the runs that reached it', () => {
    const [r] = beatResultsOf([{ beatId: 'b', fireTimes: [10, null, 30, 20] }]);
    expect(r!.terminationTime).toMatchObject({ min: 10, max: 30, count: 3 });
    expect(r!.counts).toEqual({ predicate: 3, maxSimTime: 1, unreachable: 0 });
    expect(r!.inTuningWindow).toBeUndefined();
  });

  // The engine's runBeatProbe reads "in window" off the median; so does this.
  it('reads the window off the median, as runBeatProbe does', () => {
    const rows = [
      { beatId: 'in', tuningWindow: [15, 25] as [number, number], fireTimes: [10, 20, 30] },
      { beatId: 'out', tuningWindow: [0, 5] as [number, number], fireTimes: [10, 20, 30] },
    ];
    expect(beatResultsOf(rows).map((r) => r.inTuningWindow)).toEqual([true, false]);
  });

  it('has no fire time for a beat no run reached', () => {
    const [r] = beatResultsOf([{ beatId: 'never', tuningWindow: [0, 1], fireTimes: [null] }]);
    expect(r!.terminationTime).toBeUndefined();
    expect(r!.inTuningWindow).toBe(false);
  });
});
