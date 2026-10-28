/**
 * The manifest's beat recording: the career probe's first seeded career under the stars'
 * instincts (the star improvising, the reference agent shopping between takes), read for
 * each beat's fire time in session seconds. `pnpm beats survivor` plays it beside the
 * recorded windows.
 *
 * One career is the measurement: seed 1, as the probe's seed 1, for the 18 takes that
 * carry it past the wrap. A take is live, so a second seed costs another minute and adds a
 * different career, not a spread of the same beats.
 */
import { RATINGS } from '../data';
import { playCareer } from './_career';

/** The runs one recording spans: the probe's seed 1, 18 takes. */
export const runs = [{ seed: 1, takes: 18 }];

/** Plays one run; each manifest beat's fire time in session seconds, by beat number. */
export function record(run: (typeof runs)[number]): Record<number, number | null> {
  const { firsts } = playCareer(run);
  const at = (key: string) => firsts[key] ?? null;
  return {
    1: at('the first rewrite'),
    2: at('signed The Pyro'),
    3: at(`CUT at ${RATINGS[0]!.label}`),
    4: at('PG opens'),
    5: at('PG-13 opens'),
    6: at('R opens'),
    7: at('the picture wraps'),
  };
}
