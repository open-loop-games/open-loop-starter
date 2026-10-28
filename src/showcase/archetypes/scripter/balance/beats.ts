/**
 * The manifest's beat recording: the arc probe's run under the reference sensei, read for
 * each beat's fire time. `pnpm beats scripter` plays it beside the recorded windows.
 *
 * Bouts are seeded from the save, so one run is the measurement.
 */
import { runArc } from './_engine';

/** The runs one recording spans: one deterministic run, past the Envoy's Gauntlet. */
export const runs = [{ seconds: 8000 }];

/** Plays one run; each manifest beat's fire time in sim-seconds, by beat number. */
export function record(run: (typeof runs)[number]): Record<number, number | null> {
  const arc = runArc(run.seconds);
  const win = (id: keyof typeof arc.firstWins) => arc.firstWins[id] ?? null;
  const times = {
    1: win('post'),
    2: win('ren'),
    3: win('wen'),
    4: arc.graduations[0]?.at ?? null,
    5: win('gang'),
    6: win('ma'),
    7: win('lu'),
    8: win('envoy'),
  };
  arc.dispose();
  return times;
}
