import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal } from '@open-loop/engine';
import { SPEED_MULT } from '../data';
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
    await tickUntil(() => run.phase === 'held', 20_000);
    run.finish();
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

describe('the counter wheel', () => {
  beforeEach(() => {
    boot();
    // A record worth every plant, and every plot open.
    const garden = getGarden();
    garden.records.submit({ key: 'herb-border', value: 5000, elapsed: 0, runNumber: 1 });
    garden.plots.unlock('bean-rows');
    garden.plots.unlock('orchard');
  });

  /** Call nights early, planting nothing, until night `w` is the next to fall. */
  async function skipTo(run: PlotRun, w: number): Promise<void> {
    await tickUntil(() => {
      if (run.phase === 'build' && run.wave < w) run.callEarly();
      return run.phase === 'build' && run.wave === w;
    }, 100_000);
  }

  /** An open cell a plant can take within `reach` of the line, nearest its middle first. */
  function beside(run: PlotRun, id: 'thrush' | 'bat'): { x: number; y: number } {
    const line = run.flightLine();
    const mid = line[Math.floor(line.length / 2)];
    for (let r = 1; r < 4; r++)
      for (let dx = -r; dx <= r; dx++)
        for (const dy of [-1, 1]) {
          const x = Math.round(mid.x) + dx;
          const y = Math.round(mid.y) + dy;
          if (run.canPlant(id, x, y).ok) return { x, y };
        }
    throw new Error('no cell beside the flight line');
  }

  it('the preview names the nights to come, and the night that falls sends what it named', async () => {
    const run = getPlot().startPlot('orchard');
    const ahead = run.preview(3);
    expect(ahead.map((n) => n.wave)).toEqual([1, 2, 3]);
    expect(new Set(ahead.map((n) => n.kind)).size).toBeGreaterThan(1);
    run.callEarly();
    await tickUntil(() => run.pests.length > 0, 1_000);
    expect(run.pests.every((u) => u.kind === ahead[0].kind)).toBe(true);
    expect(run.preview(3)[0].wave).toBe(1);
  });

  it('moths fly the straight line to the seedbed, over the hedges', async () => {
    const run = getPlot().startPlot('bean-rows');
    const moth = run.preview(14).find((n) => n.kind === 'moth')!.wave;
    const on = run.route()[3];
    run.plant('hedge', on.x, on.y);
    await skipTo(run, moth);
    run.callEarly();
    const line = run.flightLine();
    const y = line[0].y + 0.5;
    const seen = new Set<number>();
    await tickUntil(() => {
      for (const u of run.pests) {
        if (u.kind !== 'moth') continue;
        seen.add(u.id);
        expect(u.py).toBeCloseTo(y, 6);
      }
      return run.phase !== 'wave';
    }, 20_000);
    expect(seen.size).toBeGreaterThan(0);
  });

  it('a plant aims only at what its form can reach: thrushes at the ground, bats at moths', async () => {
    const run = getPlot().startPlot('bean-rows');
    const moth = run.preview(14).find((n) => n.kind === 'moth')!.wave;
    const t = beside(run, 'thrush');
    run.plant('thrush', t.x, t.y);
    const b = beside(run, 'bat');
    run.plant('bat', b.x, b.y);
    const [thrush, bat] = [...run.plants.values()].map((p) => p.id);
    const aimed = new Map<number, Set<string>>([
      [thrush, new Set()],
      [bat, new Set()],
    ]);
    const watch = () => {
      for (const s of run.shots) {
        const target = run.pests.find((u) => u.id === s.targetId);
        if (target) aimed.get(s.plantId)?.add(target.kind);
      }
    };
    run.callEarly();
    await tickUntil(() => (watch(), run.phase !== 'wave'), 20_000);
    await skipTo(run, moth);
    run.callEarly();
    await tickUntil(() => (watch(), run.phase !== 'wave'), 20_000);
    expect(aimed.get(thrush)!.has('slug')).toBe(true);
    expect(aimed.get(thrush)!.has('moth')).toBe(false);
    expect([...aimed.get(bat)!]).toEqual(['moth']);
  });
});

