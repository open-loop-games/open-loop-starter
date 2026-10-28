/**
 * Beat saves for the studio games site: plays the shipping game under the
 * arc probe's reference gardener and writes one save per beat. The games
 * site's capture driver seeds each save into the gallery's live demo and
 * shoots it (see the root `game.json`'s defender card).
 *
 * A plot in progress is not saved: a save holds only the garden. So each beat
 * is the moment before the gardener goes out to a plot, notes written up, and
 * the save reloads onto the garden screen. The shot's `eval` goes out to the
 * plot through the UI and replays the gardener's opening board, which this
 * script prints for each beat. That board is the first build, bought from the
 * starting compost alone, so the reloaded plot can afford it.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/defender/shots/beat-saves.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLOTS, type PlantId } from '../data';
import { createDefenderEngine } from '../engine';
import { getGarden, getPlot } from '../modules';
import { spendNotes, tendPlot } from '../balance/_gardener';

/** The arc probe's tick, so the gardener plays the run it records. */
const TICK = 0.05;
const MAX_ATTEMPTS = 3;

const { engine } = createDefenderEngine({ persistenceNamespace: 'beat-saves' });
engine.start();
engine.tickDriver.stop(); // the loop below drives the ticks

const garden = getGarden();
const plot = getPlot();

/** In beat order: the file stem of the save taken before the gardener first goes out to each plot. */
const BEATS = ['1-herb-border', '2-bean-rows', '3-orchard'];
/** The plant tags' hotkeys, in `PlotScreen`'s tag order. */
const HOTKEY: Record<PlantId, number> = {
  hedge: 1,
  thrush: 2,
  trap: 3,
  bat: 4,
  marigold: 5,
  ladybird: 6,
};

/** The shot's eval: go out to the plot, plant the board as the gardener did, then feed what it fed. */
function replayEval(plotId: string, board: [PlantId, number, number, number][]): string {
  const moves = board.map(([id, x, y, level]) => [HOTKEY[id], x + 1, y + 1, level - 1]);
  return [
    `const moves = ${JSON.stringify(moves)}`,
    'const sleep = (ms) => new Promise((r) => setTimeout(r, ms))',
    "const key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: String(k) }))",
    "const press = (el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))",
    'const until = async (sel) => { let el; while (!(el = document.querySelector(sel))) await sleep(50); return el; }',
    "const cell = (x, y) => document.querySelector('.wg-board__cell[aria-label^=\"' + x + ', ' + y + ':\"]')",
    '(async () => { ' +
      `press(await until('[data-testid="enter-${plotId}"]')); await until('.wg-board__cell'); ` +
      "for (const [k, x, y] of moves) { key('Escape'); key(k); cell(x, y).click(); } " +
      "for (const [, x, y, feeds] of moves) for (let i = 0; i < feeds; i++) { key('Escape'); cell(x, y).click(); press(await until('.wg-looked .feed')); await sleep(50); } " +
      "key('Escape'); })()",
  ].join('; ');
}

const dir = import.meta.dirname;
let clock = 0;
for (const [pi, def] of PLOTS.entries()) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (!garden.plots.isUnlocked(def.id)) break;
    spendNotes(garden);
    if (attempt === 1) {
      writeFileSync(join(dir, `${BEATS[pi]}.save`), engine.saveManager!.exportSave() + '\n');
      console.log(`${BEATS[pi]} at sim ${clock.toFixed(1)}s, gardener level ${garden.level.value}`);
    }
    const run = plot.startPlot(def.id);
    run.on((e) => {
      if (e.type === 'build') tendPlot(garden, plot, run, { callEarly: true });
      if (e.type === 'held') run.finish();
    });
    tendPlot(garden, plot, run, { callEarly: true });
    if (attempt === 1) {
      const board = [...run.plants.values()].map(
        (p) => [p.def, p.x, p.y, p.level] as [PlantId, number, number, number],
      );
      const listed = board.map(
        ([id, x, y, level]) => `${id}${level > 1 ? ` L${level}` : ''}@${x},${y}`,
      );
      console.log(`  opening board: ${listed.join(' ')}; path ${run.route().length - 1} cells`);
      console.log(
        `  tonight and after: ${run
          .preview(3)
          .map((n) => n.kind)
          .join(', ')}`,
      );
      console.log(`  eval: ${replayEval(def.id, board)}`);
      if (pi === PLOTS.length - 1) break; // the last beat is saved and its board read
    }
    while (run.phase !== 'won' && run.phase !== 'lost') {
      engine.tickDriver.processInterval(TICK);
      clock += TICK;
    }
    console.log(
      `  ${def.displayName} ${run.phase === 'won' ? 'held' : 'lost'} at sim ${clock.toFixed(1)}s`,
    );
    plot.leavePlot();
    if (run.phase === 'won') break;
  }
}
engine.dispose();
