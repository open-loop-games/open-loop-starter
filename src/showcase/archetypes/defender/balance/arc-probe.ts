/**
 * Arc probe — plays the shipping game through every plot under the reference
 * gardener (`_gardener.ts`), prints when each beat fired, then diffs every
 * wave against the spine. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/defender/balance/arc-probe.ts [-- --no-early] [--set anchor=value]
 *
 * `--no-early` stops the gardener calling it a day, so every wave waits out
 * its build timer. `--set thrushCost=60` pushes an override on the tuning
 * registry rather than editing source. Each plot gets up to three attempts.
 */
import { Decimal, runUntil, type Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  PLOTS,
  committedValue,
  effectivePressure,
  exposure,
  pressure,
  waveHp,
  waveWindow,
  type PlantId,
} from '../data';
import {
  DefenderTuningRegistryKey,
  createDefenderModules,
  getGarden,
  getPlot,
  type PlotRun,
} from '../modules';
import { spendNotes, tendPlot } from './_gardener';

const callEarly = !process.argv.includes('--no-early');
const MAX_ATTEMPTS = 3;
const TICK_DELTA = 0.05;

const engine: Engine = bootTestEngine({
  modules: [...sharedBase, ...createDefenderModules()],
  persistenceNamespacePrefix: 'defender-arc',
}).engine;
const garden = getGarden();
const plot = getPlot();

const sets = process.argv.flatMap((arg, i) => (arg === '--set' ? [process.argv[i + 1]] : []));
if (sets.length > 0) {
  const overrides = Object.fromEntries(
    sets.map((kv) => {
      const [k, v] = kv.split('=');
      return [`spine/${k}`, () => Number(v)];
    }),
  );
  engine.tryInject(DefenderTuningRegistryKey)!.pushOverrides('probe', overrides);
}

