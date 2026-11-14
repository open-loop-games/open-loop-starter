/**
 * Tug: end probe. How a battle ends. Plays the front probe's pairings at equal income on the
 * open field and reads each close: a breach or the season's tiebreak, when, by whose engines,
 * and whether the side holding ground when the last week opened went on to win. Prints;
 * never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/tug/balance/end-probe.ts [seeds] [twist]`
 * `seeds` is how many seeds a pairing plays (default 12), drawn with `seedBatch`.
 *
 * How to read it:
 * - `breach` battles ended on a fallen gate; `season` ones on the tiebreak, with the margin
 *   between the two gates' lost shares. A thin margin is a coin flip dressed as a verdict.
 * - `length` is the median battle, with the shortest and longest beside it.
 * - `ahead at the last week won`: the side whose front stood further out when the last week
 *   opened. Near half means the season decides the battle, not the play before it.
 * - the troop shares say who battered the gates that fell; engines are the designed breaker.
 */

import { ANCHORS, LORDS, seasonClose, type Temperament } from '../data';
import { createCommander, type Side } from '../modules';
import { formatSpread, seedBatch, spreadOf } from '@/balance';
import { formatClock } from '@/composables/useFormatting';
import { buildGame, openAll, perturb, playBattle, seatMarshal } from './_marshal';

const SEEDS = seedBatch(Number(process.argv[2] ?? 12));
const TWIST = process.argv[3];
const T = (rung: number) => LORDS[rung]!.temperament;
const PAIRS: [Temperament, Temperament][] = [
  [T(0), T(0)],
  [T(1), T(1)],
  [T(2), T(2)],
  [T(0), T(1)],
  [T(0), T(2)],
  [T(1), T(2)],
];

/** One battle that closed. */
interface Close {
  seconds: number;
  byBreach: boolean;
  /** the gap between the two gates' lost shares, on a season close */
  margin: number;
  /** each troop's share of the gate damage that breached, on a breach */
  shares: Record<string, number>;
}

const closes: Close[] = [];
let capped = 0;
let aheadWon = 0;
let aheadKnown = 0;

for (const [mine, theirs] of PAIRS) {
  for (const [i, seed] of SEEDS.entries()) {
    const g = buildGame(seed);
    perturb(g, { 'ladder/rungGrowth': 1 });
    openAll(g);
    if (TWIST) g.chronicle.twistId.value = TWIST;
    seatMarshal(g, mine);
    g.battle.commanders.rival = createCommander(g.keeps.rival, g.causeway, () => theirs);
    const dealt: Record<Side, Record<string, number>> = { player: {}, rival: {} };
    let ahead: Side | null | undefined;
    const step = g.causeway.step;
    g.causeway.step = (dt) => {
      const events = step(dt);
      for (const e of events.gate)
        dealt[e.side][e.troop] = (dealt[e.side][e.troop] ?? 0) + e.damage;
      if (ahead === undefined && g.causeway.clock.value >= ANCHORS.seasonSeconds) {
        const lead = g.causeway.front('player') - g.causeway.front('rival');
        ahead = Math.abs(lead) < 2 ? null : lead > 0 ? 'player' : 'rival';
      }
      return events;
    };
    const out = playBattle(g, seasonClose() + 30, i % 2 ? 'rival' : 'player');
    const r = out.record;
    if (!r) {
      capped++;
      g.dispose();
      continue;
    }
    const winner: Side = r.won ? 'player' : 'rival';
    if (ahead) {
      aheadKnown++;
      if (ahead === winner) aheadWon++;
    }
    const close: Close = { seconds: out.seconds, byBreach: r.byBreach, margin: NaN, shares: {} };
    if (r.byBreach) {
      const t = dealt[winner];
      const total = Object.values(t).reduce((a, b) => a + b, 0);
      for (const [k, v] of Object.entries(t)) close.shares[k] = v / total;
    } else {
      const lost = (s: Side) => g.keeps[s].gateDamage.value / g.keeps[s].gateMax.value;
      close.margin = Math.abs(lost('player') - lost('rival'));
    }
    closes.push(close);
    g.dispose();
  }
}

const breaches = closes.filter((c) => c.byBreach);
const season = closes.length - breaches.length;
const spread = spreadOf(closes, { length: (c) => c.seconds, margin: (c) => c.margin });
const troops = [...new Set(breaches.flatMap((c) => Object.keys(c.shares)))];
const byTroop = spreadOf(
  breaches,
  Object.fromEntries(troops.map((k) => [k, (c: Close) => c.shares[k] ?? 0])),
);
console.log(
  `\nTUG end probe — how a battle ends, ${closes.length} battles${TWIST ? `, twist ${TWIST}` : ''}\n`,
);
console.log(
  `close      breach ${breaches.length} · season ${season}${capped ? ` · capped ${capped}` : ''}`,
);
console.log(`length     ${spread.length ? formatSpread(spread.length, formatClock) : '–'}`);
console.log(
  `tiebreak   mean margin ${spread.margin ? (100 * spread.margin.avg).toFixed(0) : '–'}% of a gate`,
);
console.log(`ahead at the last week won ${aheadWon} of ${aheadKnown}`);
console.log(
  `breached by ${Object.entries(byTroop)
    .sort((a, b) => b[1].avg - a[1].avg)
    .map(([k, v]) => `${k} ${(100 * v.avg).toFixed(0)}%`)
    .join(' · ')}`,
);
