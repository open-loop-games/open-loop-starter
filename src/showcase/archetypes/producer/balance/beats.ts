/**
 * The manifest's beat recording: the arc probe's run under the reference player, read
 * for each beat's fire time. `pnpm beats producer` plays it beside the recorded windows.
 *
 * Tips are drawn, so the seed changes the arc: one run per seed, and a window spans them.
 * Each run goes past the ending's price by the probe's margin.
 */
import { seedBatch } from '@/balance';
import { ENDING_TARGET } from '../data';
import { runArc } from './_engine';

/** The runs one recording spans: the probe's horizon on a three-seed batch. */
export const runs = seedBatch(3).map((seed) => ({ seed, seconds: ENDING_TARGET * 1.1 }));

/** Plays one run; each manifest beat's fire time in sim-seconds, by beat number. */
export function record(run: (typeof runs)[number]): Record<number, number | null> {
  const arc = runArc(run);
  arc.dispose();
  const at = (key: string) => arc.beats.find((b) => b.key === key)?.t ?? null;
  return {
    1: at('open:pushcart'),
    2: at('d:sales-desk'),
    3: at('d:acquisitions-desk'),
    4: at('d:board'),
    5: at('open:bank'),
    6: at('ending-offered'),
    7: at('ending'),
  };
}
