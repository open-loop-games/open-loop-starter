/**
 * Tug: front probe. Seats a temperament in each keep at equal income, every troop open, and
 * plays battles between them: each lord's temperament against itself, then each against the
 * others. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/tug/balance/front-probe.ts [seeds]`
 * `seeds` is how many seeds a pairing plays (default 12), drawn with `seedBatch`.
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
import { seedBatch, spreadOf } from '@/balance';
import { formatClock } from '@/composables/useFormatting';
import { buildGame, openAll, perturb, playBattle, seatMarshal } from './_marshal';

const SEEDS = seedBatch(Number(process.argv[2] ?? 12));
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

/** One battle, as a row averages it. */
interface Battle {
  result: 'won' | 'lost' | 'capped';
  seconds: number;
  /** share of engaged seconds the line stood in the middle third */
  middle: number;
  crossings: number;
  pushed: number;
  back: number;
  /** mean members on the causeway */
  members: number;
}

function show(name: string, battles: Battle[]): string {
  const count = (k: Battle['result']) => battles.filter((b) => b.result === k).length;
  const sum = (k: 'pushed' | 'back') => battles.reduce((a, b) => a + b[k], 0);
  const mean = spreadOf(battles, {
    seconds: (b) => b.seconds,
    middle: (b) => b.middle,
    crossings: (b) => b.crossings,
    members: (b) => b.members,
  });
  const avg = (k: keyof typeof mean) => mean[k]?.avg ?? NaN;
  const capped = count('capped');
  return (
    `${name.padEnd(16)} F–R ${count('won')}–${count('lost')}${capped ? ` (${capped} capped)` : ''} · ` +
    `length ${formatClock(avg('seconds'))} · middle ${avg('middle').toFixed(2)} · ` +
    `crossings ${avg('crossings').toFixed(1)} · pushed → back ${sum('pushed')} → ${sum('back')} · ` +
    `members ${avg('members').toFixed(0)}`
  );
}

console.log(
  `\nTUG front probe — equal income, every troop open, ${SEEDS.length} seeds a pairing\n`,
);
const all: Battle[] = [];
for (const [mine, theirs] of PAIRS) {
  const row: Battle[] = [];
  for (const [i, seed] of SEEDS.entries()) {
    const g = buildGame(seed);
    perturb(g, { 'ladder/rungGrowth': 1 });
    g.chronicle.rung.value = 1;
    openAll(g);
    seatMarshal(g, mine);
    g.battle.commanders.rival = createCommander(g.keeps.rival, g.causeway, () => theirs);
    // Alternate who leads the horns: a short run of seeded tosses is not a fair coin.
    const out = playBattle(g, 600, i % 2 ? 'rival' : 'player');
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
    row.push({
      result: !out.record ? 'capped' : out.record.won ? 'won' : 'lost',
      seconds: out.seconds,
      middle: engaged ? middle / engaged : 0,
      crossings,
      pushed: Number(pushed.player) + Number(pushed.rival),
      back: Number(back.player) + Number(back.rival),
      members: out.samples.length ? members / out.samples.length : 0,
    });
    g.dispose();
  }
  console.log(show(`${mine.id} v ${theirs.id}`, row));
  all.push(...row);
}
console.log(show('all', all));
