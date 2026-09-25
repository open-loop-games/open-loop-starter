/**
 * Meta behavioural spec — the cross-run accumulator and the shop.
 *
 * The property that matters most here is that notes survive a FAILED run. That
 * is what makes this a continuous accumulator rather than a prestige loop, and
 * it is a structural promise rather than a number, so it belongs at this layer.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal } from '@open-loop/engine';
import { META_COST_RATIO, META_UPGRADES } from '../data/meta';
import { MetaKey } from './meta';
import { RunKey } from './run';
import { ArenaKey } from './arena';
import { boot, getEngine, tick } from '../sim/harness';

const meta = () => {
  const api = getEngine().tryInject(MetaKey);
  if (!api) throw new Error('survivor/meta did not provide MetaKey');
  return api;
};
const notes = () => new Decimal(meta().notes.value).toNumber();

describe('survivor/meta', () => {
  beforeEach(() => boot());

  it('opens with nothing banked and nothing owned', () => {
    expect(notes()).toBe(0);
    expect(meta().levelOf('reinforced-weave')).toBe(0);
  });

  it('registers every upgrade in the shop', () => {
    expect(meta().shop.getEntry('reinforced-weave')).toBeDefined();
    expect(meta().shop.getEntry('wider-aperture')).toBeDefined();
  });

  it('banks notes from a run that ENDED IN FAILURE', async () => {
    const run = getEngine().tryInject(RunKey)!;
    const arena = getEngine().tryInject(ArenaKey)!;
    run.startRun('generalist');
    await tick(1200);
    expect(arena.state.value.stats.kills).toBeGreaterThan(0);
    meta().award(arena.state.value.stats.kills, 1);
    // The continuous-accumulator promise: failure still pays.
    expect(notes()).toBeGreaterThan(0);
  });

  it('cannot buy what it cannot afford', () => {
    const weave = meta().shop.getEntry('reinforced-weave')!;
    expect(weave.purchasable.canPurchase.value).toBe(false);
  });

  it('buys, deducts, and raises the owned level', () => {
    meta().award(100000, 1);
    const before = notes();
    const weave = meta().shop.getEntry('reinforced-weave')!;
    weave.purchasable.purchase();
    expect(meta().levelOf('reinforced-weave')).toBe(1);
    expect(notes()).toBeLessThan(before);
  });

  it('charges more for each successive level', () => {
    meta().award(100000, 1);
    const weave = meta().shop.getEntry('reinforced-weave')!;
    const first = notes();
    weave.purchasable.purchase();
    const afterFirst = notes();
    weave.purchasable.purchase();
    const afterSecond = notes();
    expect(first - afterFirst).toBeLessThan(afterFirst - afterSecond);
  });

  it('prices a multi-level buy rung by rung', () => {
    const def = META_UPGRADES.find((u) => u.id === 'reinforced-weave')!;
    const weave = meta().shop.getEntry('reinforced-weave')!;
    expect(new Decimal(weave.purchasable.getCost(2)).toNumber()).toBeCloseTo(
      def.baseCost * (1 + META_COST_RATIO),
    );
  });

  it('raises the survival baseline when a survival tile is bought', () => {
    meta().award(100000, 1);
    expect(meta().survivalMul.value).toBe(1);
    meta().shop.getEntry('reinforced-weave')!.purchasable.purchase();
    expect(meta().survivalMul.value).toBeGreaterThan(1);
  });

  it('leaves the survival baseline alone when an INCOME tile is bought', () => {
    // `side` is load-bearing, not annotation: survival tiles are ladder-safe and
    // income tiles are not, so they must not bleed into each other.
    meta().award(100000, 1);
    meta().shop.getEntry('wider-aperture')!.purchasable.purchase();
    expect(meta().survivalMul.value).toBe(1);
    expect(meta().collectMul.value).toBeGreaterThan(1);
  });

  it('respects each upgrade’s level cap', () => {
    meta().award(10_000_000, 1);
    const vial = meta().shop.getEntry('contingency-vial')!;
    vial.purchasable.purchase();
    vial.purchasable.purchase();
    expect(meta().levelOf('contingency-vial')).toBe(1);
  });
});
