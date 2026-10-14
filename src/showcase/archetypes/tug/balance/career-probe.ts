/**
 * Tug: career probe. The reference marshal (`./_marshal.ts`) plays the ladder from a new
 * Chronicle: a battle against the lord at its rung, its boons between battles, until the
 * Usurper's keep falls or the battle limit. Prints each battle and the ending. Prints; never
 * asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/tug/balance/career-probe.ts [seed] [battles]`
 *
 * How to read it:
 * - each battle: the lord, the result, its length, the renown it paid and the volume after.
 *   A defeat still pays, so the Chronicle always moves.
 * - the spine predicts parity on every rung for a marshal who takes a strength boon a rung;
 *   a run of defeats on one rung is the ladder outpacing the boons, or a temperament the
 *   marshal's answers lose to.
 * - the last line: battles and session time to the ending.
 */

import { buildGame, clock, marshalBetweenBattles, playBattle, seatMarshal } from './_marshal';

const seed = Number(process.argv[2] ?? 1);
const limit = Number(process.argv[3] ?? 30);
const g = buildGame(seed);
seatMarshal(g);
console.log(`\nTUG career probe — seed ${seed}\n`);
let session = 0;
for (let i = 0; i < limit && !g.chronicle.endingReached.value; i++) {
  const lord = g.battle.lord.value.name;
  const out = playBattle(g);
  session += out.seconds;
  const r = out.record;
  if (!r) {
    console.log(
      `  ${clock(session).padStart(7)}  battle ${i + 1} vs ${lord}: no gate fell in ${clock(out.seconds)}`,
    );
    break;
  }
  const bought = marshalBetweenBattles(g.chronicle);
  console.log(
    `  ${clock(session).padStart(7)}  battle ${i + 1} vs ${lord}: ${r.won ? 'VICTORY' : 'defeat '} in ${clock(r.seconds)}` +
      ` · +${r.renown} renown, volume ${r.volumeAfter}` +
      (bought.length ? ` · boons ${bought.join(', ')}` : '') +
      (r.ending ? '  *** the Stolen Throne falls ***' : ''),
  );
}
console.log(
  `\n  ${g.chronicle.battles.value} battles, ${g.chronicle.victories.value} victories, rung ${g.chronicle.rung.value}` +
    `, session ${clock(session)}${g.chronicle.endingReached.value ? ', ending reached' : ''}`,
);
g.dispose();
