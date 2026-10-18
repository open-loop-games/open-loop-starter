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
