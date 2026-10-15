import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import { SEASON_SECONDS, gardenYield, type ResearchId, type ResourceId } from '../data';
import { boot, getEngine, tick, tickUntil } from '../sim/harness';
import { getEmpire } from './empire';
import { getTelegraph } from './telegraph';
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
  expect(toNumber(p.purchase(1))).toBe(1);
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
    expect(toNumber(works.buildings.getPurchasable('warehouse')!.purchase(1))).toBe(1);
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

describe('steam', () => {
  beforeEach(() => boot());

  /**
   * Opens the engine shop and the rolling mill, on bins wide enough to price them, with a
   * machinist who would draw more steam than one boiler raises.
   */
  function openEngineShop(): void {
    const works = getWorks();
    getEngine()
      .tryInject(InterlockerTuningRegistryKey)!
      .pushOverrides('test', { 'works/workerRate': () => 20, 'storage/fillSeconds': () => 1500 });
    for (const id of [
      'sawpit',
      'concession',
      'hall',
      'bonded',
      'rolling',
      'steam',
    ] as ResearchId[]) {
      for (const [r, cap] of Object.entries(works.cap))
        works.res[r as ResourceId].value = new Decimal(Math.floor(cap.value));
      expect(toNumber(works.research.getPurchasable(id)!.purchase(1))).toBe(1);
    }
    stock('aluminium', 50);
    stock('coal', 150);
    getWorks().assign('machinist', 1);
  }

  it('holds the engine shop until a boiler raises steam', async () => {
    const works = getWorks();
    openEngineShop();
    stock('engines', 0);
    await tick(2);
    expect(works.roleStatus.machinist.limit).toBe('steam');
    expect(num(works.res.engines)).toBe(0);
  });

  it('burns coal for the steam it raises', async () => {
    const works = getWorks();
    openEngineShop();
    stock('spars', 75);
    expect(toNumber(works.buildings.getPurchasable('boiler')!.purchase(1))).toBe(1);
    stock('aluminium', 50);
    stock('coal', 150);
    stock('engines', 0);
    await tick(10);
    expect(works.steam.supply).toBeGreaterThan(0);
    expect(num(works.res.engines)).toBeGreaterThan(0);
  });

  it('serves the draws in the shed order, and sheds the last first', async () => {
    const works = getWorks();
    const empire = getEmpire();
    openEngineShop();
    stock('spars', 75);
    works.buildings.getPurchasable('boiler')!.purchase(1);
    stock('aluminium', 50);
    stock('coal', 150);

    empire.shedOrder.value = ['machinist', 'mill', 'rigger'];
    await tick(2);
    expect(works.steam.demand).toBeGreaterThan(works.steam.supply);
    expect(works.steam.share.machinist).toBeGreaterThan(0);
    expect(works.steam.share.mill).toBe(0);

    empire.shedOrder.value = ['mill', 'machinist', 'rigger'];
    stock('aluminium', 50);
    stock('coal', 150);
    await tick(2);
    expect(works.steam.share.mill).toBe(1);
    expect(works.steam.share.machinist).toBeLessThan(1);
  });
});

describe('the seasons', () => {
  beforeEach(() => boot());

  it('set the gardens’ yield by the season and its weather', () => {
    const works = getWorks();
    const time = getTelegraph().time;
    const perUnit = (n: number) => {
      time.totalPlayTime.value = n * SEASON_SECONDS + 1;
      return works.yieldEach('farm') / gardenYield(n);
    };
    const spring = perUnit(0);
    for (const n of [1, 2, 3, 4, 7]) expect(perUnit(n)).toBeCloseTo(spring);
    time.totalPlayTime.value = 3 * SEASON_SECONDS + 1;
    const winter = works.yieldEach('farm');
    time.totalPlayTime.value = 4 * SEASON_SECONDS + 1;
    expect(works.yieldEach('farm')).toBeGreaterThan(winter);
  });

  it('send each turn of the season down the wire', async () => {
    const time = getTelegraph().time;
    time.totalPlayTime.value = SEASON_SECONDS - 0.01;
    await tick(2);
    expect(getTelegraph().log.lines.value.some((w) => w.kind === 'season')).toBe(true);
  });
});
