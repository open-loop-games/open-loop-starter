/**
 * Beat saves for the studio games site: plays the shipping game under the arc probe's
 * foreman and writes one save per beat. The games site's capture driver seeds each save
 * into the gallery's live demo and shoots it (see the root `game.json`'s interlocker
 * card).
 *
 * The foreman plays with the automation tiers forced to the top, which no player holds
 * before the bureaux are bought. So each save is written with the tiers re-locked to
 * the bureaux actually employed, and the foreman's tiers forced again after it.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/interlocker/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toNumber } from '@open-loop/engine';
import { createInterlockerEngine } from '../engine';
import { getAutomation, getEmpire, getExposition, getMinistry, getWorks } from '../modules';
import { DT, createForeman } from '../balance/_foreman';

const MAX_SIM = 3600;

const { engine } = createInterlockerEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // the loop below drives the ticks

const works = getWorks();
const empire = getEmpire();
const expo = getExposition();
const ministry = getMinistry();
const tiers = getAutomation().tiers;
const foreman = createForeman();
const planes = () => toNumber(works.res.aeroplanes.value as unknown as number);

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  // The first aeroplane is built in the winter of 1855, with the crew hungry; this is the
  // first moment of the run with one in the hangar and the crew fed.
  {
    file: '1-aeroplane',
    at: () => expo.cycle.count.value === 0 && planes() >= 1 && works.fed.value >= 1,
  },
  {
    file: '2-ministry',
    at: () => ministry.dossier.value > 0 && ministry.orders.value.length > 0,
  },
  { file: '3-contremaitre', at: () => empire.employs('seating').value && planes() >= 1 },
];

const dir = import.meta.dirname;
let next = 0;
for (let sim = 0; sim < MAX_SIM && next < BEATS.length;) {
  engine.tickDriver.processInterval(DT);
  sim += DT;
  if (Math.round(sim * 2) % 2 === 0) foreman.tend();
  if (foreman.ready()) foreman.stage();
  if (BEATS[next]!.at()) {
    const { file } = BEATS[next]!;
    tiers.resetUnlocks();
    writeFileSync(join(dir, `${file}.save`), engine.saveManager!.exportSave() + '\n');
    tiers.unlock('academie');
    console.log(`${file} at sim ${sim}s`);
    next++;
  }
}
if (next < BEATS.length) throw new Error(`stopped before beat ${BEATS[next]!.file}`);
engine.dispose();
