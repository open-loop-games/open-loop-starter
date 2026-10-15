/**
 * The packing: each board stage's claimed board re-scored on the shipping evaluator
 * (`../modules/layout.ts`), then a search for a better one, seeded with it and with the
 * previous stage's best. A stage that closes on a carrier gets a second board, for
 * firepower alone. Then the Coolant Manifold's gain, solved on the coolant stage. Prints;
 * never asserts. No engine boots: the evaluator is pure.
 *
 *   pnpm exec vite-node src/showcase/archetypes/packer/balance/packing-probe.ts [ship] [--deep] [--coolant]
 *
 * `ship` is frigate, lancer or flagship; without it every stage runs. `--deep` searches with
 * a larger budget and adds a cold search, seeded with nothing. `--coolant` adds the
 * Coolant Manifold's gain solve.
 *
 * Reading it:
 * - § stages: each stage's cells and conditions, then its claimed and best salvage (and
 *   firepower, for a fight), and the best board's counts. Flags: `NEW` a board not yet
 *   claimed, `SHAPE` a claimed board that no longer fits its hull, `DRIFT` a claimed board
 *   whose stored numbers are not what it scores now, `BETTER +x%` a search that beat it.
 *   Under `--deep`, `cold` is the unseeded search against the seeded one, and the better
 *   of the two is the best: a stage whose cold search lands on the seeded best has
 *   converged.
 * - § paste: `STAGE_PACKING` and `PACKING_BOARDS` as `../data/packing.ts` holds them, from
 *   the best boards. Paste it after a pass, then rerun the arc probe.
 * - § coolant: the best packing with and without manifolds at each gain the bisection
 *   tries, against one weapon's share of the stage's rate.
 *
 * Boards are keyed by search spec (`specKey`): stages that differ only in refits or honours
 * share one. The search is `./_search.ts`.
 */

import {
  COOLANT_GAIN,
  PACKING_BOARDS,
  STAGES,
  STAGE_PACKING,
  type BoardStage,
  type PieceId,
  type StagePacking,
} from '../data';
import {
  KICKS,
  bestPacking,
  decodeBoard,
  encodeBoard,
  openCells,
  paramsFor,
  scoreBoard,
  specKey,
  type Board,
  type Objective,
  type Packing,
} from './_search';

declare const process: { argv: string[] };

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('--'));
const deep = args.includes('--deep');
const solveCoolant = args.includes('--coolant');
/** Kicks under `--deep`, and the cold search's. */
const DEEP_KICKS = 800;

const fmtCounts = (c: Partial<Record<PieceId, number>>) =>
  Object.entries(c)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
const round = (n: number) => Number(n.toPrecision(5));
const pct = (a: number, b: number) => `${a >= b ? '+' : ''}${(((a - b) / b) * 100).toFixed(1)}%`;

/** A stage's best board for an objective: the claim re-scored, then searched from. */
interface Measured {
  best: Packing;
  claimed?: number;
  flags: string[];
  cold?: number;
}

const measured = new Map<string, Measured>();
/** The claimed board for a spec, scored as stored. */
const stored = (
  stage: BoardStage,
  score: Objective,
  claimedValue: number | undefined,
): { board?: Board; value?: number; flags: string[] } => {
  const rows = PACKING_BOARDS[specKey(stage, score)];
  if (!rows) return { flags: ['NEW'] };
  const board = decodeBoard(stage, rows);
  if (!board) return { flags: ['SHAPE'] };
  const value = scoreBoard(stage, board)[score];
  // Stored numbers carry five significant figures.
  const drift = claimedValue !== undefined && Math.abs(value - claimedValue) > 1e-4 * value;
  return { board, value, flags: drift ? ['DRIFT'] : [] };
};

function measure(
  stage: BoardStage,
  score: Objective,
  claimedValue: number | undefined,
  prev?: Board,
) {
  const key = specKey(stage, score);
  const done = measured.get(key);
  if (done) return done;
  const s = stored(stage, score, claimedValue);
  const seeds = [s.board, prev].filter((b): b is Board => !!b);
  const searched = bestPacking(stage, score, {
    seeds,
    restarts: s.board ? 0 : undefined,
    kicks: deep ? DEEP_KICKS : KICKS,
  });
  const flags = s.flags;
  if (s.value !== undefined && searched[score] > s.value * (1 + 1e-6))
    flags.push(`BETTER ${pct(searched[score], s.value)}`);
  const m: Measured = { best: searched, claimed: s.value, flags };
  if (deep) {
    // The cold search also competes: a seeded search can sit on the seed's local optimum.
    const cold = bestPacking(stage, score, { kicks: DEEP_KICKS });
    m.cold = cold[score];
    if (cold[score] > searched[score] * (1 + 1e-6)) {
      m.best = cold;
      if (
        s.value !== undefined &&
        cold[score] > s.value * (1 + 1e-6) &&
        !flags.some((f) => f.startsWith('BETTER'))
      )
        flags.push(`BETTER ${pct(cold[score], s.value)}`);
    }
  }
  measured.set(key, m);
  return m;
}

