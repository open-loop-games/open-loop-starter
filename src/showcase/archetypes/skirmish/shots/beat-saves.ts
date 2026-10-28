/**
 * Beat saves for the studio games site: plays the first contract on the shipping game under
 * the arc probe's reference player and writes one save per beat. The games site's capture
 * driver seeds each save into the gallery's live demo and shoots it (see the root
 * `game.json`'s skirmish card).
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/skirmish/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toNumber } from '@open-loop/engine';
import { createSkirmishEngine } from '../engine';
import { getMatch, getRoster } from '../modules';
import { MAX_MATCH_S, TICK, staffMatch } from '../balance/_game';

const { engine } = createSkirmishEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // the loop below drives the ticks

const match = getMatch();
getRoster().choose(0);
match.start();
const { p, e } = match;

/** In beat order: the file stem, and the moment it is saved at. */
const BEATS: { file: string; at: () => boolean }[] = [
  { file: '1-district', at: () => match.control.some((c) => c.value >= 1) },
  { file: '2-charter', at: () => p.chartered() },
  // Halfway down, so the siege has visibly bitten and the match is still live.
  {
    file: '3-assault',
    at: () => toNumber(e.hq.value) <= match.tune.hqIntegrity.value / 2,
  },
];

const dir = import.meta.dirname;
let next = 0;
while (match.phase.value === 'live' && match.clock.value < MAX_MATCH_S && next < BEATS.length) {
  staffMatch({ match });
  engine.tickDriver.processInterval(TICK);
  if (BEATS[next]!.at()) {
    const { file } = BEATS[next]!;
    writeFileSync(join(dir, `${file}.save`), engine.saveManager!.exportSave() + '\n');
    console.log(`${file} at match second ${match.clock.value}`);
    next++;
  }
}
if (next < BEATS.length)
  throw new Error(`stopped at ${match.phase.value} before beat ${BEATS[next]!.file}`);
engine.dispose();
