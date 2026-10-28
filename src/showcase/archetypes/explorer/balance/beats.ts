/**
 * The manifest's beat recording: the arc probe's runs under the greedy walker, read for
 * each beat's fire time. `pnpm beats explorer` plays it beside the recorded windows.
 *
 * The seed drives the hunt rolls, never the map, so each run is one seed and the
 * window is the range over the probe's default seeds.
 */
import { runArc } from './_engine';

/** The runs one recording spans: the probe's default seeds, each to the Hart. */
export const runs = [{ seed: 7 }, { seed: 11 }, { seed: 23 }];

/** Plays one run; each manifest beat's fire time in sim-seconds, by beat number. */
export async function record(run: (typeof runs)[number]): Promise<Record<number, number | null>> {
  const arc = await runArc(run.seed, 3600);
  const at = (label: string) => arc.beats.find((b) => b.label === label)?.at ?? null;
  return {
    1: at('first lodge purchase'),
    2: at('camp 1'),
    3: at('enter band 2'),
    4: at('trophy mattock'),
    5: at('trophy coracle'),
    6: at('enter band 3'),
    7: at('trophy sledge'),
    8: at('enter band 4'),
    9: at('the Hart'),
  };
}
