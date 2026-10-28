/**
 * The manifest's beat recording: the arc probe's run under the reference player, read
 * for each beat's fire time. `pnpm beats scaler` plays it beside the recorded windows.
 *
 * The game has no RNG, so one run is the measurement.
 */
import { runArc } from './_engine';

/** The runs one recording spans: one deterministic run, to the Modern Age. */
export const runs = [{ seconds: 15000 }];

/** Plays one run; each manifest beat's fire time in sim-seconds, by beat number. */
export function record(run: (typeof runs)[number]): Record<number, number | null> {
  const arc = runArc(run.seconds);
  const first = (pattern: RegExp) => arc.beats.find((b) => pattern.test(b.text))?.at ?? null;
  return {
    1: arc.firstRunOpens[0] ?? null,
    2: first(/^Reboot 1:/),
    3: first(/^Bought Elseworld Protocols/),
    4: first(/^Resolved .*, tier 1!/),
    5: first(/^Rewrite 1:/),
    6: first(/^The Silver Age begins/),
    7: first(/^The Bronze Age begins/),
    8: first(/^The Dark Age begins/),
    9: first(/^The Modern Age begins/),
  };
}
