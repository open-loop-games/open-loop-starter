import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal } from '@open-loop/engine';
import { boot, tick } from '../../sim/harness';
import { getMatch } from '../../modules/match';
import { redeploy } from '../../modules/orders';
import { UNIT_KINDS } from '../../data/units';
import { readFrame } from './frame';

const NARROWS = 0;
const DOCKS = 1;
const STEPS = 2;

const at = (place: number | 'p' | 'e') =>
  readFrame(getMatch()).places.find((v) => v.place === place)!;

describe('the field frame', () => {
  beforeEach(() => {
    boot();
    getMatch().start();
  });

  it('draws no rival squad where you have no eyes, and the last sighting once it fogs over', async () => {
    const m = getMatch();
    m.e.squads[DOCKS]!.razor.value = new Decimal(3);
    expect(at(DOCKS).theirs).toBeUndefined();
    expect(at(DOCKS).sighting).toBeUndefined();
    m.control[DOCKS]!.value = 0.5;
    await tick();
    expect(at(DOCKS).theirs!.razor).toBe(3);
    m.control[DOCKS]!.value = 0;
    await tick();
    expect(at(DOCKS).theirs).toBeUndefined();
    expect(at(DOCKS).sighting!.counts.razor).toBe(3);
  });

  it('shows the whole units ready at your safehouse, not the ones still training', () => {
    getMatch().p.reserve.hexer.value = new Decimal(2.7);
    expect(at('p').mine.hexer).toBe(2);
  });

  it("shows the rival's safehouse only while the astral scout rides", () => {
    const m = getMatch();
    m.e.reserve.enforcer.value = new Decimal(5);
    expect(at('e').theirs).toBeUndefined();
    m.p.aether.value = new Decimal(m.scoutCost);
    m.scout();
    expect(at('e').theirs!.enforcer).toBe(5);
  });

  it("draws the rival's safehouse block as the astral scout last saw it", () => {
    const m = getMatch();
    expect(readFrame(m).blocks.e).toBeUndefined();
    m.p.aether.value = new Decimal(m.scoutCost);
    m.scout();
    const seen = readFrame(m).blocks.e!;
    expect(seen.tech).toEqual(UNIT_KINDS.filter((k) => m.e.opened(k)));
    expect(readFrame(m).blocks.p.floors).toBe(m.p.floorCount() - readFrame(m).blocks.p.tech.length);
  });

  it('draws your convoys, and only the rival convoys you see', () => {
    const m = getMatch();
    m.p.squads[NARROWS]!.razor.value = new Decimal(2);
    redeploy(m.p, NARROWS, DOCKS);
    m.e.squads[STEPS]!.razor.value = new Decimal(3);
    redeploy(m.e, STEPS, DOCKS);
    const sides = () => readFrame(m).convoys.map((c) => c.side);
    expect(sides()).toEqual(['p']);
    m.control[DOCKS]!.value = 0.5;
    expect(sides()).toEqual(['p', 'e']);
  });
});
