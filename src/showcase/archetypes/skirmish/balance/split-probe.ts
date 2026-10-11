/**
 * Skirmish split probe — the win-rate surface over the guns-versus-butter axis.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/skirmish/balance/split-probe.ts
 *
 * This is the archetype's signature probe. `../IDENTITY.md` § Rate-function
 * spine says the optimum for `φ` is a best-response fixed point rather than an
 * expression — so the thing to look at is the whole payoff matrix, not a number.
 * Every cell drives the SHIPPING automation on a real engine and prints.
 *
 * What to read:
 *
 * - **The diagonal must be stalemate.** Identical seats are a mirror; a decided
 *   diagonal cell means the sim favours a seat, which is a bug wearing a balance
 *   result's clothes. Two such bugs were found this way.
 * - **A dominant row is a dead axis.** If one `φ` beats everything, the split
 *   is not a decision and the archetype has no strategy space.
 * - **Intransitivity is the good outcome.** Rock-paper-scissors between splits
 *   — low beats mid, mid beats high, high beats low — is what makes the
 *   best-response fixed point non-trivial and the opponent worth reading.
 */

import { buildSkirmishSimEngine, createOutcomeCapture, seatsAtShare } from './_engine';
import { ECONOMY_BALANCE, GROWTH_CONSTANT } from '../data/economy';

const SPLITS = [0, 0.2, 0.4, 0.6, 0.8];
const STEP_SEC = 0.5;
/** Long enough that a compounding seat can reach its crossover, short enough to run. */
const MAX_SEC = 600;

interface Cell {
  a: number;
  b: number;
  winner: string;
  durationSec: number;
  resolved: boolean;
}

function runCell(shareA: number, shareB: number): Cell {
  const engine = buildSkirmishSimEngine({
    ...seatsAtShare(shareA, shareB),
    maxDeltaTime: STEP_SEC * 4,
  });
  const capture = createOutcomeCapture(engine);
  let t = 0;
  while (t < MAX_SEC && capture.reason === null) {
    engine.tickDriver.advanceTime(STEP_SEC);
    t += STEP_SEC;
  }
  return {
    a: shareA,
    b: shareB,
    winner: capture.winner ?? '—',
    durationSec: capture.reason === null ? MAX_SEC : capture.durationSec,
    resolved: capture.reason === 'defeat',
  };
}

console.log('# Skirmish split probe — win-rate surface over φ\n');
console.log(
  `r = ${GROWTH_CONSTANT.toFixed(4)}/s · c = ${ECONOMY_BALANCE.workerCost} · ` +
    `E₀ = ${ECONOMY_BALANCE.startingWorkers}\n`,
);
console.log(`Seats differ ONLY on φ; cadence and burst are held at the rush persona,`);
console.log(`so the axis is clean. Unresolved after ${MAX_SEC}s reads as a stalemate.\n`);

const cells: Cell[] = [];
for (const a of SPLITS) {
  for (const b of SPLITS) cells.push(runCell(a, b));
}

// ─── The matrix ──────────────────────────────────────────────────────────────

console.log('## Winner by (row = a’s φ, column = b’s φ)\n');
console.log('| a\\b | ' + SPLITS.map((s) => s.toFixed(1)).join(' | ') + ' |');
console.log('|---' + SPLITS.map(() => '|---').join('') + '|');
for (const a of SPLITS) {
  const row = SPLITS.map((b) => {
    const c = cells.find((x) => x.a === a && x.b === b)!;
    return c.resolved ? c.winner : 'draw';
  });
  console.log(`| **${a.toFixed(1)}** | ${row.join(' | ')} |`);
}

console.log('\n## Match duration, same layout (s)\n');
console.log('| a\\b | ' + SPLITS.map((s) => s.toFixed(1)).join(' | ') + ' |');
console.log('|---' + SPLITS.map(() => '|---').join('') + '|');
for (const a of SPLITS) {
  const row = SPLITS.map((b) => {
    const c = cells.find((x) => x.a === a && x.b === b)!;
    return c.resolved ? c.durationSec.toFixed(0) : `>${MAX_SEC}`;
  });
  console.log(`| **${a.toFixed(1)}** | ${row.join(' | ')} |`);
}

// ─── Readings ────────────────────────────────────────────────────────────────

console.log('\n## Readings\n');

const diagonal = cells.filter((c) => c.a === c.b);
const decidedDiagonal = diagonal.filter((c) => c.resolved);
if (decidedDiagonal.length === 0) {
  console.log(`- **Mirror symmetry holds.** All ${diagonal.length} diagonal cells stalemate.`);
} else {
  console.log(
    `- **MIRROR BROKEN** — ${decidedDiagonal.length} diagonal cell(s) decided: ` +
      decidedDiagonal.map((c) => `φ=${c.a}→${c.winner}`).join(', ') +
      '. Identical seats produced different outcomes, so the sim is asymmetric.',
  );
  console.log('  Treat every other number here as unreliable until that is fixed.');
}

