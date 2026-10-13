/**
 * Capacity probe — measures, wave by wave under the reference gardener, the
 * terms the spine's damage capacity is built from, so each anchor can be
 * read off the shipping game instead of chosen. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/defender/balance/capacity-probe.ts [-- --set anchor=value]
 *
 * Columns, per wave at launch:
 * - `V/Vref`: compost committed over the spine's `committedValue`, which
 *   counts what calling it a day pays;
 * - `share`: the hunting plants' share of compost on the board;
 * - `boost`: the marigolds' damage multiplier over the hunting plants,
 *   weighted by damage: what the booster adds that a thrush-equivalent does not;
 * - `path`: the route's length in cells, what the maze adds;
 * - `kind`: the kind of pest the night sends;
 * - `dwell`: seconds a slug-speed pest spends in the reach of a plant that can
 *   hurt it, weighted by damage: the leak estimate's τ. A moth's is measured
 *   along its flight line, every other kind's along the route;
 * - `C/Cref`: the board's stream capacity against tonight's kind,
 *   Σ dps·armour·(n·gap + τ) over the plants that can hurt it, over the
 *   spine's reference capacity times its answer share;
 * - `land`: damage the wave took over that capacity, the firing efficiency.
 *   Below 1 is overkill, idle reach and pests dying before they cross it;
 * - `HP/C`: the wave's pool over the board's capacity, the pressure it met;
 * - `tail`: seconds from the wave's last arrival to its end, the part of a
 *   wave's length the schedule reads from `PLOT_TAIL`.
 *
 * Each plot ends with its means of ground `dwell` and `tail`, the values
 * `PLOT_DWELL` and `PLOT_TAIL` in `data/spine.ts` are set from, and the mean
 * moth-night dwell. The last line is the mean over every moth night of the
 * arc: `FLIGHT_DWELL`.
 */
import { Decimal, runUntil, type Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  ARMOUR,
  FORM_VS_ARMOUR,
  PLOTS,
  answerShare,
  committedValue,
  composeWave,
  lastArrival,
  nightKind,
  plantSpecs,
  referenceCapacity,
} from '../data';
import {
  DefenderTuningRegistryKey,
  createDefenderModules,
  getGarden,
  evaluateCompanions,
  getPlot,
  type PlotRun,
} from '../modules';
import { spendNotes, tendPlot } from './_gardener';

const engine: Engine = bootTestEngine({
  modules: [...sharedBase, ...createDefenderModules()],
  persistenceNamespacePrefix: 'defender-capacity',
}).engine;
const garden = getGarden();
const plot = getPlot();
const sets = process.argv.flatMap((arg, i) => (arg === '--set' ? [process.argv[i + 1]] : []));
if (sets.length > 0) {
  engine
    .tryInject(DefenderTuningRegistryKey)!
    .pushOverrides(
      'probe',
      Object.fromEntries(
        sets.map((kv) => [`spine/${kv.split('=')[0]}`, () => Number(kv.split('=')[1])]),
      ),
    );
}
const num = (v: unknown) => new Decimal(v as never).toNumber();
const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '—');

interface Launch {
  kind: string;
  value: number;
  share: number;
  boost: number;
  path: number;
  dwell: number;
  capacity: number;
}

