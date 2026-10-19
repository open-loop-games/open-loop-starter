import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { boot, seconds, tickUntil } from '../sim/harness';
import { getAutomation } from './automation';
import { getMatch } from './match';

const fixer = () => getAutomation().lieutenants.find((l) => l.def.id === 'fixer')!;
const quartermaster = () => getAutomation().lieutenants.find((l) => l.def.id === 'quartermaster')!;
const hustlers = () => toNumber(getMatch().p.econ.getProducer('hustler')!.count.value);

describe("the player's lieutenants", () => {
  beforeEach(() => boot());

  it('do nothing before they are hired', async () => {
    const before = hustlers();
    getMatch().start();
    await seconds(30);
    expect(hustlers()).toBe(before);
  });

  it('play the economy once the fixer is hired, keeping back the next floor', async () => {
    const m = getMatch();
    const before = hustlers();
    m.start();
    fixer().hire.purchase();
    expect(fixer().hire.active.value).toBe(true);
    await tickUntil(() => hustlers() > before);
    const floor = Math.min(
      ...m.p.barracks
        .getAll()
        .filter((b) => b.producer.repeatable!.visible.value)
        .map((b) => toNumber(b.producer.repeatable!.getCost(1))),
    );
    expect(toNumber(m.p.scrip.value)).toBeGreaterThanOrEqual(floor);
  });

  it('stand down while their switch is off', async () => {
    getMatch().start();
    fixer().hire.purchase();
    fixer().enabled.value = false;
    const before = hustlers();
    await seconds(30);
    expect(hustlers()).toBe(before);
  });
});

describe('hiring a lieutenant', () => {
  beforeEach(() => boot());

  it('waits for the job to start', () => {
    expect(fixer().hire.canPurchase.value).toBe(false);
    getMatch().start();
    expect(fixer().hire.canPurchase.value).toBe(true);
  });

  it('goes in order: the quartermaster shows once the fixer is hired', () => {
    getMatch().start();
    expect(quartermaster().hire.visible.value).toBe(false);
    fixer().hire.purchase();
    expect(quartermaster().hire.visible.value).toBe(true);
  });

  it('lasts the match: the next briefing has let every lieutenant go', async () => {
    const m = getMatch();
    m.start();
    fixer().hire.purchase();
    await seconds(1);
    expect(getAutomation().isUnlocked('fixer')).toBe(true);
    m.nextMatch();
    await seconds(1);
    expect(fixer().hire.active.value).toBe(false);
    expect(getAutomation().isUnlocked('fixer')).toBe(false);
  });

  it('comes back on its switch in the next match, whatever the last one left', () => {
    const m = getMatch();
    m.start();
    fixer().hire.purchase();
    fixer().enabled.value = false;
    m.nextMatch();
    expect(fixer().enabled.value).toBe(true);
  });
});

describe('the rival seat', () => {
  beforeEach(() => boot());

  it('hires its own lieutenants, in order, as the player does', async () => {
    const m = getMatch();
    m.start();
    await seconds(2);
    expect(m.e.crew.getPurchasable('fixer')!.active.value).toBe(true);
    expect(m.p.crew.getPurchasable('fixer')!.active.value).toBe(false);
  });

  it('plays its economy with no automation tier', async () => {
    const m = getMatch();
    const before = toNumber(m.e.econ.getProducer('hustler')!.count.value);
    m.start();
    await seconds(30);
    expect(toNumber(m.e.econ.getProducer('hustler')!.count.value)).toBeGreaterThan(before);
  });
});
