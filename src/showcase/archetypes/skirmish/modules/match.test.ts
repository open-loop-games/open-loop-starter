import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import { DISTRICTS } from '../data/contracts';
import { boot, getEngine, seconds, tickUntil } from '../sim/harness';
import { getMatch } from './match';
import { deploy, setStance } from './orders';

const NARROWS = 0;
const DOCKS = 1;

/** Put whole units of a kind straight into a seat's safehouse. */
function grant(side: ReturnType<typeof getMatch>['p'], n: number): void {
  side.reserve.enforcer.value = new Decimal(n);
}

describe('the match', () => {
  beforeEach(() => boot());

  it('makes nothing at the briefing', async () => {
    const m = getMatch();
    const scrip = toNumber(m.p.scrip.value);
    await seconds(10);
    expect(m.phase.value).toBe('briefing');
    expect(m.clock.value).toBe(0);
    expect(toNumber(m.p.scrip.value)).toBe(scrip);
  });

  it('runs the clock and the hustle once the job is taken', async () => {
    const m = getMatch();
    const scrip = toNumber(m.p.scrip.value);
    m.start();
    await seconds(10);
    expect(m.phase.value).toBe('live');
    expect(m.clock.value).toBeGreaterThan(0);
    expect(toNumber(m.p.scrip.value)).toBeGreaterThan(scrip);
  });

  it('gives a district to the crew that stands in it unopposed', async () => {
    const m = getMatch();
    m.start();
    grant(m.p, 6);
    deploy(m.p, 'enforcer', 0);
    await tickUntil(() => m.control[0]!.value >= 1);
    expect(m.feed.lines.value.some((f) => f.text.includes(DISTRICTS[0]!.name))).toBe(true);
  });

  it('starts the feed empty on a load and on the next contract', () => {
    const m = getMatch();
    getEngine().save();
    m.start();
    expect(m.feed.lines.value).not.toEqual([]);
    getEngine().load();
    expect(m.feed.lines.value).toEqual([]);
    m.start();
    m.nextMatch();
    expect(m.feed.lines.value).toEqual([]);
  });

  it('tells the feed when your safehouse takes a gate gun', () => {
    const m = getMatch();
    m.start();
    m.p.scrip.value = new Decimal(1e6);
    const before = m.feed.lines.value.length;
    m.p.gateGuns.purchase(1);
    expect(m.feed.lines.value.length).toBe(before + 1);
  });

  it('burns the rival safehouse from a held district under an assault order', async () => {
    const m = getMatch();
    m.start();
    grant(m.p, 12);
    deploy(m.p, 'enforcer', DOCKS);
    await tickUntil(() => m.control[DOCKS]!.value >= 1);
    const integrity = toNumber(m.e.hq.value);
    setStance(m.p, DOCKS, 'assault');
    await seconds(5);
    expect(toNumber(m.e.hq.value)).toBeLessThan(integrity);
  });

  it('sieges only from a district with a road to the safehouse it hits', async () => {
    const m = getMatch();
    m.start();
    m.p.squads[NARROWS]!.enforcer.value = new Decimal(12);
    m.control[NARROWS]!.value = 1;
    const integrity = toNumber(m.e.hq.value);
    setStance(m.p, NARROWS, 'assault');
    await seconds(5);
    expect(toNumber(m.e.hq.value)).toBe(integrity);
  });

  it('holds a district without an assault order, and the safehouse stays whole', async () => {
    const m = getMatch();
    m.start();
    grant(m.p, 12);
    deploy(m.p, 'enforcer', 0);
    await tickUntil(() => m.control[0]!.value >= 1);
    const integrity = toNumber(m.e.hq.value);
    await seconds(5);
    expect(toNumber(m.e.hq.value)).toBe(integrity);
  });

  it('ends won when the rival safehouse falls, and the next match starts from a briefing', async () => {
    const m = getMatch();
    m.start();
    grant(m.p, 30);
    deploy(m.p, 'enforcer', DOCKS);
    await tickUntil(() => m.control[DOCKS]!.value >= 1);
    setStance(m.p, DOCKS, 'assault');
    await tickUntil(() => m.phase.value !== 'live', 20_000);
    expect(m.phase.value).toBe('won');
    m.nextMatch();
    expect(m.phase.value).toBe('briefing');
    expect(m.clock.value).toBe(0);
    expect(m.control.every((c) => c.value === 0)).toBe(true);
    expect(toNumber(m.e.hq.value)).toBe(m.tune.hqIntegrity.value);
  });

  it('lets the astral scout see every district for a while, then fogs them again', async () => {
    const m = getMatch();
    m.start();
    m.p.aether.value = new Decimal(m.scoutCost);
    expect(DISTRICTS.some((_, i) => !m.visible(i))).toBe(true);
    expect(m.scout()).toBe(true);
    expect(DISTRICTS.every((_, i) => m.visible(i))).toBe(true);
    expect(m.scout()).toBe(false);
    await tickUntil(() => m.scoutLeft.value === 0);
    expect(DISTRICTS.some((_, i) => !m.visible(i))).toBe(true);
  });
});
