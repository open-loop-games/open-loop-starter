/**
 * Beat saves for the studio games site: plays the shipping game under the
 * arc probe's reference player and writes one save per beat. The games site's
 * capture driver seeds each save into the gallery's live demo and shoots it
 * (see the root `game.json`'s scaler card).
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/scaler/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Decimal, runUntil } from '@open-loop/engine';
import { createScalerEngine } from '../engine';
import {
  createReferencePlayer,
  getAutomation,
  getContinuity,
  getCore,
  getLegacy,
  getPrestige,
  getRun,
} from '../modules';
import { DT, seatReferencePlayer } from '../balance/_engine';

const MAX_SIM = 7200;

const { engine } = createScalerEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // runUntil below drives the ticks

const core = getCore();
const run = getRun();
const prestige = getPrestige();
const player = createReferencePlayer({
  core,
  run,
  legacy: getLegacy(),
  continuity: getContinuity(),
  prestige,
  automation: getAutomation(),
});
const t = () => core.playSeconds.value;
const inElseworld = (id: string) => prestige.elseworlds.current.value?.id === id;
let enteredAt = Infinity;
let agedAt = Infinity;

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  // The first timeline, with its first Legacy pending on the Reboot card.
  {
    file: '1-corps',
    at: () => core.reboots.value === 0 && Decimal.gte(prestige.pendingLegacy.value, 1),
  },
  // A minute into Villain Uprising, the first Elseworld the Rewrites opened.
  { file: '2-elseworld', at: () => inElseworld('villain-uprising') && t() - enteredAt >= 60 },
  // Two minutes into the Silver Age, mid-timeline: the Succession Plan reboots every
  // half minute, so the corps has rebuilt and the next Reboot is a quarter minute off.
  {
    file: '3-age',
    at: () => core.ages.value >= 1 && t() - agedAt >= 120 && run.runSeconds.value >= 12,
  },
];

const dir = import.meta.dirname;
let next = 0;
/** Saves the next beat when its moment holds. It reads and exports; it writes no game state. */
function saveBeat(): void {
  if (next === BEATS.length) return;
  if (inElseworld('villain-uprising') && enteredAt === Infinity) enteredAt = t();
  if (core.ages.value >= 1 && agedAt === Infinity) agedAt = t();
  if (!BEATS[next]!.at()) return;
  const { file } = BEATS[next]!;
  writeFileSync(join(dir, `${file}.save`), engine.saveManager!.exportSave() + '\n');
  console.log(
    `${file} at sim ${t().toFixed(1)}s, run ${run.runSeconds.value.toFixed(1)}s, reboots ${core.reboots.value}, rewrites ${core.rewrites.value}, ages ${core.ages.value}`,
  );
  next++;
}

// The opening turn, before any tick: the seat's first turn is inside the first tick.
player.turn();
// The beat reader goes before the seat, so it reads after the modules and before the turn.
// 1-corps needs that: the player reboots in the turn its first Legacy comes pending.
const unread = engine.tickDriver.onTick(saveBeat);
const unseat = seatReferencePlayer(engine, player);
try {
  runUntil({
    engine,
    tickDelta: DT,
    maxSimTime: MAX_SIM,
    until: () => next === BEATS.length,
  });
} finally {
  unseat();
  unread();
}
if (next < BEATS.length) throw new Error(`stopped before beat ${BEATS[next]!.file}`);
engine.dispose();
