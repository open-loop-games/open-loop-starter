/**
 * Meta behavioral spec: what outlasts a take. Clout, the agency, the signed stars, the open
 * ratings. No magnitudes: prices and steps are the spine's, and a retune moves them.
 */

import { addResource, toNumber } from '@open-loop/engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { AGENCY, ANCHORS, RATINGS, STARS } from '../data';
import { boot, getEngine, tick } from '../sim/harness';
import { getMeta } from './meta';
import { getTake } from './take';

const agencyEntry = (id: string) => getMeta().agency.getPurchasable(id)!;

describe('survivor/meta', () => {
  beforeEach(() => boot());

  it('opens with nothing banked and only the first star and rating', () => {
    const meta = getMeta();
    expect(toNumber(meta.clout.value)).toBe(0);
    expect(
      meta.stars
        .getAll()
        .filter((e) => e.purchasable.active.value)
        .map((e) => e.def.id),
    ).toEqual([STARS[0]!.id]);
    expect(
      meta.ratings
        .getAll()
        .filter((e) => e.purchasable.active.value)
        .map((e) => e.def.label),
    ).toEqual(['G']);
  });

  it('registers every agency perk', () => {
    expect(
      getMeta()
        .agency.getAll()
        .map((e) => e.def.id),
    ).toEqual(AGENCY.map((a) => a.id));
  });

  it('banks clout from a take that ended in a wipeout', async () => {
    const take = getTake();
    take.startTake({ star: 'veteran', rating: 0, driver: 'player', seed: 1 });
    const a = take.arena()!;
    a.stats.reelsBanked = 1e4;
    a.player.hp = 0;
    await tick(1);
    expect(take.view.wrap?.end).toBe('wipeout');
    expect(toNumber(getMeta().clout.value)).toBeGreaterThan(0);
  });

  it('cannot buy what it cannot afford', () => {
    expect(agencyEntry('padding').canPurchase.value).toBe(false);
  });

  it('buys, deducts, raises the count and charges more for the next', () => {
    const meta = getMeta();
    addResource(meta.clout, 1e6);
    const p = agencyEntry('padding');
    const first = toNumber(p.getCost(1));
    p.purchase(1);
    expect(toNumber(p.count.value)).toBe(1);
    expect(toNumber(meta.clout.value)).toBe(1e6 - first);
    expect(toNumber(p.getCost(1))).toBeGreaterThan(first);
  });

  it('respects each perk’s level cap', () => {
    addResource(getMeta().clout, 1e9);
    for (const def of AGENCY) {
      const p = agencyEntry(def.id);
      for (let i = 0; i < def.maxLevel + 2; i++) p.purchase(1);
      expect(toNumber(p.count.value)).toBe(def.maxLevel);
    }
  });

  it('raises a chain when its perk is bought, and only that chain', () => {
    const meta = getMeta();
    addResource(meta.clout, 1e6);
    const before = {
      damage: toNumber(meta.chains.damage.apply(1)),
      maxHp: toNumber(meta.chains.maxHp.apply(1)),
    };
    agencyEntry('effects-budget').purchase(1);
    expect(toNumber(meta.chains.damage.apply(1))).toBeGreaterThan(before.damage);
    expect(toNumber(meta.chains.maxHp.apply(1))).toBe(before.maxHp);
  });

  it('opens the next rating once a take wraps it, and not before', async () => {
    const take = getTake();
    const pg = getMeta().ratings.getPurchasable('pg')!;
    take.startTake({ star: 'veteran', rating: 0, driver: 'player', seed: 1 });
    take.arena()!.player.hp = 0;
    await tick(2);
    expect(pg.active.value).toBe(false);
    take.toCallSheet();
    take.startTake({ star: 'veteran', rating: 0, driver: 'player', seed: 2 });
    take.arena()!.t = ANCHORS.takeSeconds;
    await tick(2);
    take.arena()!.lead!.hp = 0;
    await tick(2);
    expect(take.view.wrap?.end).toBe('cut');
    expect(pg.active.value).toBe(true);
  });

  it("records each star's wraps in the ledger, and opens R only on enough stars", () => {
    const meta = getMeta();
    const r = meta.ratings.getPurchasable('r')!;
    const gate = RATINGS[RATINGS.length - 1]!.gate;
    const below = RATINGS.length - 2;
    STARS.slice(0, gate - 1).forEach((s) => (meta.record.wrapped[s.id].value = below));
    getEngine().tickDriver.tickOnce();
    expect(r.active.value).toBe(false);
    meta.record.wrapped[STARS[gate - 1]!.id].value = below;
    getEngine().tickDriver.tickOnce();
    expect(r.active.value).toBe(true);
  });

  it('pays more clout for the same reels at a harsher rating', async () => {
    const meta = getMeta();
    const pay = async (rating: number) => {
      const before = toNumber(meta.clout.value);
      getTake().startTake({ star: 'veteran', rating, driver: 'player', seed: 1 });
      getTake().arena()!.stats.reelsBanked = 1e4;
      getTake().arena()!.player.hp = 0;
      await tick(2);
      getTake().toCallSheet();
      return toNumber(meta.clout.value) - before;
    };
    const g = await pay(0);
    for (const w of Object.values(meta.record.wrapped)) w.value = RATINGS.length - 2;
    getEngine().tickDriver.tickOnce();
    expect(await pay(RATINGS.length - 1)).toBeGreaterThan(g);
  });

  it('signs a star for clout, after which it can be cast', () => {
    const meta = getMeta();
    const pyro = meta.stars.getPurchasable('pyro')!;
    expect(() => getTake().startTake({ star: 'pyro', rating: 0, driver: 'player' })).toThrow();
    addResource(meta.clout, toNumber(pyro.getCost(1)));
    pyro.purchase(1);
    getTake().startTake({ star: 'pyro', rating: 0, driver: 'player' });
    expect(getTake().view.screen).toBe('take');
  });
});
