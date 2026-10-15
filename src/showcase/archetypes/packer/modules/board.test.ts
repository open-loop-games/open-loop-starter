import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import { HULL_H, HULL_W, sectionAt, type PieceId } from '../data';
import { boot, getEngine, tick } from '../sim/harness';
import { getBoard } from './board';
import { getFleet } from './fleet';
import { getYard } from './yard';

const num = (v: unknown) => toNumber(Decimal.fromValue(v as never));

/** Funds the yard, then fabricates one copy of a type into the bay. */
function fabricate(type: PieceId): void {
  const yard = getYard();
  yard.salvage.value = Decimal.add(yard.salvage.value, 1e6);
  expect(toNumber(yard.fabricator.getPurchasable(type)!.purchase(1))).toBe(1);
}

/** The first cell of a section, in reading order. */
function cellOf(section: number): { x: number; y: number } {
  for (let y = 0; y < HULL_H; y++)
    for (let x = 0; x < HULL_W; x++) if (sectionAt('frigate', x, y) === section) return { x, y };
  throw new Error(`no cell in section ${section}`);
}

describe('fitting the board', () => {
  beforeEach(() => boot());

  it('holds a fabricated module in the bay, and fitting takes it from there', () => {
    const board = getBoard();
    fabricate('pulse');
    expect(board.stock('pulse')).toBe(1);
    const c = cellOf(0);
    expect(board.place('pulse', c.x, c.y)).toBe(true);
    expect(board.stock('pulse')).toBe(0);
    expect(board.place('pulse', c.x, c.y)).toBe(false);
  });

  it('returns a lifted module to the bay', () => {
    const board = getBoard();
    fabricate('pulse');
    const c = cellOf(0);
    board.place('pulse', c.x, c.y);
    board.remove(board.occupantAt(c.x, c.y)!.id);
    expect(board.stock('pulse')).toBe(1);
    expect(board.occupantAt(c.x, c.y)).toBeNull();
  });

  it('refuses a cell until its hull section is plated', () => {
    const board = getBoard();
    const yard = getYard();
    fabricate('pulse');
    const c = cellOf(1);
    expect(board.isOpen(c.x, c.y)).toBe(false);
    expect(board.place('pulse', c.x, c.y)).toBe(false);
    const before = board.openCells.value;
    yard.salvage.value = Decimal.add(yard.salvage.value, 1e6);
    expect(toNumber(yard.hull.getPurchasable('frigate:section-1')!.purchase(1))).toBe(1);
    expect(board.openCells.value).toBeGreaterThan(before);
    expect(board.place('pulse', c.x, c.y)).toBe(true);
  });
});

describe('salvage from the board', () => {
  beforeEach(() => boot());

  it('pays nothing for a module in the bay, and pays once it is fitted', async () => {
    const board = getBoard();
    const yard = getYard();
    fabricate('pulse');
    const held = num(yard.salvage.value);
    await tick(20);
    expect(num(yard.salvage.value)).toBe(held);
    const c = cellOf(0);
    board.place('pulse', c.x, c.y);
    await tick(20);
    expect(num(yard.salvage.value)).toBeGreaterThan(held);
  });

  it('raises the salvage rate when a booster is fitted beside a weapon', () => {
    const board = getBoard();
    fabricate('pulse');
    fabricate('capacitor');
    board.place('pulse', 4, 5);
    const bare = board.salvageRate.value;
    board.place('capacitor', 4, 6);
    expect(board.salvageRate.value).toBeGreaterThan(bare);
  });

  it('lifts every weapon with a refit, without changing the layout', () => {
    const board = getBoard();
    const yard = getYard();
    fabricate('pulse');
    board.place('pulse', 4, 5);
    const total = board.layout.value.total;
    const rate = board.salvageRate.value;
    const refit = yard.refits.getPurchasable('frigate:fire-control')!;
    yard.salvage.value = Decimal.add(yard.salvage.value, 1e9);
    expect(toNumber(refit.purchase(1))).toBe(1);
    expect(board.layout.value.total).toBe(total);
    expect(board.salvageRate.value).toBeGreaterThan(rate);
  });

  it('keeps the fitted board through a save and load', () => {
    const board = getBoard();
    fabricate('pulse');
    board.place('pulse', 4, 5);
    const engine = getEngine();
    engine.save();
    board.remove(board.occupantAt(4, 5)!.id);
    expect(engine.load().success).toBe(true);
    expect(getBoard().occupantAt(4, 5)?.type).toBe('pulse');
  });
});

describe('mounts and facings', () => {
  beforeEach(() => boot());

  it('fits a Spinal Lance only on a keel cell', () => {
    const board = getBoard();
    getFleet().decrypted.value = ['lance'];
    fabricate('lance');
    expect(board.place('lance', 4, 5)).toBe(false);
    expect(board.place('lance', 5, 5)).toBe(true);
  });

  it('turns a Fire Director a quarter at a time, and its line follows', () => {
    const board = getBoard();
    getFleet().decrypted.value = ['director'];
    fabricate('director');
    fabricate('pulse');
    board.place('director', 4, 6, 0);
    board.place('pulse', 6, 6);
    const id = board.occupantAt(4, 6)!.id;
    const bow = board.layout.value.total;
    board.turn(id);
    expect(board.occupantAt(4, 6)!.facing).toBe(1);
    expect(board.layout.value.total).toBeGreaterThan(bow);
  });

  it('leaves a module that does not turn as it faced', () => {
    const board = getBoard();
    fabricate('pulse');
    board.place('pulse', 4, 5);
    const id = board.occupantAt(4, 5)!.id;
    board.turn(id);
    expect(board.occupantAt(4, 5)!.facing).toBe(0);
  });
});
