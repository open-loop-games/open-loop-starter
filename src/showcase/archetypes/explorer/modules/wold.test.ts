import { beforeEach, describe, expect, it } from 'vitest';
import { FROZEN_BAND, MAP_W, WAYFINDER_TILES, herdRegrowSeconds } from '../data';
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

  it('widens sight once enough ground is charted and banked', () => {
    const wold = getWold();
    expect(wold.sight.value).toBe(1);

    wold.reveal(11, 9, 4);
    expect(wold.sight.value).toBe(1);
    wold.bankNotes();

    expect(wold.chartedCount.value).toBeGreaterThanOrEqual(WAYFINDER_TILES[0]);
    expect(wold.sight.value).toBe(2);
  });

  it('loses the notes and the lookouts used with them, and keeps the banked chart', () => {
    const wold = getWold();
    const charted = wold.chartedCount.value;
    const lookout = wold.tiles.findIndex((t) => t.feature === 'lookout');
    wold.reveal(11, 9, 4);
    wold.loot(lookout);

    wold.loseNotes();

    expect(wold.notesCount.value).toBe(0);
    expect(wold.chartedCount.value).toBe(charted);
    expect(wold.looted.value).not.toContain(lookout);
  });

  it('opens the meres to the coracle, as walkable water', () => {
    const wold = getWold();
    const i = wold.tiles.findIndex((t) => t.blocked && t.terrain === 'marsh');
    const mere = wold.tiles[i];
    expect(wold.isBlocked(mere)).toBe(true);

    wold.grantTrophy('coracle');

    expect(wold.isBlocked(mere)).toBe(false);
    expect(wold.isWaterSource(i % MAP_W, Math.floor(i / MAP_W))).toBe(true);
  });

  it('never regrows a den beast', async () => {
    const wold = getWold();
    const den = wold.tiles.findIndex((t) => t.feature === 'den');
    wold.stock.value[den] = 0;

    await tick(Math.ceil(herdRegrowSeconds(3) * 3 * INTERVAL_RATE));

    expect(wold.stock.value[den]).toBe(0);
  });

  it('freezes the Snowfield’s water', () => {
    const wold = getWold();
    const frozen = wold.tiles.findIndex((t) => t.water != null && t.band === FROZEN_BAND);
    const flowing = wold.tiles.findIndex((t) => t.water != null && t.band < FROZEN_BAND);
    const at = (i: number) => [i % MAP_W, Math.floor(i / MAP_W)] as const;

    expect(wold.isWaterSource(...at(frozen))).toBe(false);
    expect(wold.isWaterSource(...at(flowing))).toBe(true);
  });
});
