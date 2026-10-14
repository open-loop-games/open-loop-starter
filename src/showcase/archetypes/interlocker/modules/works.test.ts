import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import type { ResearchId, ResourceId } from '../data';
import { boot, getEngine, tick, tickUntil } from '../sim/harness';
import { InterlockerTuningRegistryKey } from './tuning';
import { getWorks } from './works';

const num = (r: { value: unknown }) => toNumber(r.value as number);

/** Stocks a resource to an amount inside its bin. */
function stock(id: ResourceId, amount: number): void {
  getWorks().res[id].value = new Decimal(amount);
}

/** Patents an entry, paying its price from stock set for the purpose. */
function patent(id: ResearchId): void {
  const p = getWorks().research.getPurchasable(id)!;
  stock('spruce', 150);
  stock('spars', 75);
  stock('bread', 150);
  stock('bauxite', 150);
  stock('coal', 150);
  stock('aluminium', 50);
  stock('engines', 13);
  expect(p.purchase(1)).toBeTruthy();
}

describe('the estate and its bins', () => {
  beforeEach(() => boot());

  it('fills a stock from its raw building, and a full bin destroys the rest', async () => {
    const works = getWorks();
    await tickUntil(() => num(works.res.spruce) >= works.cap.spruce.value);
    await tick(100);
    expect(num(works.res.spruce)).toBe(works.cap.spruce.value);
  });

  it('widens every bin with each bonded warehouse', () => {
    const works = getWorks();
    patent('sawpit');
    patent('bonded');
    const before = Object.fromEntries(
      Object.entries(works.cap).map(([k, c]) => [k, c.value]),
    ) as Record<ResourceId, number>;
    stock('spruce', 150);
    stock('spars', 75);
    expect(works.buildings.getPurchasable('warehouse')!.purchase(1)).toBeTruthy();
    for (const [id, cap] of Object.entries(works.cap))
      expect(cap.value).toBeGreaterThan(before[id as ResourceId]);
  });
});

describe('the Académie', () => {
  beforeEach(() => boot());

  it('holds a patent back until every prerequisite is held, whatever the stock', () => {
    const works = getWorks();
    stock('spruce', 150);
    stock('spars', 75);
    const concession = works.research.getPurchasable('concession')!;
    expect(concession.canPurchase.value).toBe(false);
    patent('sawpit');
    stock('spruce', 150);
    stock('spars', 75);
    expect(concession.canPurchase.value).toBe(true);
  });

  it('keeps a building off the estate until the patent that opens it is held', () => {
    const works = getWorks();
    const pit = works.buildings.getPurchasable('mine')!;
    expect(pit.visible.value).toBe(false);
    patent('sawpit');
    patent('concession');
    expect(pit.visible.value).toBe(true);
  });
});

describe('the compagnons', () => {
  beforeEach(() => boot());

  it('cannot be seated at a trade before its patent', () => {
    expect(getWorks().assign('sawyer', 1)).toBe(0);
  });

  it('seat up to the headcount, and a withdrawn compagnon is free for another trade', () => {
    const works = getWorks();
    patent('sawpit');
    expect(works.assign('sawyer', works.workersTotal.value)).toBe(works.workersTotal.value);
    expect(works.workersIdle.value).toBe(0);
    expect(works.assign('sawyer', 1)).toBe(0);
    expect(works.assign('sawyer', -1)).toBe(-1);
    expect(works.workersIdle.value).toBe(1);
  });
});

describe('the workshops', () => {
  beforeEach(() => boot());

  it('turn a seated trade’s inputs into its output', async () => {
    const works = getWorks();
    patent('sawpit');
    stock('spars', 0);
    works.assign('sawyer', 1);
    await tick(40);
    expect(num(works.res.spars)).toBeGreaterThan(0);
    expect(works.roleStatus.sawyer.limit).toBe('labour');
  });

  it('starve on a missing input', async () => {
    const works = getWorks();
    patent('sawpit');
    patent('concession');
    patent('hall');
    stock('bauxite', 0);
    works.assign('smelter', 1);
    await tick(2);
    expect(works.roleStatus.smelter.limit).toBe('input:bauxite');
  });

  it('stop at a full output bin', async () => {
    const works = getWorks();
    patent('sawpit');
    works.assign('sawyer', 1);
    stock('spars', works.cap.spars.value);
    await tick(20);
    expect(works.roleStatus.sawyer.limit).toBe('storage');
    expect(num(works.res.spars)).toBe(works.cap.spars.value);
  });

  it('slow to what the gardens feed once the larder is empty', async () => {
    const works = getWorks();
    getEngine()
      .tryInject(InterlockerTuningRegistryKey)!
      .pushOverrides('test', { 'works/upkeepPerWorker': () => 5 });
    patent('sawpit');
    stock('spars', 0);
    works.assign('sawyer', 1);
    await tickUntil(() => num(works.res.bread) === 0);
    await tick(2);
    expect(works.fed.value).toBeLessThan(1);
    expect(works.roleStatus.sawyer.limit).toBe('hunger');
  });
});
