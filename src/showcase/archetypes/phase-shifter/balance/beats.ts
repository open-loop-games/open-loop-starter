/**
 * The manifest's beat recording: the arc probe's run under the reference player, read for
 * each beat's fire time. `pnpm beats phase-shifter` plays it beside the recorded windows.
 *
 * The game has no RNG and the player is deterministic, so one run is the measurement.
 */
import { runArc } from './_arc';

/** The runs one recording spans: one deterministic run, to the closed case. */
export const runs = [{}];

/** Plays one run; each manifest beat's fire time in sim-seconds, by beat number. */
export function record(_run: (typeof runs)[number]): Record<number, number | null> {
  const { beats } = runArc();
  const at = (name: string) => beats[name]?.sim ?? null;
  return {
    1: at('first clerk'),
    2: at('box empty'),
    3: at('board 4×4'),
    4: at('reconstruct threshold'),
    5: at('alibi 1'),
    6: at('alibi 6'),
  };
}
