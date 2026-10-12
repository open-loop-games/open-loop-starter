import { beforeEach, describe, expect, it } from 'vitest';
import { WAYFINDER_TILES, herdRegrowSeconds } from '../data';
import { INTERVAL_RATE, boot, tick } from '../sim/harness';
import { getWold } from './wold';

describe('the wold', () => {
  beforeEach(() => boot());

  it('regrows a depleted herd one head at a time', async () => {
    const wold = getWold();
    const i = wold.tiles.findIndex((t) => t.herd != null && t.herd !== 'hart');
    const band = wold.tiles[i].band;
    wold.stock.value[i] = 0;

    await tick(Math.ceil(herdRegrowSeconds(band) * INTERVAL_RATE) + 1);

    expect(wold.stock.value[i]).toBe(1);
  });

  it('widens sight once enough ground is charted', () => {
    const wold = getWold();
    expect(wold.sight.value).toBe(1);

    wold.reveal(11, 9, 4);

    expect(wold.chartedCount.value).toBeGreaterThanOrEqual(WAYFINDER_TILES[0]);
    expect(wold.sight.value).toBe(2);
  });
});
