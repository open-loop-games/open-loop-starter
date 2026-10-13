import { beforeEach, describe, expect, it } from 'vitest';
import { addResource, toNumber } from '@open-loop/engine';
import { RECONSTRUCT_LEADS } from '../data';
import { boot, getEngine, tick } from '../sim/harness';
import { emptyBox, toBoard, toNight } from '../sim/phases';
import { getBoard } from './board';
import { getBox } from './box';
import { getCase } from './case';
import { getNight } from './night';

const num = (r: { value: unknown }) => toNumber(r.value as number);

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

  it('never opens a door out of order', () => {
    const { life } = getCase();
    addResource(getBoard().leads, RECONSTRUCT_LEADS);
    expect(life.open('reconstruct')).toBe(false);
  });

  it('retires reading at the first door; the same clerks write up cards', async () => {
    const box = getBox();
    box.notes.value = 1000;
    box.clerk.purchase(1);
    await tick(20);
    expect(box.clerkReadRate.value.gt(0)).toBe(true);

    toBoard();
    expect(box.read()).toBe(false);
    expect(box.clerkReadRate.value.eq(0)).toBe(true);
    expect(box.clerk.visible.value).toBe(false);
    expect(num(box.clerk.count)).toBe(1);

    await tick(20 * 60);
    expect(getBoard().inbox.value.length).toBeGreaterThan(0);
  });

  it('takes the board down at the second door and starts the night', async () => {
    toBoard();
    const board = getBoard();
    const card = board.inbox.value[0] ?? null;
    toNight();

    expect(board.rate.value.eq(0)).toBe(true);
    if (card) expect(board.pin(card, 0, 0)).toBe(false);
    await tick(20);
    expect(getNight().cycle.running.value).toBe(true);
  });

  it('re-derives the live set from the doors on load, even loading backwards', () => {
    const { life } = getCase();
    const box = getBox();
    const save = getEngine().saveManager!.exportSave();

    toBoard();
    expect(box.read()).toBe(false);

    getEngine().saveManager!.importSave(save);
    expect(life.doorsOpened.value).toBe(0);
    expect(box.read()).toBe(true);
  });
});
