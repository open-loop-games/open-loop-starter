/**
 * Tug: front probe. Seats a temperament in each keep at equal income, every troop open, and
 * plays battles between them: each lord's temperament against itself, then each against the
 * others. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/tug/balance/front-probe.ts [seeds]`
 *
 * How to read a row (sampled once a second, the line measured from Fairhold's gate):
 * - `F–R`: battles won by the Fairhold seat and by the rival seat. In a mirror these should
 *   split about evenly; a lean means a side asymmetry in the lane, the horns or the toss.
 * - `middle`: share of engaged seconds the line stands in the middle third.
 * - `crossings`: times a battle's line swings from one side's 40% mark past the other's.
 * - `pushed → back`: battles where a side was driven into its own quarter, and how many of
 *   those got the line back to the middle. The ramp of cover is what pulls it back.
 * - `length` against the 3–10 minute window; `capped` battles hit the time limit.
 */

import { LORDS, ANCHORS, type Temperament } from '../data';
import { createCommander } from '../modules';
import { buildGame, openAll, perturb, playBattle, seatMarshal, clock } from './_marshal';

const SEEDS = Number(process.argv[2] ?? 12);
const L = ANCHORS.causewayLength;
const T = (rung: number) => LORDS[rung]!.temperament;
const PAIRS: [Temperament, Temperament][] = [
  [T(0), T(0)],
  [T(1), T(1)],
  [T(2), T(2)],
  [T(0), T(1)],
  [T(0), T(2)],
  [T(1), T(2)],
];

interface Row {
  won: number;
  lost: number;
  capped: number;
  seconds: number;
  middle: number;
  crossings: number;
  pushed: number;
  back: number;
  members: number;
}
const zero = (): Row => ({
  won: 0,
  lost: 0,
  capped: 0,
  seconds: 0,
  middle: 0,
  crossings: 0,
  pushed: 0,
  back: 0,
  members: 0,
});

function show(name: string, r: Row, n: number): string {
  return (
    `${name.padEnd(16)} F–R ${r.won}–${r.lost}${r.capped ? ` (${r.capped} capped)` : ''} · ` +
    `length ${clock(r.seconds / n)} · middle ${(r.middle / n).toFixed(2)} · ` +
    `crossings ${(r.crossings / n).toFixed(1)} · pushed → back ${r.pushed} → ${r.back} · ` +
    `members ${(r.members / n).toFixed(0)}`
  );
}

console.log(`\nTUG front probe — equal income, every troop open, ${SEEDS} seeds a pairing\n`);
const all = zero();
for (const [mine, theirs] of PAIRS) {
  const row = zero();
  for (let seed = 1; seed <= SEEDS; seed++) {
    const g = buildGame(seed);
    perturb(g, { 'ladder/rungGrowth': 1 });
    g.chronicle.rung.value = 1;
    openAll(g);
    seatMarshal(g, mine);
    g.battle.commanders.rival = createCommander(g.keeps.rival, g.causeway, () => theirs);
    // Alternate who leads the horns: a short run of seeded tosses is not a fair coin.
    const out = playBattle(g, 600, seed % 2 ? 'player' : 'rival');
    if (!out.record) row.capped++;
    else if (out.record.won) row.won++;
    else row.lost++;
    row.seconds += out.seconds;
    let engaged = 0;
    let middle = 0;
    let crossings = 0;
    let last = 0;
    const pushed = { player: false, rival: false };
    const back = { player: false, rival: false };
    let members = 0;
    for (const s of out.samples) {
      members += s.members;
      if (s.line === null) continue;
      engaged++;
      if (s.line >= L / 3 && s.line <= (2 * L) / 3) middle++;
      const zone = s.line < 0.4 * L ? -1 : s.line > 0.6 * L ? 1 : 0;
      if (zone && zone !== last) {
        if (last) crossings++;
        last = zone;
      }
      if (s.line < L / 4) pushed.player = true;
      if (s.line > (3 * L) / 4) pushed.rival = true;
      if (pushed.player && s.line >= L / 2) back.player = true;
      if (pushed.rival && s.line <= L / 2) back.rival = true;
    }
    row.middle += engaged ? middle / engaged : 0;
    row.crossings += crossings;
    row.pushed += Number(pushed.player) + Number(pushed.rival);
    row.back += Number(back.player) + Number(back.rival);
    row.members += out.samples.length ? members / out.samples.length : 0;
    g.dispose();
  }
  console.log(show(`${mine.id} v ${theirs.id}`, row, SEEDS));
  for (const k of Object.keys(row) as (keyof Row)[]) all[k] += row[k];
}
console.log(show('all', all, SEEDS * PAIRS.length));
