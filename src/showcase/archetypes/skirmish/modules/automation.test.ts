import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { boot, seconds, tickUntil } from '../sim/harness';
import { getAutomation } from './automation';
import { getMatch } from './match';

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
    getAutomation().tiers.unlock('fixer');
    const m = getMatch();
    const before = hustlers();
    m.start();
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
    const auto = getAutomation();
    auto.tiers.unlock('fixer');
    auto.lieutenants.find((l) => l.tier === 'fixer')!.enabled.value = false;
    const before = hustlers();
    getMatch().start();
    await seconds(30);
    expect(hustlers()).toBe(before);
  });
});

describe('the rival seat', () => {
  beforeEach(() => boot());

  it('plays its economy with no automation tier', async () => {
    const m = getMatch();
    const before = toNumber(m.e.econ.getProducer('hustler')!.count.value);
    m.start();
    await seconds(30);
    expect(toNumber(m.e.econ.getProducer('hustler')!.count.value)).toBeGreaterThan(before);
  });
});
