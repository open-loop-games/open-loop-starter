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
import { Decimal, runUntil, seedRNG } from '@open-loop/engine';
import { formatClock } from '@/composables/useFormatting';
import { createProducerEngine } from '../engine';
import { getAutomation, getFirm, getOffline } from '../modules';
import { createReferencePlayer, seatPlayer } from '../balance/_player';

/** Game seconds per runner step, and between the player's turns. */
const STEP = 1;
const MAX_SECONDS = 5 * 3600;
const SEED = 1;

seedRNG(SEED); // the tip clock and its draws, as the arc probe seeds them
const { engine } = createProducerEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // runUntil below drives the ticks

const firm = getFirm();
const automation = getAutomation();
const offline = getOffline();
const bank = firm.subsidiaries.getAll().find((e) => e.def.id === 'bank')!;

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  { file: '1-sales-desk', at: () => automation.working('sales-desk') },
  { file: '2-savings-bank', at: () => Decimal.fromValue(bank.producer.ownedCount.value).gte(1) },
  { file: '3-building', at: () => firm.ending.visible.value },
];

const dir = import.meta.dirname;
let next = 0;
let played = 0;
const player = createReferencePlayer(engine, { every: STEP, seed: SEED });
player.turn(); // the opening turn, before the first tick; the seat's turn closes each tick after
// The saver reads after the modules' tick and before the player's turn, so each save holds
// the state the turn acts on. It is registered before the seat for that reason.
const unsave = engine.tickDriver.onTick((dt) => {
  played += dt;
  if (next === BEATS.length || !BEATS[next]!.at()) return;
  const { file } = BEATS[next]!;
  if (offline.bookkeeper.active.value) throw new Error(`${file}: a reload would replay time away`);
  writeFileSync(join(dir, `${file}.save`), engine.saveManager!.exportSave() + '\n');
  console.log(`${file} at ${formatClock(played)} of play`);
  next++;
});
const unseat = seatPlayer(engine, player);
try {
  runUntil({
    engine,
    tickDelta: STEP,
    maxSimTime: MAX_SECONDS,
    until: () => next === BEATS.length,
  });
} finally {
  unseat();
  unsave();
}
if (next < BEATS.length) throw new Error(`stopped before beat ${BEATS[next]!.file}`);
engine.dispose();
