/**
 * Beat saves for the studio games site: plays the shipping game under the
 * arc probe's walker and writes one save per beat. The games site's capture
 * driver seeds each save into the gallery's live demo and shoots it (see the
 * root `game.json`'s explorer card).
 *
 * Each save waits past its beat for the huntsman to stand idle at the lodge or
 * a camp before the walker's turn: the notes are banked, and nothing walks on
 * the reloaded screen.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/explorer/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runUntil, seedRNG } from '@open-loop/engine';
import { createExplorerEngine } from '../engine';
import { getChronicle, getHuntsman, getWold } from '../modules';
import { DT } from '../balance/_engine';
import { seatWalker } from '../balance/_walker';

/** The arc probe's fastest default seed. */
const SEED = 11;
const MAX_SIM = 3600;

const { engine } = createExplorerEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // runUntil below drives the ticks
seedRNG(SEED);

const chronicle = getChronicle();
const man = getHuntsman();
const wold = getWold();

const fired = (label: string) => chronicle.beats.value.some((b) => b.label === label);
const calm = () => man.action.value === 'idle' && wold.isRestock(man.pos.value.x, man.pos.value.y);

/** In beat order: the file stem, and the beat it is saved after. */
const BEATS: { file: string; beat: string }[] = [
  { file: '1-camp', beat: 'camp 1' },
  { file: '2-coracle', beat: 'trophy coracle' },
  { file: '3-deepwood', beat: 'enter band 4' },
];

const dir = import.meta.dirname;
let next = 0;
let pending: string | null = null;
// Registered before the seat, so it reads each tick after the modules and before the walker's
// turn. Once jerky is plentiful the walker leaves a restock point in the turn it arrives, so
// after its turn the huntsman is seldom calm.
const offRead = engine.tickDriver.onTick(() => {
  if (pending === null && next < BEATS.length && fired(BEATS[next]!.beat) && calm())
    pending = engine.saveManager!.exportSave();
});
const unseat = seatWalker(engine);
try {
  runUntil({
    engine,
    tickDelta: DT,
    maxSimTime: MAX_SIM,
    until: ({ simTime }) => {
      if (pending !== null) {
        const { file, beat } = BEATS[next]!;
        writeFileSync(join(dir, `${file}.save`), pending + '\n');
        const at = chronicle.beats.value.find((b) => b.label === beat)!.at;
        console.log(`${file}: '${beat}' at ${at}s, saved at sim ${simTime}s`);
        pending = null;
        next++;
      }
      return next === BEATS.length;
    },
  });
} finally {
  unseat();
  offRead();
}
if (next < BEATS.length) throw new Error(`stopped before beat ${BEATS[next]!.file}`);
engine.dispose();
