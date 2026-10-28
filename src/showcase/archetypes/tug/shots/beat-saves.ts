/**
 * Beat saves for the studio games site: plays the shipping game under the career probe's
 * reference marshal (seed 1, the run `manifest.ts` records) and writes one save per beat.
 * The games site's capture driver seeds each save into the gallery's live demo and shoots
 * it (see the root `game.json`'s tug card).
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/tug/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { seedRNG } from '@open-loop/engine';
import { FIELDS } from '../data';
import { createTugEngine } from '../engine';
import { DT, clock, marshalBetweenBattles, seatMarshal, wrapGame } from '../balance/_marshal';

const SEED = 1;
const MAX_BATTLES = 20;
const MAX_SECONDS = 900;

// Seeded as the career probe seeds it: 0 at boot, then the run's seed.
seedRNG(0);
const { engine } = createTugEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // the loop below drives the ticks
seedRNG(SEED);
const g = wrapGame(engine, () => engine.dispose());
seatMarshal(g);

const field = (name: string) => FIELDS.findIndex((f) => f.name === name);
const onField = (name: string) => g.chronicle.rung.value === field(name);
const has = (troop: string) => g.causeway.members.value.some((m) => m.troop === troop);

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  // Grubb's Ford, the first battle: yeomen against yeomen, the line pinned under our cover.
  { file: '1-ford', at: () => onField('Grubb’s Ford') && g.causeway.clock.value >= 40 },
  // The Mudhole, bowmen on both sides: the line held past the middle, a mangonel throwing.
  {
    file: '2-mudhole',
    at: () => onField('the Mudhole') && has('bow') && g.keeps.rival.gateDamage.value >= 500,
  },
  // Camp after the Counting-House, Dunmarrow's keep, falls: Lady Vesk's march is next.
  {
    file: '3-chronicle',
    at: () => g.battle.phase.value === 'camp' && onField('Watch Hill'),
  },
];

const dir = import.meta.dirname;
let next = 0;
let session = 0;
const check = () => {
  if (next < BEATS.length && BEATS[next]!.at()) {
    const { file } = BEATS[next]!;
    writeFileSync(join(dir, `${file}.save`), engine.saveManager!.exportSave() + '\n');
    console.log(`${file} at ${clock(session)} (battle clock ${clock(g.causeway.clock.value)})`);
    next++;
  }
};
for (let b = 0; b < MAX_BATTLES && next < BEATS.length; b++) {
  const before = g.chronicle.battles.value;
  g.battle.start();
  for (let t = 0; t < MAX_SECONDS && g.chronicle.battles.value === before; t += DT) {
    engine.tickDriver.advanceTime(DT);
    session += DT;
    if (g.battle.phase.value === 'battle') check();
  }
  marshalBetweenBattles(g.chronicle); // camp beats are saved with the boons bought
  check();
}
if (next < BEATS.length) throw new Error(`stopped before beat ${BEATS[next]!.file}`);
g.dispose();