// ── stages ──
console.log(
  `== stages: claimed · best salvage (before refits and honours)${deep ? ' · cold' : ''} ==`,
);
const entries: [string, StagePacking][] = [];
let prev: Board | undefined;
let ship = '';
for (const stage of STAGES) {
  if (only && stage.ship !== only) continue;
  if (stage.ship !== ship) {
    ship = stage.ship;
    prev = undefined;
  }
  const claim = STAGE_PACKING[stage.key];
  const eco = measure(stage, 'salvage', claim?.salvage, prev);
  prev = eco.best.board;
  const entry: StagePacking = {
    salvage: round(eco.best.salvage),
    firepower: round(eco.best.firepower),
    counts: eco.best.counts,
  };
  const flags = [...eco.flags];
  let fight = '';
  if (stage.fights) {
    const war = measure(stage, 'firepower', claim?.combat?.firepower, eco.best.board);
    entry.combat = { firepower: round(war.best.firepower), counts: war.best.counts };
    flags.push(...war.flags.map((f) => `fight ${f}`));
    fight = ` · fight ${stage.fights.slice(8)} ${(war.claimed ?? 0).toFixed(1)} · ${war.best.firepower.toFixed(1)}${war.cold !== undefined ? ` · cold ${pct(war.cold, war.best.firepower)}` : ''} (${fmtCounts(war.best.counts)})`;
  }
  entries.push([stage.key, entry]);
  console.log(
    `  ${stage.key.padEnd(28)} ${String(openCells(stage.ship, stage.sections).length).padStart(2)}c ${stage.conditions.join('+') || 'calm'} · ${(eco.claimed ?? 0).toFixed(1)} · ${eco.best.salvage.toFixed(1)}${eco.cold !== undefined ? ` · cold ${pct(eco.cold, eco.best.salvage)}` : ''} (${fmtCounts(eco.best.counts)})${fight}${flags.length ? `  ${flags.join(' ')}` : ''}`,
  );
}

console.log('== paste: data/packing.ts ==');
console.log('export const STAGE_PACKING: Readonly<Record<string, StagePacking>> = {');
for (const [key, m] of entries) console.log(`  '${key}': ${JSON.stringify(m)},`);
console.log('};');
console.log('export const PACKING_BOARDS: Readonly<Record<string, readonly string[]>> = {');
for (const [key, m] of measured)
  console.log(`  '${key}': ${JSON.stringify(encodeBoard(m.best.board))},`);
console.log('};');

// ── coolant ──
if (solveCoolant) {
  const stage = STAGES.find((s) => s.key === 'frigate:unlock:coolant')!;
  const rows = PACKING_BOARDS[specKey(stage, 'salvage')];
  const claimed = rows ? decodeBoard(stage, rows) : null;
  // The coolant stage's board with its manifolds lifted, descended without them.
  const lifted = claimed
    ? new Map([...claimed].map(([k, f]) => [k, f?.type === 'coolant' ? null : f]))
    : undefined;
  const without = bestPacking(
    { ...stage, types: stage.types.filter((t) => t !== 'coolant') },
    'salvage',
    { seeds: lifted ? [lifted] : [], kicks: deep ? DEEP_KICKS : KICKS },
  );
  const weapons = (without.counts.pulse ?? 0) + (without.counts.rail ?? 0);
  const share = without.salvage / Math.max(1, weapons);
  console.log(
    `== coolant: best without manifolds ${without.salvage.toFixed(1)}, one weapon's share ${share.toFixed(1)} ==`,
  );
  const earns = (gain: number) => {
    const best = bestPacking(stage, 'salvage', {
      seeds: [without.board, ...(claimed ? [claimed] : [])],
      restarts: 0,
      kicks: deep ? DEEP_KICKS : KICKS,
      params: paramsFor(stage.conditions, gain),
    });
    const over = best.salvage - without.salvage;
    console.log(
      `  gain ${gain.toFixed(3)}: best ${best.salvage.toFixed(1)} (+${over.toFixed(1)}), manifolds ${best.counts.coolant ?? 0}`,
    );
    return over >= share;
  };
  let lo = 0;
  let hi = 2;
  while (hi - lo > 0.025) {
    const mid = (lo + hi) / 2;
    if (earns(mid)) hi = mid;
    else lo = mid;
  }
  console.log(`  solved: COOLANT_GAIN ≈ ${hi.toFixed(3)} (spine holds ${COOLANT_GAIN})`);
}
