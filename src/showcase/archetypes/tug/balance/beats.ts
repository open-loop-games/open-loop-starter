/**
 * The manifest's beat recording: the career probe's run (seed 1) under the reference
 * marshal, stepped at the engine's tick and read for each beat's fire time. `pnpm beats tug`
 * plays it beside the recorded windows.
 *
 * Fire times are session time, the sum of battle lengths (camp takes no time). The probe's
 * once-a-second samples are too coarse for the opening beats, so this drives the loop itself.
 * One seeded run is the measurement.
 */
import { buildGame, DT, marshalBetweenBattles, seatMarshal } from './_marshal';

/** The runs one recording spans: the career probe's seed. */
export const runs = [{ seed: 1 }];

const MAX_BATTLES = 60;
const MAX_SECONDS = 900;

/** Plays one run to the ending; each manifest beat's fire time in sim-seconds, by beat number. */
export function record(run: (typeof runs)[number]): Record<number, number | null> {
  const g = buildGame(run.seed);
  seatMarshal(g);
  const at: Record<number, number | null> = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
    7: null,
  };
  const mark = (n: number, t: number) => (at[n] ??= t);
  let session = 0;
  for (let b = 0; b < MAX_BATTLES && !g.chronicle.endingReached.value; b++) {
    const before = g.chronicle.battles.value;
    const vesk = g.battle.lord.value.name === 'Lady Vesk';
    const mudhole = g.chronicle.field.value.name === 'the Mudhole';
    g.battle.start();
    if (vesk) mark(6, session);
    let t = 0;
    while (t < MAX_SECONDS && g.chronicle.battles.value === before) {
      g.engine.tickDriver.advanceTime(DT);
      t += DT;
      if (b === 0 && g.causeway.line() !== null) mark(1, session + t);
      const mine = g.causeway.members.value.filter((m) => m.side === 'player');
      if (mine.some((m) => m.troop === 'siege')) mark(2, session + t);
      if (mudhole && mine.some((m) => m.troop === 'bow')) mark(4, session + t);
    }
    session += t;
    if (g.chronicle.battles.value === before) break;
    if (g.chronicle.victories.value > 0) mark(3, session);
    if (g.chronicle.endingReached.value) mark(7, session);
    if (marshalBetweenBattles(g.chronicle).includes('firepots')) mark(5, session);
  }
  g.dispose();
  return at;
}
