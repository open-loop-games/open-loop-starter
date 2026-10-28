/**
 * The manifest's beat recording: the arc probe's run under the reference player, read
 * for each beat's fire time. `pnpm beats looper` plays it beside the recorded windows.
 *
 * The game has no RNG, so one run is the measurement. The clock starts when the first
 * night begins, the probe's own zero. The run stops at the night that ends on the freight.
 */
import { runArc } from './_engine';

/** The runs one recording spans: one deterministic run, to the first night on the freight. */
export const runs = [{ nights: 17 }];

/** Plays one run; each manifest beat's fire time in sim-seconds, by beat number. */
export async function record(run: (typeof runs)[number]): Promise<Record<number, number | null>> {
  const arc = await runArc(run.nights);
  const first = (pattern: RegExp) => {
    const line = arc.beats.find((b) => pattern.test(b));
    return line ? Number(/^t=\s*([\d.]+)s/.exec(line)![1]) : null;
  };
  return {
    1: first(/discovered C-Block Corridor/),
    2: first(/first purchase:/),
    3: first(/discovered Laundry/),
    4: first(/discovered The Yard/),
    5: first(/automation tier unlocked: Routine/),
    6: first(/discovered Blackwater Woods/),
    7: first(/automation tier unlocked: Discipline/),
    8: first(/discovered The Rail Yard/),
    9: first(/\(escape\)/),
  };
}
