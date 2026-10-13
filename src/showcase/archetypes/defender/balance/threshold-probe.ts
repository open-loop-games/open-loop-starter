/**
 * Threshold probe — finds, plot by plot, the wave size at which the reference
 * gardener stops holding: the measurement `land` is set from. Prints; never
 * asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/defender/balance/threshold-probe.ts
 *
 * Each plot runs alone from a fresh engine with no almanac, every wave sized
 * `x · capacity` (pressure 1 in every plot, `land = x`). It bisects `x` for two
 * thresholds:
 * - `first leak`: the smallest `x` at which any pest reaches the seedbed;
 * - `lost`: the smallest `x` at which the seedbed is eaten.
 * The response is monotone for this gardener in practice, not by proof; a
 * bracket that does not close is printed as such.
 */
import { runUntil } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { PLOTS } from '../data';
import { DefenderTuningRegistryKey, createDefenderModules, getGarden, getPlot } from '../modules';
import { tendPlot } from './_gardener';

const STEPS = 9;

/** Leaks over the plot, and whether it held, with every wave sized `x · capacity`. */
function play(p: number, x: number): { leaks: number; held: boolean } {
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
  const run = plot.startPlot(PLOTS[p].id);
  run.on((e) => {
    if (e.type === 'build') tendPlot(garden, plot, run, { callEarly: true });
  });
  tendPlot(garden, plot, run, { callEarly: true });
  runUntil({
    engine,
    until: () => run.phase === 'won' || run.phase === 'lost',
    maxSimTime: 3600,
    tickDelta: 0.05,
  });
  const leaks = run.waveLogs.reduce((s, l) => s + l.leaks, 0);
  const held = run.phase === 'won';
  handle.dispose();
  return { leaks, held };
}

/** The smallest `x` in [lo, hi] at which `fails` holds, by bisection. */
function bisect(
  p: number,
  fails: (r: { leaks: number; held: boolean }) => boolean,
  lo: number,
  hi: number,
) {
  if (fails(play(p, lo))) return `≤ ${lo}`;
  if (!fails(play(p, hi))) return `> ${hi}`;
  for (let i = 0; i < STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (fails(play(p, mid))) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2).toFixed(3);
}

console.log(
  'Walled Garden threshold probe — reference gardener, no almanac, pressure 1, land = x\n',
);
console.log('plot          first leak    lost');
for (const [p, def] of PLOTS.entries()) {
  const leak = bisect(p, (r) => r.leaks > 0, 0.02, 2);
  const lost = bisect(p, (r) => !r.held, 0.02, 2);
  console.log(`${def.id.padEnd(12)} ${leak.padStart(11)} ${lost.padStart(7)}`);
}
