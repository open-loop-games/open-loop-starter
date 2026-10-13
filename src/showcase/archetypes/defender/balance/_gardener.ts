/**
 * The reference gardener: the greedy player the probes drive. Balance-harness
 * tooling, not a mechanic. The Walled Garden has no player-facing automation,
 * so nothing here re-implements one.
 *
 * - Each build phase reads the next three nights and sets a target split of
 *   hunting compost across forms: each night asks for its best learned form,
 *   ties shared. That is the split `formShares` assumes, read off the preview
 *   rather than the whole rotation.
 * - Hedges first, on the ground nights' share of a quarter of the compost: the
 *   ones that lengthen the path most per compost. Moths fly over them.
 * - Then, purchase by purchase, the form furthest below its target: its best
 *   planting or upgrade by reach over the pests' line × damage per compost, or
 *   a marigold if one beats it. If that form has nothing affordable, it saves.
 * - Calls it a day the moment the build is spent, when `callEarly` is set; the
 *   first wave is always called, because it waits for the gardener.
 * - Between plots, spends almanac notes evenly across the lessons.
 */
import { DIAGONAL_OFFSETS, Decimal } from '@open-loop/engine';
import { ARMOUR, FORMS, FORM_VS_ARMOUR, LESSONS, type Form, type PlantId } from '../data';
import type { GardenApi, PlotApi, PlotRun } from '../modules';

const num = (v: unknown) => new Decimal(v as never).toNumber();

/** Nights the gardener reads ahead: the preview the plot screen shows. */
const PREVIEW = 3;

type Point = { x: number; y: number };

function coverage(x: number, y: number, range: number, line: Point[]): number {
  let n = 0;
  for (const c of line) if (Math.hypot(c.x - x, c.y - y) <= range) n++;
  return n;
}

function openCells(run: PlotRun): Point[] {
  const cells: Point[] = [];
  for (let y = 0; y < run.grid.height; y++)
    for (let x = 0; x < run.grid.width; x++) {
      const c = run.grid.at(x, y);
      if (c.terrain === 'open' && c.plantId === null) cells.push({ x, y });
    }
  return cells;
}

/** The share of the coming nights each learned form answers best. */
export function formDemand(
  garden: GardenApi,
  run: PlotRun,
  grows: (id: PlantId) => boolean,
): Record<Form, number> {
  const specs = Object.values(garden.specs.value);
  const learned = FORMS.filter((f) => specs.some((s) => s.form === f && grows(s.id)));
  const want: Record<Form, number> = { peck: 0, release: 0, hawk: 0 };
  const nights = run.preview(PREVIEW);
  for (const n of nights) {
    const armour = ARMOUR[n.kind];
    const best = Math.max(0, ...learned.map((f) => FORM_VS_ARMOUR[f][armour]));
    if (best === 0) continue;
    const answers = learned.filter((f) => FORM_VS_ARMOUR[f][armour] === best);
    for (const f of answers) want[f] += 1 / answers.length / nights.length;
  }
  return want;
}

export interface GardenerOptions {
  /** Call it a day once the build is spent. Off, only the first wave is called. */
  callEarly: boolean;
  /** Told the label of every purchase. */
  onBuy?: (what: string) => void;
  /** Plants the gardener never grows, to ask whether a turn of the wheel needs them. */
  refuse?: PlantId[];
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
  const grows = (id: PlantId) => garden.isPlantUnlocked(id) && !opts.refuse?.includes(id);
  const want = formDemand(garden, run, grows);
  const hedgeBudget = compost() * 0.25 * (1 - want.hawk);
  let hedgeSpent = 0;
  // Hedges that lengthen the path the most per compost.
  while (hedgeSpent + specs.hedge.cost <= hedgeBudget) {
    const base = run.route().length;
    let best: (Point & { gain: number }) | null = null;
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

  const hunters = (Object.keys(specs) as PlantId[]).filter((id) => specs[id].form !== null);
  const line = (form: Form) => (form === 'hawk' ? run.flightLine() : run.route());
  const dpsOf = (id: PlantId) =>
    (specs[id].damage / specs[id].cooldown) * (specs[id].splash > 0 ? 2 : 1);

  for (let guard = 0; guard < 200; guard++) {
    // The board's split now, by compost sunk into each form.
    const have: Record<Form, number> = { peck: 0, release: 0, hawk: 0 };
    let hunting = 0;
    for (const t of run.plants.values()) {
      const f = specs[t.def].form;
      if (f === null) continue;
      have[f] += t.spent;
      hunting += t.spent;
    }
    const forms = FORMS.filter((f) => want[f] > 0).sort(
      (x, y) =>
        want[y] - (hunting ? have[y] / hunting : 0) - (want[x] - (hunting ? have[x] / hunting : 0)),
    );
    const form = forms[0];
    if (!form) break;
    const path = line(form);

    type Act = { score: number; go: () => boolean; label: string };
    let best: Act | null = null;
    const consider = (a: Act) => {
      if (!best || a.score > best.score) best = a;
    };
    for (const id of hunters) {
      const spec = specs[id];
      if (spec.form !== form || !grows(id) || spec.cost > compost()) continue;
      for (const c of openCells(run)) {
        const cov = coverage(c.x, c.y, spec.range, path);
        if (cov === 0 || !run.canPlant(id, c.x, c.y).ok) continue;
        consider({
          score: (cov * dpsOf(id)) / spec.cost,
          label: id,
          go: () => run.plant(id, c.x, c.y),
        });
      }
    }
    for (const t of run.plants.values()) {
      if (specs[t.def].form !== form) continue;
      const price = run.upgradePrice(t.id);
      if (price === null || price > compost()) continue;
      const cov = coverage(t.x, t.y, run.plantRange(t) + 0.25, path);
      consider({
        score: (cov * dpsOf(t.def) * 1.5 ** t.level) / price,
        label: `${t.def} L${t.level + 1}`,
        go: () => run.upgrade(t.id),
      });
    }
    // A form with nothing affordable saves for it rather than buying the wrong answer.
    if (!best) break;
    if (grows('marigold') && specs.marigold.cost <= compost()) {
      for (const c of openCells(run)) {
        if (!run.canPlant('marigold', c.x, c.y).ok) continue;
        let gain = 0;
        for (const n of run.grid.neighbors(c.x, c.y, DIAGONAL_OFFSETS)) {
          const id = run.grid.at(n.x, n.y).plantId;
          if (id === null) continue;
          const t = run.plants.get(id)!;
          const f = specs[t.def].form;
          if (f === null) continue;
          gain +=
            coverage(t.x, t.y, run.plantRange(t), line(f)) *
            dpsOf(t.def) *
            specs.marigold.amp *
            (want[f] / want[form]);
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