describe('booster against maze', () => {
  beforeEach(() => {
    boot();
    getGarden().records.submit({ key: 'herb-border', value: 5000, elapsed: 0, runNumber: 1 });
  });

  /** A thrush beside the route, and two open cells touching it, off the route. */
  function thrushWithRoom(run: PlotRun) {
    const at = besideRoute(run);
    run.plant('thrush', at.x, at.y);
    const thrush = [...run.plants.values()][0];
    const onRoute = new Set(run.route().map((c) => `${c.x},${c.y}`));
    const room: { x: number; y: number }[] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const x = at.x + dx;
        const y = at.y + dy;
        if ((dx || dy) && !onRoute.has(`${x},${y}`) && run.canPlant('marigold', x, y).ok)
          room.push({ x, y });
      }
    return { thrush, room };
  }

  it('a marigold boosts what touches it, and a second marigold adds nothing', () => {
    const run = getPlot().startPlot('herb-border');
    getPlot().compost.value = 10_000;
    const { thrush, room } = thrushWithRoom(run);
    const alone = run.plantDamage(thrush);
    run.plant('marigold', room[0].x, room[0].y);
    const boosted = run.plantDamage(thrush);
    run.plant('marigold', room[1].x, room[1].y);
    expect(boosted).toBeGreaterThan(alone);
    expect(run.plantDamage(thrush)).toBe(boosted);
  });

  it('the hand shows what a planting does to the path, and whom a marigold would boost', () => {
    const run = getPlot().startPlot('herb-border');
    getPlot().compost.value = 10_000;
    const { room } = thrushWithRoom(run);
    const on = run.route()[3];
    const hedge = run.plantPreview('hedge', on.x, on.y);
    expect(hedge.pathAfter).toBeGreaterThanOrEqual(hedge.pathBefore);
    expect(run.plantPreview('marigold', room[0].x, room[0].y).boosts).toBe(1);
    run.plant('marigold', room[0].x, room[0].y);
    expect(run.plantPreview('marigold', room[1].x, room[1].y).boosts).toBe(0);
  });
});

describe('the dark past the last night', () => {
  beforeEach(() => {
    boot();
    // A one-night plot at almost no pressure, so one thrush holds it.
    getEngine()
      .tryInject(DefenderTuningRegistryKey)!
      .pushOverrides('test', { 'spine/baseWaves': () => 1, 'spine/basePressure': () => 0.01 });
  });

  async function toTheHold(): Promise<PlotRun> {
    const run = getPlot().startPlot('herb-border');
    const at = besideRoute(run);
    run.plant('thrush', at.x, at.y);
    run.callEarly();
    await tickUntil(() => run.phase === 'held', 20_000);
    return run;
  }

  it('the last night holds the plot and waits; calling it a night ends the run held', async () => {
    const run = await toTheHold();
    expect(getGarden().plots.isUnlocked('bean-rows')).toBe(true);
    await tick(200);
    expect(run.phase).toBe('held');
    run.finish();
    expect(run.phase).toBe('won');
    expect(getPlot().lastResult.value?.outcome).toBe('held');
  });

  it('going on turns the rotation past the last night, never the badger, each night harder over its bounty', async () => {
    const run = await toTheHold();
    expect(run.goOn()).toBe(true);
    expect(run.phase).toBe('build');
    const ahead = run.preview(4);
    expect(ahead.map((n) => n.wave)).toEqual([2, 3, 4, 5]);
    expect(ahead.some((n) => n.kind === 'badger')).toBe(false);
    const ratio = (n: (typeof ahead)[number]) =>
      n.pests.reduce((t, u) => t + u.hp * SPEED_MULT[u.kind], 0) /
      n.pests.reduce((t, u) => t + u.bounty, 0);
    const slugs = ahead.filter((n) => n.kind === 'slug');
    expect(ratio(slugs[1])).toBeGreaterThan(ratio(slugs[0]));
  });

  it('a dark whose HP keeps pace with its bounty is refused at the door', async () => {
    getEngine()
      .tryInject(DefenderTuningRegistryKey)!
      .pushOverrides('flat', { 'spine/tailDivergence': () => 1 });
    const run = await toTheHold();
    expect(run.goOn()).toBe(false);
    expect(run.phase).toBe('held');
  });

  it('a run that falls in the dark still holds the plot, and the dark adds to its score', async () => {
    const run = await toTheHold();
    const held = run.score;
    run.goOn();
    await tickUntil(() => {
      if (run.phase === 'build') run.callEarly();
      return run.phase === 'lost';
    }, 400_000);
    expect(getPlot().lastResult.value?.outcome).toBe('held');
    expect(getPlot().lastResult.value?.depth).toBe(run.depth);
    expect(run.score).toBeGreaterThanOrEqual(held);
  });
});