// Per-split record as seat `a`, against every opponent split.
console.log('\n- **Record for each φ, playing as seat a:**');
for (const a of SPLITS) {
  const mine = cells.filter((c) => c.a === a && c.a !== c.b);
  const wins = mine.filter((c) => c.resolved && c.winner === 'a').length;
  const losses = mine.filter((c) => c.resolved && c.winner === 'b').length;
  const draws = mine.length - wins - losses;
  console.log(`  - φ=${a.toFixed(1)}: ${wins}W ${losses}L ${draws}D`);
}

// `beats[x]` — the splits that x defeats. Read from both orientations of each
// pairing; they agree when the sim is symmetric, which the diagonal check above
// is what establishes.
const beats = new Map<number, Set<number>>(SPLITS.map((s) => [s, new Set<number>()]));
for (const c of cells) {
  if (!c.resolved || c.a === c.b) continue;
  const winner = c.winner === 'a' ? c.a : c.b;
  const loser = c.winner === 'a' ? c.b : c.a;
  beats.get(winner)!.add(loser);
}

// Intransitive triples — the rock-paper-scissors that makes the best response
// depend on the opponent. Finding one is the design goal, not a curiosity.
const cycles: string[] = [];
for (const x of SPLITS) {
  for (const y of SPLITS) {
    for (const z of SPLITS) {
      if (x === y || y === z || x === z) continue;
      if (x >= y || y >= z) continue; // one ordering per triple
      if (beats.get(x)!.has(y) && beats.get(y)!.has(z) && beats.get(z)!.has(x)) {
        cycles.push(`${x} → ${y} → ${z} → ${x}`);
      } else if (beats.get(x)!.has(z) && beats.get(z)!.has(y) && beats.get(y)!.has(x)) {
        cycles.push(`${x} → ${z} → ${y} → ${x}`);
      }
    }
  }
}

const undefeated = SPLITS.filter((s) => {
  const losses = cells.filter(
    (c) =>
      c.resolved &&
      c.a !== c.b &&
      ((c.a === s && c.winner === 'b') || (c.b === s && c.winner === 'a')),
  );
  return losses.length === 0;
});
console.log('');
if (undefeated.length === 1) {
  console.log(
    `- **φ=${undefeated[0]} is undefeated** — a dominant split means the axis is dead and` +
      ' the archetype has no strategy space to read. This is the finding to act on.',
  );
} else if (undefeated.length === 0) {
  console.log('- **No dominant split** — every φ loses to something. That is the intended');
  console.log('  shape: the best response depends on the opponent, which is exactly why');
  console.log('  the spine declines to close this term.');
} else {
  console.log(`- ${undefeated.length} splits undefeated (${undefeated.join(', ')}) — a plateau`);
  console.log('  rather than a peak. Widen the sweep before reading much into it.');
}

console.log('');
if (cycles.length > 0) {
  console.log(`- **Intransitive — ${cycles.length} cycle(s) in the payoff matrix:**`);
  for (const c of cycles) console.log(`  - ${c}`);
  console.log('  This is the outcome worth having. A cycle means no split is simply');
  console.log('  correct, so reading the opponent is the game and the best-response');
  console.log('  fixed point is genuinely non-trivial — the replicator shape at');
  console.log('  `…/rate-functions/bifurcations#strategy-space-integration`.');
} else {
  console.log('- **No intransitivity** — the splits form a strict pecking order, so the');
  console.log('  best φ can be read off a list and the opponent never changes the answer.');
  console.log('  Playable, but the strategy space is one-dimensional.');
}

const dominated = SPLITS.filter((s) => beats.get(s)!.size === 0);
if (dominated.length > 0) {
  console.log(
    `\n- Dominated split(s): ${dominated.join(', ')} — beaten by everything, beating` +
      ' nothing. Over-investment being punished by the opponent rather than by an' +
      ' arithmetic wall is the design intent (`../data/economy.ts` § Balance); a' +
      ' dominated split at the LOW end would be the surprising one.',
  );
}

const stalemates = cells.filter((c) => !c.resolved && c.a !== c.b).length;
if (stalemates > 0) {
  console.log(
    `\n- ${stalemates} off-diagonal stalemate(s). Two seats that cannot break each` +
      ` other inside ${MAX_SEC}s is a content reading: army throughput is not` +
      ' outrunning base HP at those splits.',
  );
}
