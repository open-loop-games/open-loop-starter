import { describe, expect, it } from 'vitest';
import { BURST_FPS, createBursts } from './bursts';

describe('createBursts', () => {
  it('plays a burst its full length on the wall clock, long past the sim entry that started it', () => {
    const bursts = createBursts<object>(8);
    bursts.start({}, 9, 0);
    expect(bursts.advance(0)[0]!.frame).toBe(0);
    expect(bursts.advance(8.5 / BURST_FPS)[0]!.frame).toBe(8);
    expect(bursts.advance(9 / BURST_FPS)).toEqual([]);
  });

  it('starts one burst per effect entry, however many frames see it', () => {
    const bursts = createBursts<object>(8);
    const fx = {};
    bursts.start(fx, 9, 0);
    bursts.start(fx, 9, 0.1);
    bursts.start(fx, 9, 0.2);
    expect(bursts.advance(0.2)).toHaveLength(1);
    bursts.advance(5);
    bursts.start(fx, 9, 5);
    expect(bursts.advance(5)).toEqual([]);
  });

  it('gives way oldest first past its cap', () => {
    const bursts = createBursts<{ n: number }>(3);
    for (let n = 0; n < 5; n++) bursts.start({ n }, 9, n / 100);
    expect(bursts.advance(0.05).map((b) => b.source.n)).toEqual([2, 3, 4]);
  });
});