const num = (v: unknown) => new Decimal(v as never).toNumber();
let clock = 0; // sim seconds across the whole arc, up to the start of the current plot
let current: PlotRun | null = null;
const beats: string[] = [];
const beat = (msg: string) => beats.push(`${fmtTime(clock + (current?.elapsed ?? 0))}  ${msg}`);
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(3, ' ')}m${String(Math.floor(s % 60)).padStart(2, '0')}s`;
}

let firstPurchase = false;
const onBuy = (what: string) => {
  if (firstPurchase) return;
  firstPurchase = true;
  beat(`first purchase: ${what}`);
};

const LESSON_ORDER = ['well-fed', 'bins', 'perches', 'cloches', 'early-riser'];
let lastLevel = garden.level.value;
const learned = new Set<PlantId>(
  (['hedge', 'thrush', 'trap', 'marigold', 'ladybird'] as PlantId[]).filter(garden.isPlantUnlocked),
);
const diffs: string[] = [];

for (const [pi, def] of PLOTS.entries()) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (!garden.plots.isUnlocked(def.id)) break;
    spendNotes(garden);
    const lv = (id: string) => num(garden.lessons.getPurchasable(id)!.count.value);
    const run = plot.startPlot(def.id);
    current = run;
    const a = garden.anchors.value;
    beat(
      `enter ${def.displayName} (attempt ${attempt}) — almanac ${LESSON_ORDER.map(lv).join('/')}, ` +
        `pressure ${pressure(a, pi).toFixed(2)} → effective ${effectivePressure(a, pi, lv('well-fed'), lv('bins')).toFixed(2)}`,
    );
    let waveStart = 0;
    run.on((e) => {
      if (e.type === 'build') tendPlot(garden, plot, run, { callEarly, onBuy });
      if (e.type === 'launch') waveStart = run.elapsed;
      if (
        e.type === 'cleared' &&
        (e.wave === 1 || e.wave % 5 === 0 || e.leaks > 0 || e.wave === run.totalWaves)
      ) {
        beat(
          `${def.displayName} wave ${e.wave} cleared (${e.leaks} leaks, ${Math.round(run.elapsed - waveStart)}s, ` +
            `kill depth ${run.waveLogs.at(-1)?.killDepth.toFixed(2)})`,
        );
      }
      if (e.type === 'end') {
        beat(
          `${def.displayName} ${e.outcome === 'won' ? 'HELD' : 'LOST'} — score ${e.score}, seedlings ${num(plot.seedlings.value)}`,
        );
      }
    });
    tendPlot(garden, plot, run, { callEarly, onBuy }); // the first build phase opened before the listener attached
    const res = runUntil({
      engine,
      until: () => run.phase === 'won' || run.phase === 'lost',
      maxSimTime: 3600,
      tickDelta: TICK_DELTA,
    });
    current = null;
    clock += res.elapsedSimulated;
    if (res.terminated !== 'predicate')
      beat(`!! ${def.displayName} STALLED in phase ${run.phase} at wave ${run.wave}`);

    for (const l of run.waveLogs) {
      const predicted = committedValue(a, l.wave);
      const measured = l.boardValue + l.heldCompost;
      diffs.push(
        [
          def.id.padEnd(11),
          String(attempt),
          String(l.wave).padStart(3),
          predicted.toFixed(0).padStart(7),
          measured.toFixed(0).padStart(7),
          (measured / predicted).toFixed(2).padStart(6),
          waveHp(a, pi, l.wave).toFixed(0).padStart(7),
          l.hpPool.toFixed(0).padStart(7),
          l.killDepth.toFixed(2).padStart(6),
          (l.dps / (committedValue(a, l.wave) * a.damageShare * (a.thrushDps / a.thrushCost)))
            .toFixed(2)
            .padStart(6),
          l.utilization.toFixed(2).padStart(5),
          l.exposure.toFixed(1).padStart(5),
          `${l.kills}/${l.pests}`.padStart(6),
          String(l.leaks).padStart(4),
          String(l.pathLength).padStart(5),
          waveWindow(a, l.wave).toFixed(1).padStart(6),
          l.duration.toFixed(1).padStart(6),
          String(l.reservedSkips).padStart(6),
        ].join(' '),
      );
    }
    plot.leavePlot();
    if (garden.level.value !== lastLevel) {
      beat(
        `gardener level ${lastLevel} → ${garden.level.value} (xp ${garden.xp.value}, notes +${garden.level.value - lastLevel})`,
      );
      lastLevel = garden.level.value;
    }
    for (const id of ['trap', 'marigold', 'ladybird'] as PlantId[]) {
      if (!learned.has(id) && garden.isPlantUnlocked(id)) {
        learned.add(id);
        beat(`learned: ${id}`);
      }
    }
    const next = PLOTS[pi + 1];
    if (next && garden.plots.isUnlocked(next.id) && run.phase === 'won')
      beat(`plot opened: ${next.displayName}`);
    if (run.phase === 'won') break;
  }
}

const a = garden.anchors.value;
console.log(
  `Walled Garden arc probe — reference gardener, early calls ${callEarly ? 'on' : 'off'}, tickDelta ${TICK_DELTA}, ` +
    `deterministic (1 run)${sets.length ? ', overrides ' + sets.join(' ') : ''}\n`,
);
console.log('BEATS');
for (const b of beats) console.log('  ' + b);
console.log(
  '\nSPINE DIFF  (value = compost committed at launch; depth = mean route fraction walked at death; window = predicted, dur = measured seconds)',
);
console.log(
  `  spine anchors: exposure ${exposure(a).toFixed(2)}s per range circle, utilization ${a.utilization}; ` +
    `D/Dref = launch DPS over the spine's reference thrushes`,
);
console.log(
  '  plot        # wave  V pred  V meas  ratio  W pred  W real  depth  D/Dref  util  expo  kills leak path window    dur  rsvSk',
);
for (const d of diffs) console.log('  ' + d);
console.log(
  `\nfinal: gardener level ${garden.level.value}, xp ${garden.xp.value}, held [${garden.held.value.join(', ')}]`,
);
if (diffs.some((d) => d.includes('NaN'))) console.log('!! NaN in wave logs');
engine.dispose();
