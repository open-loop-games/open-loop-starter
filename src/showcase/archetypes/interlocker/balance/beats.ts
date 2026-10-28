/**
 * The manifest's beat recording: the arc probe's run under the foreman, read for each
 * beat's fire time. `pnpm beats interlocker` plays it beside the recorded windows.
 *
 * The game draws nothing at random, but a tick can carry a run across a medal, so the
 * recording spans the tick sizes the economy is robust to.
 */
import { CHARTERS } from '../data';
import { runArc } from './_foreman';

/** The runs one recording spans: one arc at each tick size, past the Grand Prix. */
export const runs = [0.25, 0.5, 1, 2].map((dt) => ({ dt, expositions: 30 }));

/** Plays one run; each manifest beat's fire time in sim-seconds, by beat number. */
export function record(run: (typeof runs)[number]): Record<number, number | null> {
  const { beats } = runArc(run);
  const first = (pattern: RegExp) => beats.find(([, label]) => pattern.test(label))?.[0] ?? null;
  const charters = beats.filter(
    ([, label]) => / held$/.test(label) && label.startsWith('charter '),
  );
  return {
    1: first(/^run 1: first Timber Yard/),
    2: first(/^run 1: patent Sawpit Guild/),
    3: first(/^run 1: patent Les Baux Concession/),
    4: first(/^run 1: patent Deville Reduction/),
    5: first(/^run 1: patent Bonded Warehousing/),
    6: first(/^run 1: patent Light Steam Engine/),
    7: first(/^run 1: first Boiler House/),
    8: first(/^run 1: patent Monoplane Rigging/),
    9: first(/^run 1: first aeroplane/),
    10: first(/^EXPOSITION 1 /),
    11: first(/first order delivered/),
    12: charters.length === CHARTERS.length ? charters.at(-1)![0] : null,
    13: first(/^bureau Le Contremaître employed/),
    14: first(/^EXPOSITION 10 /),
    15: first(/^THE GRAND PRIX/),
  };
}
