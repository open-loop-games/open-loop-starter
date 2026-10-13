import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { boot, tick } from '../sim/harness';
import { getFirm } from './firm';
import { getAutomation } from './automation';
import type { HireId } from '../data';

/**
 * What each desk does once hired, and that its switch stops it. No magnitudes:
 * what a desk is worth is `../balance/allocation-probe.ts`'s question.
 */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const fund = (amount: number) => addResource(getFirm().cash, amount);
const fleet = (): number =>
  getFirm()
    .subsidiaries.getAll()
    .reduce((n, e) => n + num(e.producer.ownedCount.value), 0);

/** Hire desks in ladder order, opening the tiers each reveal needs. */
function hire(...ids: HireId[]): void {
  fund(1e12);
  const { subsidiaries } = getFirm();
  for (const e of subsidiaries.getAll().slice(0, 5)) e.producer.repeatable!.purchase(1);
  for (const id of ids) getAutomation().executives.getPurchasable(id)!.purchase(1);
}

beforeEach(() => boot());

describe('the dispatch ladder', () => {
  it('starts by hand and climbs one automation tier per hire', () => {
    const { dispatch } = getAutomation();
    expect(dispatch.currentTierId.value).toBe('hand');
    hire('sales-desk');
    expect(dispatch.hasReached('sales-desk')).toBe(true);
    expect(dispatch.hasReached('acquisitions-desk')).toBe(false);
  });

  it('offers each hire only after the one before it', () => {
    hire();
    const acquisitions = getAutomation().executives.getPurchasable('acquisitions-desk')!;
    expect(acquisitions.visible.value).toBe(false);
    getAutomation().executives.getPurchasable('sales-desk')!.purchase(1);
    expect(acquisitions.visible.value).toBe(true);
  });
});

describe('the desks', () => {
  it('the sales desk closes deals with no hand on the button', async () => {
    hire('sales-desk');
    const before = num(getFirm().cash.value);
    await tick(4);
    expect(num(getFirm().cash.value)).toBeGreaterThan(before);
  });

  it('the acquisitions desk buys subsidiaries on its own', async () => {
    hire('sales-desk', 'acquisitions-desk');
    const before = fleet();
    await tick(4);
    expect(fleet()).toBeGreaterThan(before);
  });

  it('a desk switched off duty stops', async () => {
    hire('sales-desk', 'acquisitions-desk');
    getAutomation().deskOn['acquisitions-desk'].value = false;
    const before = fleet();
    await tick(8);
    expect(fleet()).toBe(before);
  });

  it('the board signs memos the moment they are affordable', async () => {
    hire('sales-desk', 'acquisitions-desk', 'board');
    getAutomation().deskOn['acquisitions-desk'].value = false;
    getFirm().subsidiaries.getProducer('pushcart')!.repeatable!.purchase(10);
    await tick(4);
    expect(getFirm().management.getPurchasable('pushcart-upgrade-1')!.active.value).toBe(true);
  });
});
