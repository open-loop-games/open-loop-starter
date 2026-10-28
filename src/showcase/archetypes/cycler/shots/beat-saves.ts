/**
 * Beat saves for the studio games site: plays the shipping game's first watch under the
 * reference keeper and writes one save per beat. The games site's capture driver seeds each
 * save into the gallery's live demo and shoots it (see the root `game.json`'s cycler card).
 *
 * Seed 1 is the watch probe's, so the beats fall on the nights `balance/watch-probe.ts`
 * prints. Each save is taken with time left in its phase, so the reloaded screen holds
 * through the capture's render wait.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/cycler/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { seedRNG, toNumber } from '@open-loop/engine';
import { createCyclerEngine } from '../engine';
import { getWatch } from '../modules';
import { DT, REFERENCE_POLICY, keeperDay, keeperNight } from '../balance/_keeper';

const SEED = 1;
const MAX_SECONDS = 3600;

const { engine } = createCyclerEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // the loop below drives the ticks
seedRNG(SEED);

const watch = getWatch();
watch.openFirstWatch();

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  {
    // The first spray forecast, late in the day: screens stand behind the struck side.
    file: '1-spray',
    at: () =>
      watch.phase.value === 'day' &&
      watch.kind.value === 'spray' &&
      watch.home.value &&
      watch.placed.value.some((p) => p.kind === 'screen') &&
      watch.clock.value >= 90,
  },
  {
    // The first night the storm comes through the walls: halfway through, the tower taking water.
    file: '2-crossing',
    at: () =>
      watch.phase.value === 'night' &&
      watch.struck.value * 2 >= watch.breakers.value &&
      toNumber(watch.integrity.value) < 0.8 * watch.integrityMax.value,
  },
  // The light has gone out: the logbook's page, before anything is bought from it.
  { file: '3-logbook', at: () => watch.phase.value === 'setup' && watch.cycle.count.value >= 1 },
];

const dir = import.meta.dirname;
let next = 0;
for (let t = 0; t < MAX_SECONDS && next < BEATS.length; t += DT) {
  engine.tickDriver.processInterval(DT);
  if (watch.phase.value === 'day') keeperDay(watch, REFERENCE_POLICY);
  if (watch.phase.value === 'night') keeperNight(watch, REFERENCE_POLICY);
  if (BEATS[next]!.at()) {
    const { file } = BEATS[next]!;
    writeFileSync(join(dir, `${file}.save`), engine.saveManager!.exportSave() + '\n');
    console.log(`${file} at ${t + DT}s, night ${watch.night.value} ${watch.phase.value}`);
    next++;
  }
}
if (next < BEATS.length) throw new Error(`stopped before beat ${BEATS[next]!.file}`);
engine.dispose();
