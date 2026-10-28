/**
 * Beat saves for the studio games site: plays the shipping game under the
 * arc probe's reference player and writes one save per beat. The games site's
 * capture driver seeds each save into the gallery's live demo and shoots it
 * (see the root `game.json`'s looper card).
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/looper/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Decimal } from '@open-loop/engine';
import { createLooperEngine } from '../engine';
import { getMeta, getNight } from '../modules';
import { DT } from '../balance/_engine';
import { createReferencePlayer } from '../balance/_player';

const MAX_SIM = 3600;

const { engine } = createLooperEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // the loop below drives the ticks

const meta = getMeta();
const night = getNight();
const player = createReferencePlayer();

/** The night-second the current night has run, or -1 between nights. */
const into = () => (night.nightActive.value ? night.cycle.elapsed.value : -1);
/** The night-second a moment fell tonight, or -1 before it does. */
let laundryAt = -1;
let rideAt = -1;

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  // Night 4, a few seconds into the laundry. Night 3 reaches it first, too near its last Nerve.
  {
    file: '1-laundry',
    at: () => night.cycle.count.value >= 3 && laundryAt >= 0 && into() >= laundryAt + 4,
  },
  // Night 9, the first night the milk truck pays out, a few seconds into the woods.
  { file: '2-woods', at: () => rideAt >= 0 && into() >= rideAt + 4 },
  // The night after the first escape, the same moment, far earlier on the night clock.
  { file: '3-freight', at: () => meta.escapes.value >= 1 && rideAt >= 0 && into() >= rideAt + 4 },
];

const dir = import.meta.dirname;
let next = 0;
player.begin();
for (let sim = 0; sim < MAX_SIM && next < BEATS.length; sim += DT) {
  const before = night.cycle.count.value;
  engine.tickDriver.processInterval(DT);
  if (night.cycle.count.value > before) {
    laundryAt = rideAt = -1;
    player.buy();
    player.replan();
  }
  if (night.nightActive.value) {
    if (laundryAt < 0 && night.depth.value >= 2) laundryAt = into();
    if (rideAt < 0 && night.actions.getState('ride')!.done.value > 0) rideAt = into();
  }
  if (BEATS[next]!.at()) {
    const { file } = BEATS[next]!;
    writeFileSync(join(dir, `${file}.save`), engine.saveManager!.exportSave() + '\n');
    console.log(
      `${file} at sim ${sim.toFixed(1)}s: night ${night.cycle.count.value + 1} at ${into().toFixed(1)}s, ${new Decimal(night.nerve.value).toFixed(1)} Nerve left`,
    );
    next++;
  }
}
if (next < BEATS.length) throw new Error(`stopped before beat ${BEATS[next]!.file}`);
engine.dispose();
