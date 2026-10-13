import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal } from '@open-loop/engine';
import { boot, getEngine, tick, tickUntil } from '../sim/harness';
import { DefenderTuningRegistryKey, getGarden, getPlot, type PlotRun } from '.';

const num = (v: unknown) => new Decimal(v as never).toNumber();

/** The open cell nearest the route's midpoint that a thrush can take. */
function besideRoute(run: PlotRun): { x: number; y: number } {
  const route = run.route();
  const mid = route[Math.floor(route.length / 2)];
  for (let r = 1; r < 4; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const x = mid.x + dx;
        const y = mid.y + dy;
        if (run.canPlant('thrush', x, y).ok) return { x, y };
      }
  throw new Error('no cell beside the route');
}

describe('a plot run', () => {
  beforeEach(() => boot());

  it('opens on a held build phase: the first wave waits for the gardener', async () => {
    const run = getPlot().startPlot('herb-border');
    await tick(200);
    expect(run.phase).toBe('build');
    expect(run.pests).toHaveLength(0);
    run.callEarly();
    expect(run.phase).toBe('wave');
  });

  it('pests route around a hedge, and a planting that would seal the path is refused', () => {
    const run = getPlot().startPlot('herb-border');
    const before = run.route();
    const on = before[3];
    expect(run.plant('hedge', on.x, on.y)).toBe(true);
    const after = run.route();
    expect(after.some((c) => c.x === on.x && c.y === on.y)).toBe(false);
    expect(after.length).toBeGreaterThanOrEqual(before.length);
    const { gap } = run;
    run.plant('hedge', gap.x + 1, gap.y);
    // Wall the gap in on its two other open sides, then the third must refuse.
    run.plant('hedge', gap.x, gap.y - 1);
    expect(run.canPlant('hedge', gap.x, gap.y + 1)).toEqual({
      ok: false,
      reason: 'Would seal the path',
    });
  });

  it('refuses every board change while a wave walks', () => {
    const run = getPlot().startPlot('herb-border');
    const at = besideRoute(run);
    run.plant('thrush', at.x, at.y);
    const id = [...run.plants.keys()][0];
    run.callEarly();
    expect(run.canPlant('hedge', 0, 0).ok).toBe(false);
    expect(run.upgrade(id)).toBe(false);
    expect(run.digUp(id)).toBe(false);
  });

  it('digging up refunds less than was spent', () => {
    const plot = getPlot();
    const run = plot.startPlot('herb-border');
    const start = num(plot.compost.value);
    const at = besideRoute(run);
    run.plant('thrush', at.x, at.y);
    run.digUp([...run.plants.keys()][0]);
    const after = num(plot.compost.value);
    expect(after).toBeGreaterThan(start - getGarden().specs.value.thrush.cost);
    expect(after).toBeLessThan(start);
  });

  it('calling it a day pays for the build time given up, except on the held first wave', async () => {
    const plot = getPlot();
    const run = plot.startPlot('herb-border');
    expect(run.earlyCallBonus()).toBe(0);
    const at = besideRoute(run);
    run.plant('thrush', at.x, at.y);
    run.callEarly();
    await tickUntil(() => run.phase !== 'wave', 20_000);
    expect(run.phase).toBe('build');
    const bonus = run.earlyCallBonus();
    expect(bonus).toBeGreaterThan(0);
    const held = num(plot.compost.value);
    run.callEarly();
    expect(num(plot.compost.value)).toBe(held + bonus);
  });

  it('a pest that reaches the seedbed eats seedlings, and an empty seedbed loses the plot', async () => {
    const plot = getPlot();
    const run = plot.startPlot('herb-border');
    const seedlings = num(plot.seedlings.value);
    run.callEarly();
    await tickUntil(() => num(plot.seedlings.value) < seedlings, 20_000);
    await tickUntil(() => run.phase === 'lost', 200_000);
    expect(num(plot.seedlings.value)).toBe(0);
    expect(plot.lastResult.value?.outcome).toBe('lost');
  });
});

describe('the garden between plots', () => {
  beforeEach(() => {
    boot();
    // A one-wave plot at almost no pressure, so one thrush holds it.
    getEngine()
      .tryInject(DefenderTuningRegistryKey)!
      .pushOverrides('test', { 'spine/baseWaves': () => 1, 'spine/basePressure': () => 0.01 });
  });

  async function holdFirstPlot(): Promise<void> {
    const run = getPlot().startPlot('herb-border');
    const at = besideRoute(run);
    run.plant('thrush', at.x, at.y);
    run.callEarly();
    await tickUntil(() => run.phase === 'won', 20_000);
    getPlot().leavePlot();
  }

  it('holding a plot opens the next and banks its score as the record', async () => {
    const garden = getGarden();
    expect(garden.plots.isUnlocked('bean-rows')).toBe(false);
    await holdFirstPlot();
    expect(garden.plots.isUnlocked('bean-rows')).toBe(true);
    expect(garden.held.value).toEqual(['herb-border']);
    expect(garden.xp.value).toBe(getPlot().lastResult.value?.score);
  });

  it('a worse attempt never lowers the record', async () => {
    const garden = getGarden();
    await holdFirstPlot();
    const xp = garden.xp.value;
    getPlot().startPlot('herb-border');
    getPlot().leavePlot();
    expect(getPlot().lastResult.value?.outcome).toBe('left');
    expect(garden.xp.value).toBe(xp);
  });

  it('notes are the level less the lessons bought, and relearning returns them', async () => {
    const garden = getGarden();
    await holdFirstPlot();
    const level = garden.level.value;
    expect(level).toBeGreaterThan(0);
    expect(num(garden.notes.value)).toBe(level);
    garden.lessons.getPurchasable('cloches')!.purchase(1);
    expect(num(garden.notes.value)).toBe(level - 1);
    garden.relearn();
    expect(num(garden.notes.value)).toBe(level);
  });

  it('a lesson reaches the next run: cloches add seedlings', async () => {
    const garden = getGarden();
    const plot = getPlot();
    await holdFirstPlot();
    plot.startPlot('herb-border');
    const base = num(plot.seedlings.value);
    plot.leavePlot();
    garden.lessons.getPurchasable('cloches')!.purchase(1);
    plot.startPlot('herb-border');
    expect(num(plot.seedlings.value)).toBeGreaterThan(base);
  });
});
