/**
 * Beat saves for the studio games site: plays the shipping game under the
 * arc probe's reference player and writes one save per beat. The games site's
 * capture driver seeds each save into the gallery's live demo and shoots it
 * (see the root `game.json`'s producer card).
 *
 * A reload replays time away only once the night bookkeeper is hired, and the
 * reference player never hires it, so a save reloads onto the moment it was
 * written.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/producer/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Decimal, seedRNG } from '@open-loop/engine';
import { createProducerEngine } from '../engine';
import { getAutomation, getFirm, getOffline } from '../modules';
import { createReferencePlayer } from '../balance/_player';

const STEP = 1;
const MAX_SIM = 5 * 3600;
const SEED = 1;

seedRNG(SEED); // the tip clock and its draws, as the arc probe seeds them
const { engine } = createProducerEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // the loop below drives the ticks

const firm = getFirm();
const automation = getAutomation();
const offline = getOffline();
const player = createReferencePlayer(engine, { dt: STEP, seed: SEED });
const bank = firm.subsidiaries.getAll().find((e) => e.def.id === 'bank')!;

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  { file: '1-sales-desk', at: () => automation.working('sales-desk') },
  { file: '2-savings-bank', at: () => Decimal.fromValue(bank.producer.ownedCount.value).gte(1) },
  { file: '3-building', at: () => firm.ending.visible.value },
];

const dir = import.meta.dirname;
let next = 0;
for (let sim = 0; sim < MAX_SIM && next < BEATS.length; sim += STEP) {
  player.step();
  engine.tickDriver.processInterval(STEP);
  if (BEATS[next]!.at()) {
    const { file } = BEATS[next]!;
    if (offline.bookkeeper.active.value)
      throw new Error(`${file}: a reload would replay time away`);
    writeFileSync(join(dir, `${file}.save`), engine.saveManager!.exportSave() + '\n');
    console.log(`${file} at sim ${sim + STEP}s`);
    next++;
  }
}
if (next < BEATS.length) throw new Error(`stopped before beat ${BEATS[next]!.file}`);
engine.dispose();
