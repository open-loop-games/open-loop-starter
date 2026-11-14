/**
 * The manifest's beat recording: the career probe's run (seed 1) under the reference
 * marshal, stepped at the engine's tick and read for each beat's fire time. `pnpm beats tug`
 * plays it beside the recorded windows.
 *
 * Fire times are session time, the sum of battle lengths (camp takes no time). The probe's
 * once-a-second samples are too coarse for the opening beats, so this reads every step itself.
 * One seeded run is the measurement.
 */
import { runUntil } from '@open-loop/engine';
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
    const over = () => g.chronicle.battles.value !== before;
    // TODO(expansion): a per-iteration act hook on runUntil. Until then `until` carries the
    // recorder's step, which `'uniform'` mode runs before every advance.
    const battle = runUntil({
      engine: g.engine,
      tickDelta: DT,
      maxSimTime: MAX_SECONDS,
      until: ({ iteration, simTime: t }) => {
        if (iteration === 0) return over();
        if (b === 0 && g.causeway.line() !== null) mark(1, session + t);
        const mine = g.causeway.members.value.filter((m) => m.side === 'player');
        if (mine.some((m) => m.troop === 'siege')) mark(2, session + t);
        if (mudhole && mine.some((m) => m.troop === 'bow')) mark(4, session + t);
        return over();
      },
    });
    session += battle.elapsedSimulated;
    if (g.chronicle.battles.value === before) break;
    if (g.chronicle.victories.value > 0) mark(3, session);
    if (g.chronicle.endingReached.value) mark(7, session);
    if (marshalBetweenBattles(g.chronicle).includes('firepots')) mark(5, session);
  }
  g.dispose();
  return at;
}
