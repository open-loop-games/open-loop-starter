/**
 * Beat saves for the studio games site: plays the shipping game as the career probe does,
 * the stars improvising and the reference agent shopping between takes (`../balance/_set.ts`),
 * and writes one save per beat. The games site's capture driver seeds each save into the
 * gallery's live demo and shoots it (see the root `game.json`'s survivor card).
 *
 * A take is never resumed from a save, so every beat falls between takes and reloads onto
 * the call sheet; a shot of the floor starts a take from there.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/survivor/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { seedRNG } from '@open-loop/engine';
import { createSurvivorEngine } from '../engine';
import { SurvivorTuningRegistryKey, getMeta, getTake } from '../modules';
import { callSheet, clock, playTake, shop, type Set } from '../balance/_set';

/** The career probe's seed 1, whose firsts `manifest.ts` records. */
const SEED = 1;
const MAX_TAKES = 18;

const { engine } = createSurvivorEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // playTake drives the ticks
seedRNG(SEED);
const set: Set = {
  engine,
  take: getTake(),
  meta: getMeta(),
  tuning: engine.tryInject(SurvivorTuningRegistryKey)!,
  dispose: () => engine.dispose(),
};
const open = (id: string) => set.meta.ratings.getPurchasable(id)?.active.value === true;

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  { file: '1-pyro', at: () => set.meta.stars.getPurchasable('pyro')?.active.value === true },
  { file: '2-pg', at: () => open('pg') },
  { file: '3-pg13', at: () => open('pg13') },
];

const dir = import.meta.dirname;
let next = 0;
let session = 0;
for (let n = 0; n < MAX_TAKES && next < BEATS.length; n++) {
  const sheet = callSheet(set);
  const star = sheet.stars[n % sheet.stars.length]!;
  session += playTake(set, { star, rating: sheet.rating, seed: SEED * 1000 + n }).seconds;
  shop(set);
  if (BEATS[next]!.at()) {
    const { file } = BEATS[next]!;
    writeFileSync(join(dir, `${file}.save`), engine.saveManager!.exportSave() + '\n');
    console.log(`${file} after take ${n + 1}, session ${clock(session)}`);
    next++;
  }
}
if (next < BEATS.length) throw new Error(`stopped before beat ${BEATS[next]!.file}`);
set.dispose();
