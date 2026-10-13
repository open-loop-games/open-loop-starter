import { beforeEach, describe, expect, it } from 'vitest';
import { addResource, toNumber } from '@open-loop/engine';
import { BOX_PAGES, RECONSTRUCT_LEADS } from '../data';
import { boot, getEngine, tick } from '../sim/harness';
import { getBoard } from './board';
import { getBox } from './box';
import { getCase } from './case';
import { getNight } from './night';

const num = (r: { value: unknown }) => toNumber(r.value as number);

/** Empty the box onto the record, as the reading would. */
function emptyBox(): void {
  const box = getBox();
  box.pages.value = 0;
  addResource(box.pagesRead, BOX_PAGES);
}

describe('the one-way lifecycle', () => {
  beforeEach(() => boot());

  it('keeps a door shut until its record holds, then opens it once', () => {
    const { life } = getCase();
    expect(life.open('pin-board')).toBe(false);

    emptyBox();
    expect(life.open('pin-board')).toBe(true);
    expect(life.open('pin-board')).toBe(false);
    expect(life.doorsOpened.value).toBe(1);
  });

  it('retires reading at the first door but keeps the clerks, reassigned', async () => {
    const { life } = getCase();
    const box = getBox();
    const board = getBoard();
    box.notes.value = 1000;
    box.clerk.purchase(1);
    await tick(20);
    expect(box.clerkReadRate.value.gt(0)).toBe(true);

    emptyBox();
    life.open('pin-board');
    expect(box.read()).toBe(false);
    expect(box.clerkReadRate.value.eq(0)).toBe(true);
    expect(box.clerk.visible.value).toBe(false);
    expect(num(box.clerk.count)).toBe(1);
    expect(board.clerkXrefCapacity.value.gt(0)).toBe(true);
  });

  it('stops the board at the second door and starts the night', async () => {
    const { life } = getCase();
    const board = getBoard();
    const night = getNight();
    emptyBox();
    life.open('pin-board');
    addResource(board.leads, RECONSTRUCT_LEADS);
    expect(life.open('reconstruct')).toBe(true);

    expect(board.noteSupply.value.eq(0)).toBe(true);
    expect(Object.keys(board.xref.convert())).toHaveLength(0);
    await tick(20);
    expect(night.cycle.running.value).toBe(true);
    expect(num(night.unfiled)).toBeGreaterThan(0);
  });

  it('re-derives the live set from the doors on load, even loading backwards', () => {
    const { life } = getCase();
    const box = getBox();
    const save = getEngine().saveManager!.exportSave();

    emptyBox();
    life.open('pin-board');
    expect(box.read()).toBe(false);

    getEngine().saveManager!.importSave(save);
    expect(life.doorsOpened.value).toBe(0);
    expect(box.read()).toBe(true);
  });
});

describe('the night', () => {
  beforeEach(() => {
    boot();
    const { life } = getCase();
    emptyBox();
    life.open('pin-board');
    addResource(getBoard().leads, RECONSTRUCT_LEADS);
    life.open('reconstruct');
  });

  it('banks what a replay turns up only at dawn', async () => {
    const night = getNight();
    await tick(40);
    expect(num(night.unfiled)).toBeGreaterThan(0);
    expect(num(night.contradictions)).toBe(0);

    await tick(20 * 60);
    expect(night.cycle.count.value).toBeGreaterThan(0);
    expect(num(night.contradictions)).toBeGreaterThan(0);
  });
});