/** The board's terms at launch, before any pest moves. */
function measureLaunch(run: PlotRun): Launch {
  const a = garden.anchors.value;
  const specs = plantSpecs(a);
  const kind = nightKind(a, run.plotIndex, run.wave);
  const armour = ARMOUR[kind];
  const line = armour === 'wing' ? run.flightLine() : run.route();
  const n = composeWave(a, run.plotIndex, run.wave).length;
  let value = num(plot.compost.value);
  let hunting = 0;
  let dpsSum = 0;
  let dwellSum = 0;
  let capacity = 0;
  let boosted = 0;
  const amp = evaluateCompanions(run.grid, run.plants, specs);
  for (const p of run.plants.values()) {
    value += p.spent;
    const spec = specs[p.def];
    if (spec.form === null) continue;
    hunting += p.spent;
    const hurts = FORM_VS_ARMOUR[spec.form][armour];
    if (hurts === 0) continue;
    const reach = run.plantRange(p);
    const cells = line.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) <= reach).length;
    const dwell = cells / a.pestSpeed;
    // A splash release is priced to catch two pests; count it at that.
    const dps = (run.plantDamage(p) / spec.cooldown) * (spec.splash > 0 ? 2 : 1) * hurts;
    dpsSum += dps;
    boosted += dps * (amp.get(p.id) ?? 1);
    dwellSum += dps * dwell;
    capacity += dps * (n * a.spawnGap + dwell);
  }
  const board = value - num(plot.compost.value);
  return {
    kind,
    value,
    share: board > 0 ? hunting / board : 0,
    boost: dpsSum > 0 ? boosted / dpsSum : 1,
    path: run.route().length - 1,
    dwell: dpsSum > 0 ? dwellSum / dpsSum : 0,
    capacity,
  };
}

console.log('Walled Garden capacity probe — reference gardener, early calls on, tickDelta 0.05\n');
console.log(
  'plot         wave kind     n   V/Vref  share  boost  path  dwell  C/Cref   land   HP/C  leaks   tail',
);
const flight: number[] = [];
for (const [pi, def] of PLOTS.entries()) {
  if (!garden.plots.isUnlocked(def.id)) break;
  spendNotes(garden);
  const lv = (id: string) => num(garden.lessons.getPurchasable(id)!.count.value);
  const run = plot.startPlot(def.id);
  const starts: Launch[] = [];
  run.on((e) => {
    if (e.type === 'build') tendPlot(garden, plot, run, { callEarly: true });
    if (e.type === 'launch') starts.push(measureLaunch(run));
  });
  tendPlot(garden, plot, run, { callEarly: true });
  runUntil({
    engine,
    until: () => run.phase === 'won' || run.phase === 'lost',
    maxSimTime: 3600,
    tickDelta: 0.05,
  });
  const a = garden.anchors.value;
  const ground: number[] = [];
  const moths: number[] = [];
  let tailSum = 0;
  run.waveLogs.forEach((l, i) => {
    const s = starts[i];
    const vref = committedValue(a, l.wave, lv('bins'), lv('early-riser'));
    const cref =
      referenceCapacity(a, pi, l.wave, lv('well-fed'), lv('bins'), lv('early-riser')) *
      answerShare(a, pi, nightKind(a, pi, l.wave));
    const tail = l.duration - lastArrival(a, pi, l.wave);
    (s.kind === 'moth' ? moths : ground).push(s.dwell);
    tailSum += tail;
    console.log(
      [
        def.id.padEnd(12),
        String(l.wave).padStart(4),
        s.kind.padEnd(7),
        String(l.pests).padStart(3),
        f(s.value / vref).padStart(8),
        f(s.share).padStart(6),
        f(s.boost).padStart(6),
        String(s.path).padStart(5),
        f(s.dwell, 1).padStart(6),
        f(s.capacity / cref).padStart(7),
        f(l.damageDealt / s.capacity).padStart(6),
        f(l.hpPool / s.capacity).padStart(6),
        String(l.leaks).padStart(6),
        f(tail, 1).padStart(6),
      ].join(' '),
    );
  });
  const mean = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length;
  flight.push(...moths);
  console.log(
    `  ${def.displayName}: ${run.phase === 'won' ? 'held' : 'LOST'}; ` +
      `mean dwell ${f(mean(ground), 1)}s, mean tail ${f(tailSum / run.waveLogs.length, 1)}s` +
      (moths.length ? `, moth-night dwell ${f(mean(moths), 1)}s` : ''),
  );
  plot.leavePlot();
}
console.log(
  `mean moth-night dwell over the arc: ${f(flight.reduce((t, x) => t + x, 0) / flight.length, 1)}s`,
);
engine.dispose();
