/**
 * The nudge probe: is one match a measurement? A match has no RNG, but two seats answer each
 * other, so a change far below a tuning step sends it down another line of play. This plays
 * every contract under the reference player (`_game.ts`) once per nudge set. A nudge set
 * moves each of `KEYS` by its own factor within ±`NUDGE`, drawn from the set's seed. It
 * prints, per contract, the wins and the spread of the match's end.
 *
 * Read a retune against this spread, not against one run of the arc probe: a shift inside
 * the spread is not a finding. `[sets]` is the number of nudge sets, 10 unless given.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/skirmish/balance/nudge-probe.ts [sets]
 */
import { TuningRegistriesKey } from '@open-loop/engine';
import { runUntil } from '@open-loop/engine/harness';
import { formatSpread, seedBatch, spreadOf } from '@/balance';
import { CONTRACTS } from '../data/contracts';
import { MAX_MATCH_S, TICK, buildGame, playerTurn, seatPlayer } from './_game';

declare const process: { argv: string[]; exit(code: number): never };

/** Half-width of a nudge, as a share of the value: a tenth of the smallest step a pass tunes by. */
const NUDGE = 0.003;
/** Rates and stats on both seats' paths: training, income, travel, a fight's length. */
const KEYS = [
  'floors/trainRate',
  'econ/hustler/rate',
  'map/hopS',
  'units/razor/hp',
  'units/hexer/hp',
  'units/rigger/dps',
  'districts/nestHp',
];
const SETS = Number(process.argv[2] ?? 10);

/** A small seeded generator (mulberry32): the nudges of one set, reproducible from its seed. */
function draws(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Played {
  won: boolean;
  end: number;
}

/** Every contract's first attempt under one nudge set. */
function playSet(seed: number): Played[] {
  const game = buildGame();
  const [registry] = game.engine.tryInject(TuningRegistriesKey) ?? [];
  const next = draws(seed);
  for (const key of KEYS) {
    const base = Number(registry!.get(key)());
    const factor = 1 + (next() * 2 - 1) * NUDGE;
    registry!.override(key, () => base * factor);
  }
  const played = CONTRACTS.map((_, idx) => {
    game.roster.choose(idx);
    game.match.start();
    const live = () => game.match.phase.value !== 'won' && game.match.phase.value !== 'lost';
    playerTurn(game);
    const unseat = seatPlayer(game);
    try {
      runUntil({
        engine: game.engine,
        tickDelta: TICK,
        maxSimTime: MAX_MATCH_S,
        until: () => !live(),
      });
    } finally {
      unseat();
    }
    const result = { won: game.match.phase.value === 'won', end: game.match.clock.value };
    game.match.nextMatch();
    return result;
  });
  game.dispose();
  return played;
}

const sets = seedBatch(SETS).map(playSet);
const seconds = (n: number) => `${n.toFixed(0)}s`;

console.log(`── Match end over ${SETS} nudge sets (each key within ±${NUDGE * 100}%) ──`);
console.log('contract                 income   won      end: median [min–max]');
CONTRACTS.forEach((c, idx) => {
  const runs = sets.map((s) => s[idx]!);
  const { end } = spreadOf(runs, { end: (r) => r.end });
  const won = runs.filter((r) => r.won).length;
  console.log(
    `${c.rival.padEnd(24)} ×${String(c.incomeMult).padEnd(6)} ${`${won}/${SETS}`.padEnd(8)} ${formatSpread(end!, seconds)}`,
  );
});
process.exit(0);
