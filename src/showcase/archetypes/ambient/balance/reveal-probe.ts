/**
 * Ambient reveal-cadence probe — does the unfold order match the tier order,
 * and when does each reveal actually land?
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/ambient/balance/reveal-probe.ts`.
 *
 * Every producer reveal in `data/unlocks.ts` thresholds on the same quantity
 * (lifetime primary), so their thresholds and the producer tier order are two
 * statements of one intent — and nothing compares them. A solver bisecting one
 * reveal against a beat window moves it independently of the other four, which
 * is how `coop-built` came to reveal the tier-2 producer last, roughly 150×
 * past the orchard.
 *
 * A test cannot own this. Threshold values are measured, so an assertion on
 * them reds on every legitimate retune — but the *order* is design intent, and
 * the gap between reveals is a pacing reading a human should look at. So this
 * prints both: the ordering check as a verdict, the cadence as a table.
 *
 * The same shape generalises past this archetype — a design stated in prose
 * beside the data it describes, with nothing comparing the two. See
 * `candidate-balance-methods.md` § Design prose and shipping data drift apart.
 */

import { runUntil } from '@open-loop/engine';
import { DEFAULT_AMBIENT_DATA } from '../data';
import { getUnlocks } from '../modules';
import { buildAmbientSimEngine } from './bot';

const HORIZON_SEC = 12 * 3600;

interface RevealRow {
  unlockId: string;
  producerId: string;
  tier: number;
  threshold: number;
  firedAtSec: number | null;
}

/** Producer reveals in tier order, as `data/producers.ts` declares them. */
function producerReveals(): Omit<RevealRow, 'firedAtSec'>[] {
  const { producers, unlocks } = DEFAULT_AMBIENT_DATA;
  return producers.map((p, tier) => {
    const unlock = unlocks.find(
      (u) => u.reveals.kind === 'producer' && u.reveals.producerId === p.id,
    );
    if (!unlock) throw new Error(`ambient/reveal-probe: no reveal for producer '${p.id}'`);
    return {
      unlockId: unlock.id,
      producerId: p.id,
      tier: tier + 1,
      threshold: Number(unlock.threshold),
    };
  });
}

/** Drive the shipping build once, recording the sim-time each reveal flips. */
function measureFireTimes(rows: Omit<RevealRow, 'firedAtSec'>[]): RevealRow[] {
  const engine = buildAmbientSimEngine();
  const unlocks = getUnlocks();
  const firedAt = new Map<string, number>();

  runUntil({
    engine,
    until: ({ simTime }) => {
      for (const row of rows) {
        if (firedAt.has(row.unlockId)) continue;
        if (unlocks.getPurchasable(row.unlockId)?.active.value) {
          firedAt.set(row.unlockId, simTime);
        }
      }
      return firedAt.size === rows.length;
    },
    maxSimTime: HORIZON_SEC,
    tickDelta: 1,
  });

  return rows.map((r) => ({ ...r, firedAtSec: firedAt.get(r.unlockId) ?? null }));
}

function fmtDuration(sec: number | null): string {
  if (sec == null) return `not within ${HORIZON_SEC / 3600}h`;
  if (sec < 60) return `${sec.toFixed(0)}s`;
  if (sec < 3600) return `${(sec / 60).toFixed(1)}m`;
  return `${(sec / 3600).toFixed(2)}h`;
}

function main(): void {
  const rows = measureFireTimes(producerReveals());

  console.log('# Ambient reveal cadence\n');
  console.log(
    '| tier | producer | unlock | threshold | reveals at |\n|---|---|---|---|---|\n' +
      rows
        .map(
          (r) =>
            `| ${r.tier} | ${r.producerId} | ${r.unlockId} | ${r.threshold.toLocaleString()} | ${fmtDuration(r.firedAtSec)} |`,
        )
        .join('\n'),
  );

  // Ordering is design intent, not a measured value: tier N must not become
  // visible after tier N+1. Reported as a verdict because the answer is
  // structural — there is no band to widen.
  const outOfOrder = rows
    .slice(1)
    .filter((r, i) => r.threshold < rows[i]!.threshold)
    .map((r) => `tier ${r.tier} (${r.producerId}) reveals before tier ${r.tier - 1}`);

  console.log('\n## Reveal order vs tier order\n');
  if (outOfOrder.length === 0) {
    console.log('OK — reveals ascend with tier.\n');
  } else {
    console.log('MISMATCH — the unfold contradicts the tier ladder:\n');
    for (const line of outOfOrder) console.log(`  - ${line}`);
    console.log('\nA reveal threshold is on the perturbation surface; a solver may');
    console.log('have moved one against a beat window without regard for the others.\n');
  }

  // Gap between consecutive reveals — the "gentle unfold cadence" the identity
  // claims. No target band: read it against the arc's shape.
  console.log('## Gap between consecutive reveals\n');
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]!;
    const cur = rows[i]!;
    const gap =
      prev.firedAtSec != null && cur.firedAtSec != null ? cur.firedAtSec - prev.firedAtSec : null;
    console.log(`  ${prev.producerId} → ${cur.producerId}: ${fmtDuration(gap)}`);
  }
  console.log();
}

main();
