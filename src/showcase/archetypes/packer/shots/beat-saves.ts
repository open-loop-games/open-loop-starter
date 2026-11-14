/**
 * Beat saves for the studio games site: plays the shipping game under the
 * arc probe's reference fitter and writes one save per beat. The games site's
 * capture driver seeds each save into the gallery's live demo and shoots it
 * (see the root `game.json`'s packer card).
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/packer/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runUntil } from '@open-loop/engine';
import { formatClock } from '@/composables/useFormatting';
import { CARRIERS } from '../data';
import { createPackerEngine } from '../engine';
import { getFleet, getLine, getYard } from '../modules';
import { DT, seatFitter } from '../balance/_fitter';

const MAX_SIM = 4 * 3600;
const BREACH_MOTHER = CARRIERS.findIndex((c) => c.id === 'carrier:breach-mother') + 1;

const { engine } = createPackerEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // runUntil below drives the ticks

const yard = getYard();
const fleet = getFleet();
const line = getLine();

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  { file: '1-railgun', at: () => yard.unlocked('rail') },
  { file: '2-breach-line', at: () => fleet.lineOpen.value },
  { file: '3-breach-mother', at: () => fleet.authoredFallen.value >= BREACH_MOTHER },
];

const dir = import.meta.dirname;
let next = 0;
const unseat = seatFitter(engine);
try {
  runUntil({
    engine,
    tickDelta: DT,
    maxSimTime: MAX_SIM,
    until: ({ iteration, simTime }) => {
      // An engagement is not saved, so a beat waits until none is running.
      if (iteration > 0 && !line.engagement.value && BEATS[next]!.at()) {
        const { file } = BEATS[next]!;
        writeFileSync(join(dir, `${file}.save`), engine.saveManager!.exportSave() + '\n');
        console.log(`${file} at ${formatClock(simTime)} of play`);
        next++;
      }
      return next === BEATS.length;
    },
  });
} finally {
  unseat();
}
if (next < BEATS.length) throw new Error(`stopped before beat ${BEATS[next]!.file}`);
engine.dispose();
