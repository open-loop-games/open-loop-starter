import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import { UNIT_KINDS, effectiveness, type UnitKind } from '../data/units';
import { boot, tickUntil } from '../sim/harness';
import { countsOf, total } from './battle';
import { getMatch } from './match';
import { deploy, retreat } from './orders';

/** The kind each kind beats, read from the pairing table rather than restated. */
function counterOf(target: UnitKind): UnitKind {
  return UNIT_KINDS.filter((k) => k !== 'enforcer').find((k) => effectiveness(k, target) > 1)!;
}

describe('a district fight', () => {
  beforeEach(() => boot());

  it('goes to the counter in an even fight of the triangle', async () => {
    for (const target of ['razor', 'hexer', 'rigger'] as UnitKind[]) {
      boot();
      const fresh = getMatch();
      fresh.start();
      const winner = counterOf(target);
      fresh.p.reserve[winner].value = new Decimal(8);
      fresh.e.reserve[target].value = new Decimal(8);
      deploy(fresh.p, winner, 1);
      deploy(fresh.e, target, 1);
      await tickUntil(
        () =>
          total(countsOf(fresh.e.squads[1]!)) === 0 || total(countsOf(fresh.p.squads[1]!)) === 0,
      );
      expect(total(countsOf(fresh.p.squads[1]!))).toBeGreaterThan(0);
    }
  });

  it('brings a pulled-back squad home whole', async () => {
    const m = getMatch();
    m.start();
    m.p.reserve.hexer.value = new Decimal(5);
    deploy(m.p, 'hexer', 2);
    expect(toNumber(m.p.reserve.hexer.value)).toBe(0);
    retreat(m.p, 2);
    expect(toNumber(m.p.reserve.hexer.value)).toBe(5);
    expect(total(countsOf(m.p.squads[2]!))).toBe(0);
  });
});

describe('a sentry nest', () => {
  beforeEach(() => {
    boot();
    getMatch().start();
  });

  it('holds its district until it falls', async () => {
    const m = getMatch();
    m.owner[1]!.value = 'p';
    m.control[1]!.value = 1;
    m.p.scrip.value = new Decimal(1e6);
    expect(m.p.nests[1]!.build.purchase(1)).toBeTruthy();
    m.e.reserve.razor.value = new Decimal(6);
    deploy(m.e, 'razor', 1);
    let lowest = 1;
    await tickUntil(() => {
      if (toNumber(m.p.nests[1]!.hp.value) > 0) lowest = Math.min(lowest, m.control[1]!.value);
      return toNumber(m.p.nests[1]!.hp.value) === 0 || total(countsOf(m.e.squads[1]!)) === 0;
    });
    expect(lowest).toBe(1);
    expect(toNumber(m.p.nests[1]!.hp.value)).toBeLessThan(m.tune.nestHp.value);
  });

  it('stands only where its seat owns the ground, and falls with it', async () => {
    const m = getMatch();
    m.p.scrip.value = new Decimal(1e6);
    expect(m.p.nests[0]!.build.canPurchase.value).toBe(false);
    m.owner[0]!.value = 'p';
    m.p.nests[0]!.build.purchase(1);
    expect(toNumber(m.p.nests[0]!.hp.value)).toBeGreaterThan(0);
    m.owner[0]!.value = 'e';
    await tickUntil(() => toNumber(m.p.nests[0]!.hp.value) === 0);
    expect(toNumber(m.p.nests[0]!.hp.value)).toBe(0);
  });
});

describe('gate guns', () => {
  beforeEach(() => {
    boot();
    getMatch().start();
  });

  it("each add the first turret's fire", () => {
    const m = getMatch();
    m.p.scrip.value = new Decimal(1e6);
    const first = m.p.turretDps();
    m.p.gateGuns.purchase(1);
    expect(m.p.turretLevel()).toBe(2);
    expect(m.p.turretDps()).toBeCloseTo(2 * first);
  });
});
