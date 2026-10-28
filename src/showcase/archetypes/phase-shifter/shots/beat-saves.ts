/**
 * Beat saves for the studio games site: plays the shipping game under the
 * arc probe's reference player and writes one save per beat. The games site's
 * capture driver seeds each save into the gallery's live demo and shoots it
 * (see the root `game.json`'s phase-shifter card).
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/phase-shifter/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Decimal } from '@open-loop/engine';
import { createPhaseShifterEngine } from '../engine';
import { getBoard, getBox, getNight } from '../modules';
import { createReferencePlayer } from '../balance/_player';

const WALL_STEP = 0.5;
const MAX_WALL = 3600;

const { engine } = createPhaseShifterEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // the loop below drives the ticks

const box = getBox();
const board = getBoard();
const night = getNight();
const player = createReferencePlayer(WALL_STEP);

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  { file: '1-box', at: () => new Decimal(box.clerk.count.value).gte(8) },
  {
    file: '2-board',
    at: () => board.side.value >= 4 && board.pins.value.filter(Boolean).length >= 12,
  },
  { file: '3-night', at: () => night.held.value.length >= 2 },
];

const dir = import.meta.dirname;
let next = 0;
for (let wall = 0; wall < MAX_WALL && next < BEATS.length; wall += WALL_STEP) {
  player.step();
  engine.tickDriver.processInterval(WALL_STEP);
  if (BEATS[next]!.at()) {
    const { file } = BEATS[next]!;
    writeFileSync(join(dir, `${file}.save`), engine.saveManager!.exportSave() + '\n');
    console.log(`${file} at wall ${wall}s`);
    next++;
  }
}
if (next < BEATS.length) throw new Error(`stopped before beat ${BEATS[next]!.file}`);
engine.dispose();
