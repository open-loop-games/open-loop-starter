/**
 * OL-768 farm-mana-pool rebalance fork discovery.
 *
 * Characterizes the three resolution forks for the Pass-6 all-or-nothing
 * trim dynamic that makes beat-3 + beat-6 unfireable under canonical
 * farm-mana-pool params {roam:2, trail:2}:
 *
 *   - **(α-content)** — change canonical params to {roam:1, trail:0}.
 *     Empirically lands beat-3 at sim 47s. No planner change.
 *   - **(β)**         — keep canonical params; bump initialMana so the
 *     16-loop progression items fit. Two candidates: 2720 (roam-only) and
 *     6720 (with trail). Risk: pushes beat-2 outside its [10s, 45s] window.
 *   - **(γ)**         — keep canonical params; chunk Pass 5 into per-level
 *     pieces so Pass 6 trims partially. Test chunkSize=4 per the OL-768
 *     description ("roam(4)+roam(4)+roam(4)+roam(4) instead of roam(16)").
 *
 * Prints beat-2 / beat-3 / beat-6 fire times per fork side-by-side, with
 * window-fit indicators. Discovery-shape only — no test, no commit, no
 * data-file mutation. Decision feeds OL-768 implementation.
 *
 * Run: `pnpm balance:discovery:looper-rebalance`.
 */

import { DEFAULT_LOOPER_DATA } from '../data';
import { BEAT_WINDOWS } from './beats';
import { InitialManaKey } from '../modules';
import {
  arcSimulatedFireSeconds,
  createBeatPredicates,
  projectArc,
  resolveTunables,
  type ProjectorProposal,
} from './projector';
import {
  generatePlan,
  projectActionVectors,
  type PlannedItem,
  type PlannerAccessor,
  type PlannerParams,
} from './planner';

// ─── Strategy params (canonical = current bot.ts FARM_MANA_POOL_PARAMS) ──

const CANONICAL_FARM_MANA_POOL: PlannerParams = {
  progressionTarget: { roam: 2, trail: 2, acquaint: 0, mark: 0 },
  manaUpOversupplyFactor: 1.0,
  tradeThreshold: 100,
  talentOverflowThreshold: 0,
};

const ALPHA_PARAMS: PlannerParams = {
  ...CANONICAL_FARM_MANA_POOL,
  progressionTarget: { roam: 1, trail: 0, acquaint: 0, mark: 0 },
};

// ─── (γ) chunked planner ─────────────────────────────────────────────────
//
// Reuses the canonical 7-pass `generatePlan` with `manaUpOversupplyFactor`
// pinned high enough to disable Pass 6 trim, then chunks progression items
// in the resulting plan and re-runs Pass 6 against the real budget. Behavior
// is identical to a "Pass 5 chunked + Pass 6 partial-trim" planner without
// requiring a structural planner.ts edit during discovery.

function chunkedPlanFn(chunkSize: number) {
  return (engine: PlannerAccessor, params: PlannerParams): PlannedItem[] => {
    // Step 1: generate plan with trim effectively disabled.
    const noTrimParams: PlannerParams = {
      ...params,
      manaUpOversupplyFactor: 1e12,
    };
    const rawPlan = generatePlan(engine, noTrimParams);
    const vectors = projectActionVectors(engine);
    const vectorById = new Map(vectors.map((v) => [v.def.id, v]));

    // Step 2: chunk progression items into chunkSize-loop pieces.
    const chunked: PlannedItem[] = [];
    for (const item of rawPlan) {
      const v = vectorById.get(item.actionId);
      if (v?.passSegment === 'progression' && item.loops > chunkSize) {
        let remaining = item.loops;
        while (remaining > 0) {
          const c = Math.min(chunkSize, remaining);
          chunked.push({ actionId: item.actionId, loops: c });
          remaining -= c;
        }
      } else {
        chunked.push(item);
      }
    }

    // Step 3: recompute the budget cap against chunked projection.
    const projectedManaAdded = chunked.reduce((sum, it) => {
      const vv = vectorById.get(it.actionId);
      return sum + (vv?.manaPerCompletion ?? 0) * it.loops;
    }, 0);
    const initialManaRef = engine.tryInject(InitialManaKey);
    const initialMana = Number(initialManaRef?.value ?? 0);
    const budgetCap = initialMana * params.manaUpOversupplyFactor + projectedManaAdded;

    // Step 4: pop tail items (= chunked progression items first, mirroring
    // canonical Pass 6 reverse-pass-order trim semantics).
    const cost = (p: PlannedItem[]): number =>
      p.reduce((s, it) => s + (vectorById.get(it.actionId)?.adjustedTicks ?? 0) * it.loops, 0);
    while (cost(chunked) > budgetCap && chunked.length > 0) {
      chunked.pop();
    }
    return chunked;
  };
}

// ─── Fork roster ─────────────────────────────────────────────────────────

interface Fork {
  id: string;
  desc: string;
  params: PlannerParams;
  proposed: ProjectorProposal;
  planFn?: ReturnType<typeof chunkedPlanFn>;
}

