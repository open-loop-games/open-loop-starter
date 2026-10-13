/**
 * The reference gardener: the greedy player the probes drive. Balance-harness
 * tooling, not a mechanic. The Walled Garden has no player-facing automation,
 * so nothing here re-implements one.
 *
 * - Each build phase: a quarter of the compost on hedges that lengthen the path
 *   most per compost, then the rest on whatever adds the most route coverage ×
 *   damage per compost: a thrush, a ladybird hotel, an upgrade, or a marigold.
 * - Calls it a day the moment the build is spent, when `callEarly` is set; the
 *   first wave is always called, because it waits for the gardener.
 * - Between plots, spends almanac notes evenly across the lessons.
 */
import { DIAGONAL_OFFSETS, Decimal } from '@open-loop/engine';
import { LESSONS, type PlantId } from '../data';
import type { GardenApi, PlotApi, PlotRun } from '../modules';

const num = (v: unknown) => new Decimal(v as never).toNumber();

function coverage(x: number, y: number, range: number, route: { x: number; y: number }[]): number {
  let n = 0;
  for (const c of route) if (Math.hypot(c.x - x, c.y - y) <= range) n++;
  return n;
}

function openCells(run: PlotRun): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < run.grid.height; y++)
    for (let x = 0; x < run.grid.width; x++) {
      const c = run.grid.at(x, y);
      if (c.terrain === 'open' && c.plantId === null) cells.push({ x, y });
    }
  return cells;
}

export interface GardenerOptions {
  /** Call it a day once the build is spent. Off, only the first wave is called. */
  callEarly: boolean;
  /** Told the label of every purchase. */
  onBuy?: (what: string) => void;
}

/** Spend one build phase, then call the wave when the options say so. */
export function tendPlot(
  garden: GardenApi,
  plot: PlotApi,
  run: PlotRun,
  opts: GardenerOptions,
): void {
  const specs = garden.specs.value;
  const compost = () => num(plot.compost.value);
  const hedgeBudget = compost() * 0.25;
  let hedgeSpent = 0;
  // Hedges that lengthen the path the most per compost.
  while (hedgeSpent + specs.hedge.cost <= hedgeBudget) {
    const base = run.route().length;
    let best: { x: number; y: number; gain: number } | null = null;
    for (const c of openCells(run)) {
      if (!run.canPlant('hedge', c.x, c.y).ok) continue;
      const d = run.grid.distanceField([run.seedbed], (cell, cx, cy) =>
        cx === c.x && cy === c.y
          ? Infinity
          : cell.terrain === 'stone' || cell.plantId !== null
            ? Infinity
            : 1,
      );
      const gain = d[run.gap.y * run.grid.width + run.gap.x] + 1 - base;
      if (gain > 0 && (!best || gain > best.gain)) best = { ...c, gain };
    }
    if (!best) break;
    run.plant('hedge', best.x, best.y);
    opts.onBuy?.('hedge');
    hedgeSpent += specs.hedge.cost;
  }

  // Damage: thrushes, ladybirds, marigolds and upgrades ranked by route coverage × damage per compost.
  for (let guard = 0; guard < 200; guard++) {
    const route = run.route();
    type Act = { score: number; go: () => boolean; label: string };
    let best: Act | null = null;
    const consider = (a: Act) => {
      if (!best || a.score > best.score) best = a;
    };
    for (const id of ['thrush', 'ladybird'] as PlantId[]) {
      const spec = specs[id];
      if (!garden.isPlantUnlocked(id) || spec.cost > compost()) continue;
      const dps = (spec.damage / spec.cooldown) * (id === 'ladybird' ? 2 : 1);
      for (const c of openCells(run)) {
        const cov = coverage(c.x, c.y, spec.range, route);
        if (cov === 0) continue;
        consider({ score: (cov * dps) / spec.cost, label: id, go: () => run.plant(id, c.x, c.y) });
      }
    }
    for (const t of run.plants.values()) {
      const price = run.upgradePrice(t.id);
      if (price === null || price > compost()) continue;
      const spec = specs[t.def];
      const cov = coverage(t.x, t.y, run.plantRange(t) + 0.25, route);
      const dps = (spec.damage / spec.cooldown) * (t.def === 'ladybird' ? 2 : 1) * 1.5 ** t.level;
      consider({
        score: (cov * dps) / price,
        label: `${t.def} L${t.level + 1}`,
        go: () => run.upgrade(t.id),
      });
    }
    if (garden.isPlantUnlocked('marigold') && specs.marigold.cost <= compost()) {
      for (const c of openCells(run)) {
        let gain = 0;
        for (const n of run.grid.neighbors(c.x, c.y, DIAGONAL_OFFSETS)) {
          const id = run.grid.at(n.x, n.y).plantId;
          if (id === null) continue;
          const t = run.plants.get(id)!;
          const spec = specs[t.def];
          if (spec.damage === 0) continue;
          gain +=
            coverage(t.x, t.y, run.plantRange(t), route) *
            (spec.damage / spec.cooldown) *
            specs.marigold.amp;
        }
        if (gain > 0) {
          consider({
            score: gain / specs.marigold.cost,
            label: 'marigold',
            go: () => run.plant('marigold', c.x, c.y),
          });
        }
      }
    }
    if (!best) break;
    const act: Act = best;
    if (!act.go()) break;
    opts.onBuy?.(act.label);
  }
  if (opts.callEarly || run.held) run.callEarly();
}

/** Spend every almanac note, one level at a time on the least-learned lesson. */
export function spendNotes(garden: GardenApi): void {
  for (let guard = 0; guard < 40 && num(garden.notes.value) >= 1; guard++) {
    const affordable = LESSONS.map((l) => garden.lessons.getPurchasable(l.id)!)
      .filter((p) => p.canPurchase.value)
      .sort((a, b) => num(a.count.value) - num(b.count.value));
    if (affordable.length === 0) break;
    affordable[0].purchase(1);
  }
}
