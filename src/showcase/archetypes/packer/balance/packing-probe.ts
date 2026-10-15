/**
 * The packing: each board stage's best arrangement, found by local search on the shipping
 * evaluator (`../modules/layout.ts`), beside the claim `STAGE_PACKING` holds for it in
 * `../data/spine.ts`. Then the Coolant Manifold's gain, solved on the coolant stage.
 * Prints; never asserts. No engine boots: the evaluator is pure.
 *
 *   pnpm exec vite-node src/showcase/archetypes/packer/balance/packing-probe.ts
 *
 * About 2 s.
 *
 * Reading it:
 * - § stages: each stage's cells and types, the claimed and the measured rate (dps before
 *   the refits), and the measured counts. `DRIFT` marks a claim more than 2% off. § paste
 *   is the measured table in `STAGE_PACKING`'s shape.
 * - § coolant: the best coolant-stage packing with and without manifolds at each gain the
 *   bisection tries, against one weapon's share of the stage's rate. The solved gain is
 *   the smallest at which manifolds earn that share.
 *
 * The search: from a seed board (the previous stage's best, its new cells random) and from
 * random boards, it changes one cell's type, or trades two cells' types, while board
 * firepower rises. A seeded RNG keeps runs repeatable.
 */

import {
  BEACON_GAIN,
  COOLANT_GAIN,
  HULL_H,
  HULL_W,
  LINK_BOOST,
  PULSE_DPS,
  RAIL_DPS,
  STAGES,
  STAGE_PACKING,
  sectionAt,
  type BoardStage,
  type PieceId,
} from '../data';
import { RELATION_OFFSETS, boardTotal, type LayoutParams, type OccupancyView } from '../modules';

const RESTARTS = 24;

const params = (coolantGain = COOLANT_GAIN): LayoutParams => ({
  dps: { pulse: PULSE_DPS, rail: RAIL_DPS },
  boost: { capacitor: LINK_BOOST, targeting: LINK_BOOST },
  beaconGain: BEACON_GAIN,
  coolantGain,
});

/** mulberry32 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Board = Map<string, PieceId>;

function viewOf(cells: Board): OccupancyView {
  return {
    occupantAt: (x, y) => {
      const type = cells.get(`${x},${y}`);
      return type ? { id: `${x},${y}`, type } : null;
    },
    *reach(x, y, relation) {
      for (const o of RELATION_OFFSETS[relation]) yield { x: x + o.dx, y: y + o.dy };
    },
    *occupied() {
      for (const [k, type] of cells) {
        const [x, y] = k.split(',').map(Number) as [number, number];
        yield { id: k, type, x, y };
      }
    },
  };
}

const openCells = (stage: BoardStage) => {
  const out: string[] = [];
  for (let y = 0; y < HULL_H; y++)
    for (let x = 0; x < HULL_W; x++) {
      const s = sectionAt(x, y);
      if (s >= 0 && s <= stage.sections) out.push(`${x},${y}`);
    }
  return out;
};

/** The best board found for a stage's cells and types. */
function bestPacking(stage: BoardStage, types: readonly PieceId[], p: LayoutParams, seed?: Board) {
  const cells = openCells(stage);
  const random = rng(cells.length * 131 + types.length);
  let best: { rate: number; board: Board } = { rate: -1, board: new Map() };
  for (let r = 0; r < RESTARTS; r++) {
    const board: Board = new Map();
    for (const k of cells) {
      const seeded = r === 0 ? seed?.get(k) : undefined;
      board.set(
        k,
        seeded && types.includes(seeded) ? seeded : types[Math.floor(random() * types.length)]!,
      );
    }
    let rate = boardTotal(viewOf(board), p);
    for (let improved = true; improved;) {
      improved = false;
      for (const k of cells)
        for (const t of types) {
          const old = board.get(k)!;
          if (old === t) continue;
          board.set(k, t);
          const next = boardTotal(viewOf(board), p);
          if (next > rate + 1e-9) {
            rate = next;
            improved = true;
          } else board.set(k, old);
        }
      for (let a = 0; a < cells.length; a++)
        for (let b = a + 1; b < cells.length; b++) {
          const ta = board.get(cells[a]!)!;
          const tb = board.get(cells[b]!)!;
          if (ta === tb) continue;
          board.set(cells[a]!, tb);
          board.set(cells[b]!, ta);
          const next = boardTotal(viewOf(board), p);
          if (next > rate + 1e-9) {
            rate = next;
            improved = true;
          } else {
            board.set(cells[a]!, ta);
            board.set(cells[b]!, tb);
          }
        }
    }
    if (rate > best.rate) best = { rate, board: new Map(board) };
  }
  const counts: Partial<Record<PieceId, number>> = {};
  for (const t of best.board.values()) counts[t] = (counts[t] ?? 0) + 1;
  return { ...best, counts };
}

const fmtCounts = (c: Partial<Record<PieceId, number>>) =>
  Object.entries(c)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

// ── stages ──
console.log('== stages: claimed · measured (dps before refits) ==');
const measured: { rate: number; counts: Partial<Record<PieceId, number>> }[] = [];
let seed: Board | undefined;
let coolantIndex = -1;
for (const [j, stage] of STAGES.entries()) {
  const best = bestPacking(stage, stage.types, params(), seed);
  seed = best.board;
  measured.push({ rate: best.rate, counts: best.counts });
  if (stage.after === 'unlock:coolant') coolantIndex = j;
  const claim = STAGE_PACKING[j]!.rate;
  const drift = Math.abs(best.rate - claim) / best.rate > 0.02 ? '  DRIFT' : '';
  console.log(
    `  ${String(j).padStart(2)} ${stage.after.padEnd(20)} ${String(stage.cells).padStart(2)} cells  ${claim.toFixed(1).padStart(7)} · ${best.rate.toFixed(1).padStart(7)}  ${fmtCounts(best.counts)}${drift}`,
  );
}
console.log('== paste: STAGE_PACKING ==');
for (const m of measured)
  console.log(`  { rate: ${Number(m.rate.toFixed(2))}, counts: { ${fmtCounts(m.counts)} } },`);

// ── coolant ──
const stage = STAGES[coolantIndex]!;
const without = bestPacking(
  stage,
  stage.types.filter((t) => t !== 'coolant'),
  params(),
);
const weapons = (without.counts.pulse ?? 0) + (without.counts.rail ?? 0);
const share = without.rate / Math.max(1, weapons);
console.log(
  `== coolant: stage ${coolantIndex}, best without manifolds ${without.rate.toFixed(1)}, one weapon's share ${share.toFixed(1)} ==`,
);
const earns = (gain: number) => {
  const best = bestPacking(stage, stage.types, params(gain), without.board);
  const gainOver = best.rate - without.rate;
  console.log(
    `  gain ${gain.toFixed(3)}: best ${best.rate.toFixed(1)} (+${gainOver.toFixed(1)}), manifolds ${best.counts.coolant ?? 0}`,
  );
  return gainOver >= share;
};
let lo = 0;
let hi = 2;
while (hi - lo > 0.025) {
  const mid = (lo + hi) / 2;
  if (earns(mid)) hi = mid;
  else lo = mid;
}
console.log(`  solved: COOLANT_GAIN ≈ ${hi.toFixed(3)} (spine holds ${COOLANT_GAIN})`);