const FORKS: Fork[] = [
  {
    id: 'baseline',
    desc: 'canonical {2,2}, initialMana=1025 (rung-1 patch)',
    params: CANONICAL_FARM_MANA_POOL,
    proposed: { 'balance/initialMana': 1025 },
  },
  {
    id: 'α-content',
    desc: '{roam:1, trail:0}, initialMana=1025',
    params: ALPHA_PARAMS,
    proposed: { 'balance/initialMana': 1025 },
  },
  {
    id: 'β-2720',
    desc: 'canonical {2,2}, initialMana=2720 (roam-only fit)',
    params: CANONICAL_FARM_MANA_POOL,
    proposed: { 'balance/initialMana': 2720 },
  },
  {
    id: 'β-6720',
    desc: 'canonical {2,2}, initialMana=6720 (with trail fit)',
    params: CANONICAL_FARM_MANA_POOL,
    proposed: { 'balance/initialMana': 6720 },
  },
  {
    id: 'γ-chunk4',
    desc: 'canonical {2,2}, initialMana=1025, chunked Pass-5 (chunkSize=4)',
    params: CANONICAL_FARM_MANA_POOL,
    proposed: { 'balance/initialMana': 1025 },
    planFn: chunkedPlanFn(4),
  },
];

const DISCOVERY_BEATS = ['beat-2', 'beat-3', 'beat-6'] as const;

// Generous cap so beat-6 (talent-driven, can take ~90 loops) reaches.
const ARC_MAX_LOOPS = 2000;

// ─── Helpers ─────────────────────────────────────────────────────────────

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function fmtWindow(w: [number, number]): string {
  return `[${fmt(w[0])}, ${fmt(w[1])}]`;
}

function inWindow(sec: number, w: [number, number]): boolean {
  return isFinite(sec) && sec >= w[0] && sec <= w[1];
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]): string =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

interface ForkResult {
  fork: Fork;
  fires: Record<(typeof DISCOVERY_BEATS)[number], number>;
}

function runFork(fork: Fork): ForkResult {
  const tuning = resolveTunables(fork.proposed);
  const predicates = createBeatPredicates(DEFAULT_LOOPER_DATA, tuning);

  const fires: Record<string, number> = {};
  for (const beatId of DISCOVERY_BEATS) {
    const predicate = predicates[beatId];
    if (!predicate) throw new Error(`no synth predicate for ${beatId}`);
    const arc = projectArc(DEFAULT_LOOPER_DATA, fork.params, {
      breakPredicate: predicate,
      maxLoops: ARC_MAX_LOOPS,
      tuning,
      planFn: fork.planFn,
    });
    fires[beatId] = arc.fireSec === undefined ? Infinity : arcSimulatedFireSeconds(arc, 1);
  }
  return { fork, fires } as ForkResult;
}

// ─── Plan-shape introspection (single-loop probe at fresh state) ─────────

function describeLoop1Plan(fork: Fork): string {
  const tuning = resolveTunables(fork.proposed);
  // Build a minimal accessor for loop-1 plan inspection by reusing projectArc
  // with a never-firing predicate and maxLoops=1, then peeking the loop.
  const arc = projectArc(DEFAULT_LOOPER_DATA, fork.params, {
    breakPredicate: () => false,
    maxLoops: 1,
    tuning,
    planFn: fork.planFn,
  });
  const loop1 = arc.loops[0];
  if (!loop1) return '(empty)';
  // `completedActions` is the actually-executed sub-sequence under the
  // budget, as `{actionId, loops}` entries — already chunked by the planner.
  const pairs = loop1.completedActions.map((e) => `${e.actionId}×${e.loops}`);
  return `${pairs.join(' + ')} (${loop1.endMode}, ${loop1.loopElapsedSec.toFixed(1)}s)`;
}

// ─── main ────────────────────────────────────────────────────────────────

function main(): void {
  const t0 = Date.now();

  console.log('# OL-768 farm-mana-pool rebalance fork discovery\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log('Discovery beats: beat-2 (first loop ends), beat-3 (first progressVar level),');
  console.log('                 beat-6 (talent ≥ 1, loop ≥ 2)\n');
  console.log('Beat windows:');
  for (const beatId of DISCOVERY_BEATS) {
    console.log(`  ${beatId}: ${fmtWindow(BEAT_WINDOWS[beatId]!)}`);
  }
  console.log();

  const results = FORKS.map(runFork);

  // ── Fire-time table ─────────────────────────────────────────────────
  const fireRows = results.map((r) => {
    const cells: string[] = [r.fork.id];
    for (const beatId of DISCOVERY_BEATS) {
      const sec = r.fires[beatId];
      const win = BEAT_WINDOWS[beatId]!;
      const fit = inWindow(sec, win) ? '✓' : 'NO';
      cells.push(`${fmt(sec)} ${fit}`);
    }
    cells.push(r.fork.desc);
    return cells;
  });
  console.log(renderTable(['fork', 'beat-2', 'beat-3', 'beat-6', 'description'], fireRows));
  console.log();

  // ── Loop-1 plan shape (helps explain why beats fire / don't fire) ────
  console.log('## Loop-1 plan shape (post-trim, executed sub-sequence)\n');
  for (const fork of FORKS) {
    console.log(`  ${fork.id.padEnd(12)} → ${describeLoop1Plan(fork)}`);
  }
  console.log();

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('## Window-fit summary\n');
  for (const r of results) {
    const fits = DISCOVERY_BEATS.filter((b) => inWindow(r.fires[b], BEAT_WINDOWS[b]!)).length;
    console.log(`  ${r.fork.id.padEnd(12)} — ${fits}/${DISCOVERY_BEATS.length} beats in-window`);
  }
  console.log();

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
