/**
 * Threshold probe — finds, plot by plot, the wave size at which the reference
 * gardener stops holding: the measurement `land` and `KIND_TOLL` are set from.
 * Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/defender/balance/threshold-probe.ts [-- --kinds] [--refuse plant]
 *
 * Each plot runs alone from a fresh engine with no almanac, every wave sized
 * `x · capacity` (pressure 1 in every plot, `land = x`). The gardener enters
 * at the level a flawless pass through the plots before it reaches, so it has
 * the plants the plot's nights ask for, and spends none of the notes. It
 * bisects `x` for two thresholds:
 * - `first leak`: the smallest `x` at which any pest reaches the seedbed;
 * - `lost`: the smallest `x` at which the seedbed is eaten.
 * `leaks first on` names the kinds whose nights leaked just above the
 * first-leak threshold: the turns of the wheel that bind.
 *
 * `--kinds` adds a table: each kind's first-leak threshold with only its own
 * nights at full size (every other pest shrunk to a tenth), over the slug's on
 * the same plot. The geometric mean across plots is that kind's toll.
 *
 * `--refuse hedge` or `--refuse marigold` bisects with the gardener never
 * growing that plant: how much of the threshold the maze, or the booster,
 * carries. *
 * The response is monotone for this gardener in practice, not by proof; a
 * bracket that does not close is printed as such.
 */
import { runUntil } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  BASE_SEEDLINGS,
  KIND_TOLL,
  NIGHTS,
  PLOTS,
  perfectScore,
  type PestKind,
  type PlantId,
} from '../data';
import { DefenderTuningRegistryKey, createDefenderModules, getGarden, getPlot } from '../modules';
import { tendPlot } from './_gardener';

const STEPS = 8;
const refuse = process.argv.flatMap((arg, i) =>
  arg === '--refuse' ? [process.argv[i + 1] as PlantId] : [],
);

interface Outcome {
  leaks: number;
  held: boolean;
  kinds: Set<PestKind>;
}

/**
 * Leaks over the plot, and whether it held, with every wave sized `x · capacity`.
 * With `only`, every pest of another kind is shrunk to a tenth as it arrives.
 */
function play(p: number, x: number, only?: PestKind): Outcome {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createDefenderModules()],
    persistenceNamespacePrefix: 'defender-threshold',
  });
  const { engine } = handle;
  engine.tryInject(DefenderTuningRegistryKey)!.pushOverrides('threshold', {
    'spine/basePressure': () => 1,
    'spine/pressureStep': () => 1,
    'spine/land': () => x,
  });
  const garden = getGarden();
  const plot = getPlot();
  for (const def of PLOTS) garden.plots.unlock(def.id);
  const a = garden.anchors.value;
  for (let q = 0; q < p; q++) {
    const value = perfectScore(a, q, BASE_SEEDLINGS);
    garden.records.submit({ key: PLOTS[q].id, value, elapsed: 0, runNumber: 1 });
  }
  const run = plot.startPlot(PLOTS[p].id);
  const kinds = new Set<PestKind>();
  run.on((e) => {
    if (e.type === 'build') tendPlot(garden, plot, run, { callEarly: true, refuse });
    if (e.type === 'held') run.finish();
    if (e.type === 'leak') kinds.add(e.kind);
  });
  tendPlot(garden, plot, run, { callEarly: true, refuse });
  const seen = new Set<number>();
  runUntil({
    engine,
    until: () => {
      if (only) {
        for (const u of run.pests) {
          if (seen.has(u.id)) continue;
          seen.add(u.id);
          if (u.kind !== only) u.hp = u.maxHp = Math.max(1, u.maxHp * 0.1);
        }
      }
      return run.phase === 'won' || run.phase === 'lost';
    },
    maxSimTime: 3600,
    tickDelta: 0.05,
  });
  const leaks = run.waveLogs.reduce((s, l) => s + l.leaks, 0);
  const held = run.phase === 'won';
  handle.dispose();
  return { leaks, held, kinds };
}

/** The smallest `x` in [lo, hi] at which `fails` holds, by bisection; NaN when the bracket does not close. */
function bisect(fails: (x: number) => boolean, lo: number, hi: number): number {
  if (fails(lo) || !fails(hi)) return NaN;
  for (let i = 0; i < STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (fails(mid)) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

const f = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : '  —  ');

console.log(
  'Walled Garden threshold probe — reference gardener, no almanac, pressure 1, land = x' +
    `${refuse.length ? ', refusing ' + refuse.join(' ') : ''}\n`,
);
console.log('plot          first leak    lost   leaks first on');
for (const [p, def] of PLOTS.entries()) {
  const leak = bisect((x) => play(p, x).leaks > 0, 0.02, 3);
  const lost = bisect((x) => !play(p, x).held, 0.02, 3);
  const kinds = Number.isFinite(leak) ? [...play(p, leak * 1.02).kinds].join(', ') : '—';
  console.log(`${def.id.padEnd(12)} ${f(leak).padStart(11)} ${f(lost).padStart(7)}   ${kinds}`);
}

if (process.argv.includes('--kinds')) {
  const kinds = [...new Set(NIGHTS.flat())];
  console.log(
    `\nfirst leak with only one kind at full size, over the slug's (toll now in brackets)`,
  );
  console.log(`plot         ${kinds.map((k) => k.padStart(8)).join('')}`);
  const ratios = new Map<PestKind, number[]>();
  for (const [p, def] of PLOTS.entries()) {
    const at = new Map<PestKind, number>();
    for (const k of kinds) {
      if (!NIGHTS[p].includes(k)) continue;
      // Scale x back to toll 1, so the ratio measures the kind and not the toll already set.
      at.set(k, bisect((x) => play(p, x, k).leaks > 0, 0.02, 4) * KIND_TOLL[k]);
    }
    const slug = at.get('slug')!;
    const row = kinds.map((k) => {
      const r = (at.get(k) ?? NaN) / slug;
      if (Number.isFinite(r)) ratios.set(k, [...(ratios.get(k) ?? []), r]);
      return f(r).padStart(8);
    });
    console.log(`${def.id.padEnd(12)} ${row.join('')}`);
  }
  const geo = (xs: number[]) => Math.exp(xs.reduce((s, x) => s + Math.log(x), 0) / xs.length);
  console.log(
    `toll         ${kinds.map((k) => (ratios.get(k) ? geo(ratios.get(k)!).toFixed(2) : '—').padStart(8)).join('')}`,
  );
  console.log(
    `             ${kinds.map((k) => `(${KIND_TOLL[k].toFixed(2)})`.padStart(8)).join('')}`,
  );
}
