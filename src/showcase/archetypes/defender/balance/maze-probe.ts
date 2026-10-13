/**
 * Maze probe — how long a maze each plot's beds allow, and how deep the
 * walk-greedy search must look to find it. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/defender/balance/maze-probe.ts
 *
 * From a bare plot with unlimited compost, it lays hedge runs from the
 * reference gardener's own search (`_gardener.ts` `bestRun`, scoring route
 * length alone) until none lengthens the route. It does so at each lookahead
 * depth, and prints the final route as a multiple of the bare one, with the
 * hedges it took. `LOOKAHEAD` in `_gardener.ts` is the smallest depth no plot
 * improves past. The method is td-arcade's (`walk.rs`, `--mode maze-max`).
 */
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { PLOTS } from '../data';
import { createDefenderModules, getGarden, getPlot } from '../modules';
import { bestRun } from './_gardener';

const DEPTHS = [1, 2, 3, 4, 6, 8, 10, 12];

console.log('Walled Garden maze probe — route multiple of the bare plot (hedges laid)\n');
console.log(`| depth | ${PLOTS.map((p) => p.id).join(' | ')} |`);
console.log(`|---|${PLOTS.map(() => '---').join('|')}|`);
for (const depth of DEPTHS) {
  const cols: string[] = [];
  for (const def of PLOTS) {
    const handle = bootTestEngine({
      modules: [...sharedBase, ...createDefenderModules()],
      persistenceNamespacePrefix: 'defender-maze',
    });
    const garden = getGarden();
    for (const d of PLOTS) garden.plots.unlock(d.id);
    const plot = getPlot();
    const run = plot.startPlot(def.id);
    plot.compost.value = 1e6;
    const bare = run.route().length - 1;
    let hedges = 0;
    for (let guard = 0; guard < 200; guard++) {
      const found = bestRun(run, (r) => r.length, depth);
      if (!found) break;
      for (const c of found.picks) run.plant('hedge', c.x, c.y);
      hedges += found.picks.length;
    }
    cols.push(`×${((run.route().length - 1) / bare).toFixed(2)} (${hedges})`);
    handle.dispose();
  }
  console.log(`| ${depth} | ${cols.join(' | ')} |`);
}
