/**
 * Beat saves for the studio games site: plays the shipping game under the arc probe's
 * reference sensei and writes one save per beat. The games site's capture driver seeds
 * each save into the gallery's live demo and shoots it (see the root `game.json`'s
 * scripter card). Each beat is saved mid-bout, so the gate shows the challenger the
 * inked scroll answers.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/scripter/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Decimal, runUntil } from '@open-loop/engine';
import { formatClock } from '@/composables/useFormatting';
import type { ChallengerId, TechniqueId } from '../data';
import { createScripterEngine } from '../engine';
import { getDojo, getGate, getLineage } from '../modules';
import { DT, REFERENCE_TEMPER } from '../balance/_engine';
import { seatSensei } from '../balance/_sensei';

const MAX_SECONDS = 9000;

const { engine } = createScripterEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // runUntil below drives the ticks

const lineage = getLineage();
const dojo = getDojo();
const gate = getGate();

/** A bout against `id` with its answer known, `beats` beats in. */
const fighting = (id: ChallengerId, answer: TechniqueId, beats: number) => () => {
  const bout = gate.bout.value;
  return bout?.challenger === id && dojo.knows(answer) && bout.beat >= beats;
};

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  {
    file: '1-ren',
    at: () =>
      !lineage.beaten.value.includes('ren') &&
      new Decimal(dojo.temper.count.value).gte(REFERENCE_TEMPER) &&
      fighting('ren', 'iron-body', 6)(),
  },
  { file: '2-gang', at: fighting('gang', 'turning-hand', 12) },
  { file: '3-envoy', at: fighting('envoy', 'names', 24) },
];

const dir = import.meta.dirname;
let next = 0;
const unseat = seatSensei(engine);
try {
  runUntil({
    engine,
    tickDelta: DT,
    maxSimTime: MAX_SECONDS,
    until: ({ iteration, simTime }) => {
      if (iteration > 0 && BEATS[next]!.at()) {
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
