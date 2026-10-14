/**
 * Tug: career probe. The reference marshal (`./_marshal.ts`) plays the march from a new
 * Chronicle: a battle on the field at its rung, its boons between battles, until the
 * Usurper's keep falls or the battle limit. Prints each battle and the ending. Prints; never
 * asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/tug/balance/career-probe.ts [seed] [battles] [perField]`
 *
 * `perField` overrides `ladder/boonsPerField`, the ladder's steepness, for a sweep.
 *
 * How to read it:
 * - each battle: the field, its lord and twist, the result, its length (`season` when the
 *   gates decided it), the renown it paid and the volume after. A defeat still pays, so the
 *   Chronicle always moves, and the strength boons have no limit, so a run of defeats always
 *   buys a way through.
 * - a field that takes many battles is the ladder outpacing the boons there, or a field the
 *   marshal's answers lose to. Outlying fields should fall in one or two, keeps in three or four.
 * - the last line: battles and session time to the ending.
 */

import {
  buildGame,
  clock,
  marshalBetweenBattles,
  perturb,
  playBattle,
  seatMarshal,
} from './_marshal';

const seed = Number(process.argv[2] ?? 1);
const limit = Number(process.argv[3] ?? 60);
const g = buildGame(seed);
if (process.argv[4]) perturb(g, { 'ladder/boonsPerField': Number(process.argv[4]) });
seatMarshal(g);
console.log(`\nTUG career probe — seed ${seed}\n`);
let session = 0;
for (let i = 0; i < limit && !g.chronicle.endingReached.value; i++) {
  const lord = `${g.chronicle.field.value.name} (${g.battle.lord.value.name.split(' ').slice(-1)[0]}, ${g.chronicle.twist.value.id})`;
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
    `  ${clock(session).padStart(7)}  battle ${i + 1} vs ${lord}: ${r.won ? 'VICTORY' : 'defeat '} in ${clock(r.seconds)}${r.byBreach ? '' : ' (season)'}` +
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
