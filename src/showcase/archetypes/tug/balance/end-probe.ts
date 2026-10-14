/**
 * Tug: end probe. How a battle ends. Plays the front probe's pairings at equal income on the
 * open field and reads each close: a breach or the season's tiebreak, when, by whose engines,
 * and whether the side holding ground when the last week opened went on to win. Prints;
 * never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/tug/balance/end-probe.ts [seeds] [twist]`
 *
 * How to read it:
 * - `breach` battles ended on a fallen gate; `season` ones on the tiebreak, with the margin
 *   between the two gates' lost shares. A thin margin is a coin flip dressed as a verdict.
 * - `ahead at the last week won`: the side whose front stood further out when the last week
 *   opened. Near half means the season decides the battle, not the play before it.
 * - the troop shares say who battered the gates that fell; engines are the designed breaker.
 */

import { ANCHORS, LORDS, seasonClose, type Temperament } from '../data';
import { createCommander, type Side } from '../modules';
import { buildGame, clock, openAll, perturb, playBattle, seatMarshal } from './_marshal';

const SEEDS = Number(process.argv[2] ?? 12);
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

let battles = 0;
let breaches = 0;
let margins = 0;
let aheadWon = 0;
let aheadKnown = 0;
let capped = 0;
const ends: number[] = [];
const byTroop: Record<string, number> = {};

for (const [mine, theirs] of PAIRS) {
  for (let seed = 1; seed <= SEEDS; seed++) {
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
    const out = playBattle(g, seasonClose() + 30, seed % 2 ? 'player' : 'rival');
    const r = out.record;
    if (!r) {
      capped++;
      g.dispose();
      continue;
    }
    battles++;
    ends.push(out.seconds);
    const winner: Side = r.won ? 'player' : 'rival';
    if (ahead) {
      aheadKnown++;
      if (ahead === winner) aheadWon++;
    }
    if (r.byBreach) {
      breaches++;
      const t = dealt[winner];
      const total = Object.values(t).reduce((a, b) => a + b, 0);
      for (const [k, v] of Object.entries(t)) byTroop[k] = (byTroop[k] ?? 0) + v / total;
    } else {
      const lost = (s: Side) => g.keeps[s].gateDamage.value / g.keeps[s].gateMax.value;
      margins += Math.abs(lost('player') - lost('rival'));
    }
    g.dispose();
  }
}

ends.sort((a, b) => a - b);
const q = (p: number) => clock(ends[Math.floor(p * (ends.length - 1))]!);
const season = battles - breaches;
console.log(
  `\nTUG end probe — how a battle ends, ${battles} battles${TWIST ? `, twist ${TWIST}` : ''}\n`,
);
console.log(
  `close      breach ${breaches} · season ${season}${capped ? ` · capped ${capped}` : ''}`,
);
console.log(`length     p10 ${q(0.1)} · median ${q(0.5)} · p90 ${q(0.9)}`);
console.log(
  `tiebreak   mean margin ${season ? ((100 * margins) / season).toFixed(0) : '–'}% of a gate`,
);
console.log(`ahead at the last week won ${aheadWon} of ${aheadKnown}`);
console.log(
  `breached by ${Object.entries(byTroop)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${((100 * v) / Math.max(1, breaches)).toFixed(0)}%`)
    .join(' · ')}`,
);
