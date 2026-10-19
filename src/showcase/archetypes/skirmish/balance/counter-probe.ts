/**
 * The counter-axis probe: does reading the rival win matches, or only magnitude? Plays every
 * contract three times under the reference player (`_game.ts`), each at the contract's income
 * ×0.95 / 1 / 1.05, for four player seats:
 * - shipped: `PLAYER_PERSONA`, its mix bent three-quarters toward counters of what it sees;
 * - counter-blind: the same mix, never bent;
 * - counter-full: bent all the way;
 * - table flat: every pairing cell 1 and the seat blind, so composition decides nothing.
 * `--hard` puts every rival at ×1.1 / 1.15 / 1.2 of the player's income instead.
 *
 * Counter fit is how much harder the player's army hits the rival's than the reverse, by
 * composition alone: the time-average of `Σ share·share·effectiveness` each way while both
 * field more than three units. 1 is no edge.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/skirmish/balance/counter-probe.ts [--hard]
 */
import { toNumber } from '@open-loop/engine';
import { runUntil } from '@open-loop/engine/harness';
import { CONTRACTS, PLAYER_PERSONA } from '../data/contracts';
import { EFFECTIVENESS, UNIT_KINDS, effectiveness, type UnitKind } from '../data/units';
import type { Side } from '../modules/side';
import { MAX_MATCH_S, TICK, buildGame, staffMatch } from './_game';

declare const process: { argv: string[]; exit(code: number): never };

const HARD = process.argv.includes('--hard');
const SPREAD = HARD ? [1.1, 1.15, 1.2] : [0.95, 1, 1.05];
const TABLE = JSON.parse(JSON.stringify(EFFECTIVENESS)) as typeof EFFECTIVENESS;
const COUNTER_WEIGHT = PLAYER_PERSONA.counter;
const INCOME = CONTRACTS.map((c) => c.incomeMult);

function setTable(flat: boolean): void {
  for (const [attack, row] of Object.entries(EFFECTIVENESS))
    for (const body of Object.keys(row))
      (row as Record<string, number>)[body] =
        flat && body !== 'structure'
          ? 1
          : (TABLE[attack as keyof typeof TABLE] as Record<string, number>)[body]!;
}

function army(s: Side): Record<UnitKind, number> {
  const out = {} as Record<UnitKind, number>;
  for (const k of UNIT_KINDS)
    out[k] =
      toNumber(s.reserve[k].value) + s.squads.reduce((n, sq) => n + toNumber(sq[k].value), 0);
  return out;
}

/** `Σ share_a(x) · share_b(y) · effectiveness(x, y)`: how hard army `a` hits army `b` by composition. */
function hits(a: Record<UnitKind, number>, b: Record<UnitKind, number>): number {
  const ta = UNIT_KINDS.reduce((n, k) => n + a[k], 0);
  const tb = UNIT_KINDS.reduce((n, k) => n + b[k], 0);
  let e = 0;
  for (const x of UNIT_KINDS)
    for (const y of UNIT_KINDS) e += (a[x] / ta) * (b[y] / tb) * effectiveness(x, y);
  return e;
}

function play(contract: number, income: number) {
  const game = buildGame();
  game.roster.choose(contract);
  CONTRACTS[contract]!.incomeMult = income;
  const m = game.match;
  m.start();
  let logFit = 0;
  let samples = 0;
  runUntil({
    engine: game.engine,
    tickDelta: TICK,
    maxSimTime: MAX_MATCH_S,
    until: () => {
      staffMatch(game);
      const p = army(m.p);
      const e = army(m.e);
      if (
        UNIT_KINDS.reduce((n, k) => n + p[k], 0) > 3 &&
        UNIT_KINDS.reduce((n, k) => n + e[k], 0) > 3
      ) {
        logFit += Math.log(hits(p, e) / hits(e, p));
        samples += 1;
      }
      return m.phase.value !== 'live';
    },
  });
  const result = { phase: m.phase.value, end: m.clock.value, fit: samples ? logFit / samples : 0 };
  CONTRACTS[contract]!.incomeMult = INCOME[contract]!;
  game.dispose();
  return result;
}

const seats: [string, boolean, number][] = [
  ['shipped', false, COUNTER_WEIGHT],
  ['counter-blind', false, 0],
  ['counter-full', false, 1],
  ['table flat', true, 0],
];

console.log(
  HARD ? '── Every rival at ×1.1 / 1.15 / 1.2 ──' : '── Contract income ×0.95 / 1 / 1.05 ──',
);
console.log(
  'seat            won    median end   counter fit   per contract (won of 3, median end)',
);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
for (const [name, flat, counter] of seats) {
  setTable(flat);
  PLAYER_PERSONA.counter = counter;
  const runs = CONTRACTS.flatMap((_, c) =>
    SPREAD.map((s) => ({ c, ...play(c, (HARD ? 1 : INCOME[c]!) * s) })),
  );
  const won = runs.filter((r) => r.phase === 'won').length;
  const fit = Math.exp(runs.reduce((n, r) => n + r.fit, 0) / runs.length);
  const per = CONTRACTS.map((_, c) => {
    const rs = runs.filter((r) => r.c === c);
    const stall = rs.some((r) => r.phase === 'live') ? ' stall' : '';
    return `c${c + 1} ${rs.filter((r) => r.phase === 'won').length}/3 ${median(rs.map((r) => r.end)).toFixed(0)}s${stall}`;
  }).join('  ');
  console.log(
    `${name.padEnd(15)} ${String(won).padStart(2)}/${runs.length}   ${median(runs.map((r) => r.end))
      .toFixed(0)
      .padStart(6)} s    ${fit.toFixed(3).padStart(8)}      ${per}`,
  );
}
setTable(false);
PLAYER_PERSONA.counter = COUNTER_WEIGHT;
process.exit(0);
