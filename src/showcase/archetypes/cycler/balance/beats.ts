/**
 * The manifest's beat recording: the watch and career probes' runs under the reference
 * keeper (`./_keeper.ts`), read for each beat's fire time. `pnpm beats cycler` plays it
 * beside the recorded windows.
 *
 * Two runs, each measuring its own beats. The watch run is one watch at Haven Point (the
 * storm beats). The career run plays watches back to back, as the career probe does, to the
 * first watch whose light holds (the Flannans beats, on the career clock). Both are
 * seeded, so each seed is one deterministic measurement.
 */
import { buildGame, keeperBetweenWatches, playWatch } from './_keeper';

/** The runs one recording spans: the first watch, and the career to the final gale. */
export const runs = [
  { kind: 'watch', seed: 1 },
  { kind: 'career', seed: 2, watches: 14 },
] as const;

type Run = (typeof runs)[number];

/** Plays one run; each beat the run measures, as its fire time in sim-seconds by beat number. */
export function record(run: Run): Record<number, number | null> {
  const g = buildGame(run.seed);
  try {
    if (run.kind === 'watch') {
      g.watch.startWatch();
      const result = playWatch(g);
      const at = (pattern: RegExp) => result?.beats.find((b) => pattern.test(b.text))?.at ?? null;
      return {
        1: at(/^dusk → night 1:/),
        2: at(/^dusk → night \d+:.* spray /),
        3: at(/^dusk → night \d+:.* backing /),
        4: result?.seconds ?? null,
      };
    }
    const out: Record<number, number | null> = { 5: null, 6: null, 7: null };
    let total = 0;
    for (let i = 1; i <= run.watches; i++) {
      g.watch.startWatch();
      const start = total;
      if (g.watch.posting.value.id === 'flannans' && out[5] === null) out[5] = start;
      const r = playWatch(g);
      if (!r) break;
      total += r.seconds;
      if (r.posting === 'flannans' && out[6] === null && out[5] !== null) out[6] = total;
      if (r.relief === 'held') {
        out[7] = total;
        break;
      }
      keeperBetweenWatches(g.logbook);
    }
    return out;
  } finally {
    g.dispose();
  }
}
