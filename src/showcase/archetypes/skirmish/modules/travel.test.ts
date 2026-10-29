import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import { boot, tick, tickUntil } from '../sim/harness';
import { countsOf, total } from './battle';
import { getMatch } from './match';
import { deploy, redeploy, redirect } from './orders';

const NARROWS = 0;
const DOCKS = 1;
const STEPS = 2;

const here = (side: 'p' | 'e', district: number) =>
  total(countsOf(getMatch()[side].squads[district]!));

describe('a convoy', () => {
  beforeEach(() => {
    boot();
    getMatch().start();
  });

  it('walks the road before it stands in the district, then joins the squad there', async () => {
    const m = getMatch();
    m.p.reserve.razor.value = new Decimal(4);
    expect(deploy(m.p, 'razor', NARROWS)).toBe(4);
    expect(toNumber(m.p.reserve.razor.value)).toBe(0);
    expect(m.p.convoys.value).toHaveLength(1);
    await tick();
    expect(here('p', NARROWS)).toBe(0);
    await tickUntil(() => m.p.convoys.value.length === 0);
    expect(here('p', NARROWS)).toBe(4);
  });

  it('keeps its bunks on the road, so training cannot fill them', () => {
    const m = getMatch();
    m.p.reserve.razor.value = new Decimal(4);
    const used = m.p.supplyUsed();
    const room = m.p.supplyCap.value - used;
    deploy(m.p, 'razor', NARROWS);
    expect(m.p.supplyUsed()).toBe(used);
    m.p.reserve.hexer.value = new Decimal(room + 4);
    expect(m.p.supplyUsed()).toBe(m.p.supplyCap.value);
  });

  it('stops at the first place on its way where the other seat stands, and joins that fight', async () => {
    const m = getMatch();
    m.e.squads[NARROWS]!.razor.value = new Decimal(1);
    m.p.reserve.enforcer.value = new Decimal(8);
    deploy(m.p, 'enforcer', STEPS, Infinity, [NARROWS]);
    await tickUntil(() => m.p.convoys.value.length === 0);
    expect(here('p', NARROWS)).toBeGreaterThan(0);
    expect(here('p', STEPS)).toBe(0);
  });

  it('turns back along its road when re-ordered, and never cuts across the map', async () => {
    const m = getMatch();
    m.p.reserve.razor.value = new Decimal(4);
    deploy(m.p, 'razor', NARROWS);
    const convoy = m.p.convoys.value[0]!;
    let out = 0;
    while (convoy.progress < 0.5) {
      await tick();
      out += 1;
    }
    expect(redirect(m.p, convoy.id, 'p')).toBe(true);
    let back = 0;
    while (m.p.convoys.value.length > 0) {
      await tick();
      back += 1;
    }
    // Home sooner than the whole road would take: it walked back the half it had gone.
    expect(back).toBeLessThan(2 * out);
    expect(here('p', NARROWS)).toBe(0);
    expect(toNumber(m.p.reserve.razor.value)).toBe(4);
  });
});

describe('the roads under fog', () => {
  beforeEach(() => {
    boot();
    getMatch().start();
  });

  /** A rival convoy on the road from the Steps to the Docks. */
  function rivalConvoy(): void {
    const m = getMatch();
    m.e.squads[STEPS]!.razor.value = new Decimal(3);
    redeploy(m.e, STEPS, DOCKS);
  }

  it('hide a rival convoy on a road neither end of which you see', () => {
    rivalConvoy();
    expect(getMatch().seenConvoys()).toEqual([]);
  });

  it('show a rival convoy while you see either end of its road, and remember nothing after', () => {
    const m = getMatch();
    rivalConvoy();
    m.control[DOCKS]!.value = 0.5;
    expect(m.seenConvoys()).toHaveLength(1);
    m.control[DOCKS]!.value = 0;
    expect(m.seenConvoys()).toEqual([]);
  });

  it('all show while the astral scout rides', () => {
    const m = getMatch();
    rivalConvoy();
    m.p.aether.value = new Decimal(m.scoutCost);
    m.scout();
    expect(m.seenConvoys()).toHaveLength(1);
  });
});
