/**
 * Tail probe — how deep into the dark the reference gardener gets on each plot:
 * the measurement `tailDivergence` is derived against. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/defender/balance/tail-probe.ts [-- --set anchor=value]
 *
 * It plays the arc as `arc-probe.ts` does, but at each plot's hold it goes on
 * into the dark, and the run ends when the seedbed is eaten. Per plot it
 * prints the almanac's effective pressure on the way in, the depth (nights
 * seen off past the last), the night the first leak came on and its kind, the
 * seconds spent in the dark, and the score they added. Each plot is played
 * once; the next opens at the hold whatever the dark does.
 *
 * The derivation is td-arcade's (`map/format.rs` `FinalWaveSpec::hp_growth`):
 * with a margin `m` entering the dark and a target depth `D`, a first probe is
 * `δ = m^(1/D)`, then one sweep and one correction.
 */
import { Decimal, runUntil } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { PLOTS, effectivePressure } from '../data';
import { DefenderTuningRegistryKey, createDefenderModules, getGarden, getPlot } from '../modules';
import { spendNotes, tendPlot } from './_gardener';

/** Nights past the last before the probe stops a run that has not fallen. */
const MAX_DEPTH = 60;

const engine = bootTestEngine({
  modules: [...sharedBase, ...createDefenderModules()],
  persistenceNamespacePrefix: 'defender-tail',
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

const a = garden.anchors.value;
console.log(
  `Walled Garden tail probe — reference gardener, early calls on, tailDivergence ${a.tailDivergence}` +
    `${sets.length ? ', overrides ' + sets.join(' ') : ''}\n`,
);
console.log('plot          p_eff  depth  first leak   dark s  dark score  ended');
for (const [pi, def] of PLOTS.entries()) {
  if (!garden.plots.isUnlocked(def.id)) break;
  spendNotes(garden);
  const lv = (id: string) => num(garden.lessons.getPurchasable(id)!.count.value);
  const pEff = effectivePressure(a, pi, lv('well-fed'), lv('bins'), lv('early-riser'));
  const run = plot.startPlot(def.id);
  let darkFrom = 0;
  let heldScore = 0;
  let firstLeak = '—';
  run.on((e) => {
    if (e.type === 'build') tendPlot(garden, plot, run, { callEarly: true });
    if (e.type === 'held') {
      darkFrom = run.elapsed;
      heldScore = e.score;
      run.goOn();
    }
    if (e.type === 'leak' && run.tail && firstLeak === '—')
      firstLeak = `+${run.wave - run.totalWaves} ${e.kind}`;
  });
  tendPlot(garden, plot, run, { callEarly: true });
  runUntil({
    engine,
    until: () => run.phase === 'won' || run.phase === 'lost' || run.depth >= MAX_DEPTH,
    maxSimTime: 36_000,
    tickDelta: 0.05,
  });
  const ended = run.phase === 'lost' ? (run.tail ? 'fell' : 'LOST before the dark') : 'cap';
  console.log(
    [
      def.id.padEnd(12),
      pEff.toFixed(2).padStart(6),
      String(run.depth).padStart(6),
      firstLeak.padStart(11),
      (run.tail ? run.elapsed - darkFrom : 0).toFixed(0).padStart(8),
      String(run.tail ? run.score - heldScore : 0).padStart(11),
      ` ${ended}`,
    ].join(' '),
  );
  plot.leavePlot();
}
console.log(`\nfinal: gardener level ${garden.level.value}, xp ${garden.xp.value}`);
engine.dispose();
