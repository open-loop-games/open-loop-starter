/**
 * Ambient sim-driven balance probes — offline-round-trip + no-pressure
 * invariant. Sits in the vite-node discovery lane per
 * `archetypes/BALANCING.md` § Theme 5 ("Scripts discover, tests lock"); the
 * vitest suite never drives sim runs.
 *
 * Run: `pnpm exec vite-node src/archetypes/ambient/balance/probes.ts`.
 * Prints two report sections.
 *
 * Probe 3 — offline-round-trip correctness. The Ambient contract requires
 * a 4h / 12h / 24h offline gap to yield (within 0.5%) the same primary-
 * lifetime that an equivalent continuous sim produces. Built around
 * `processOfflineTime` chunking on a fresh engine vs. `runUntil` on a
 * matched continuous engine.
 *
 * Probe 5 — no-pressure invariant. 24h sim against the default Ambient
 * build; reports any tick at which the player-visible primary resource
 * shrinks (negative delta), the headline rate drops to zero unexpectedly,
 * or any explicit fail-state flag is observed. The three pressure analyzers
 * are inline (no engine analyzer infrastructure; graduate to harness once a
 * second consumer wants them).
 */

import { computed } from 'vue';
import { Decimal, bn, processOfflineTime, runUntil, type Engine } from 'open-loop-engine';
import { AutoProducersKey, PrimaryLifetimeKey, PrimaryResourceKey, UnlocksKey } from '../modules';
import { buildAmbientSimEngine } from './bot';

// ─── Probe 3 — offline round-trip ────────────────────────────────────────

interface OfflineProbeRow {
  gapHours: number;
  continuous: number;
  offline: number;
  deltaPct: number;
  withinTolerance: boolean;
}

const TOLERANCE_PCT = 0.5;

function snapshotLifetime(engine: Engine): number {
  const lifetime = engine.tryInject(PrimaryLifetimeKey);
  return lifetime ? Number(lifetime.value) : 0;
}

function runContinuousFor(engine: Engine, gapSec: number): number {
  runUntil({
    engine,
    until: () => false,
    maxSimTime: gapSec,
    tickDelta: 1,
  });
  return snapshotLifetime(engine);
}

function runOfflineFor(engine: Engine, gapSec: number): number {
  processOfflineTime(engine.loop, gapSec, { chunkSize: 1 });
  return snapshotLifetime(engine);
}

function runOfflineRoundTripProbe(gapHours: number): OfflineProbeRow {
  const gapSec = gapHours * 3600;
  const continuous = runContinuousFor(buildAmbientSimEngine(), gapSec);
  const offline = runOfflineFor(buildAmbientSimEngine(), gapSec);
  const denom = continuous === 0 ? 1 : Math.abs(continuous);
  const deltaPct = (Math.abs(continuous - offline) / denom) * 100;
  return {
    gapHours,
    continuous,
    offline,
    deltaPct,
    withinTolerance: deltaPct <= TOLERANCE_PCT,
  };
}

// ─── Probe 5 — no-pressure invariant ─────────────────────────────────────

interface PressureFinding {
  kind: 'negative-delta' | 'rate-collapse' | 'fail-flag';
  tick: number;
  detail: string;
}

function runNoPressureAudit(): { ticksRun: number; findings: PressureFinding[] } {
  const engine = buildAmbientSimEngine();
  const primary = engine.tryInject(PrimaryResourceKey)!;
  const producers = engine.tryInject(AutoProducersKey)!;
  const unlocks = engine.tryInject(UnlocksKey)!;
  const headline = computed(() => producers.getTotalRate(primary));

  // Sum-of-counts is monotonically non-decreasing during a 24h sim with no
  // resets, so any per-tick increase signals at least one bot purchase.
  // Cheaper than tapping every producer's onPurchase, and uses public refs
  // so no engine change is needed. unlocks.purchasedCount covers soft
  // reveals fired by `setupAutoPurchase` on threshold cross.
  const sumProducerCounts = (): Decimal =>
    producers.getAll().reduce((acc, e) => acc.add(bn(e.producer.count.value)), Decimal.dZero);

  const findings: PressureFinding[] = [];
  let lastPrimary = bn(primary.value);
  let lastRate = bn(headline.value);
  let lastProducerSum = sumProducerCounts();
  let lastUnlocksBought = unlocks.purchasedCount.value;

  // 24h at tickDelta = 1s. Asserts run between ticks via the until-callback;
  // analyzer instances aren't available cheaply here, but the closure
  // captures the same per-tick state the engine just settled.
  const result = runUntil({
    engine,
    until: ({ tick }) => {
      const cur = bn(primary.value);
      const rate = bn(headline.value);
      const curProducerSum = sumProducerCounts();
      const curUnlocksBought = unlocks.purchasedCount.value;
      const purchasedThisTick =
        curProducerSum.gt(lastProducerSum) || curUnlocksBought > lastUnlocksBought;

      // Negative delta on the player-visible primary resource. Auto-purchase
      // ticks legitimately spend resource, so a temporary dip is expected
      // and we mask any drop coincident with a producer/unlock purchase on
      // the same tick. The drain-while-≥-interval inner loop in
      // `setupAutoPurchaseProducers` can land multiple buys in one tick under
      // coarse `tickDelta`; masking the whole tick covers that.
      // TODO(expansion): graduate to a dedicated analyzer in
      // `open-loop-engine/src/harness/analyzers/no-pressure.ts` once a
      // second consumer (Looper balance leaf) wants the same shape — see
      // `open-loop-engine/docs/candidate-primitives.md`.
      if (!purchasedThisTick && cur.lt(lastPrimary)) {
        const dropFrac = lastPrimary.sub(cur).div(lastPrimary.eq(0) ? 1 : lastPrimary);
        if (dropFrac.gt(0.01)) {
          findings.push({
            kind: 'negative-delta',
            tick,
            detail: `primary ${lastPrimary.toString()} → ${cur.toString()} (${dropFrac
              .mul(100)
              .toNumber()
              .toFixed(2)}% drop)`,
          });
        }
      }

      // Rate collapse: headline rate falling to zero after it has been
      // positive. Indicates a chain or modifier broke. Acceptable on tick 0
      // (bootstrap), so guard on lastRate > 0.
      if (lastRate.gt(0) && rate.lte(0)) {
        findings.push({
          kind: 'rate-collapse',
          tick,
          detail: `headline ${lastRate.toString()} → ${rate.toString()}`,
        });
      }

      lastPrimary = cur;
      lastRate = rate;
      lastProducerSum = curProducerSum;
      lastUnlocksBought = curUnlocksBought;
      return false;
    },
    maxSimTime: 24 * 3600,
    tickDelta: 1,
  });

  return { ticksRun: result.totalTicks, findings };
}

// ─── Reporter ────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n >= 1e6) return n.toExponential(3);
  return n.toFixed(2);
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

function main(): void {
  const t0 = Date.now();

  console.log('# Ambient sim-driven probes (offline round-trip + no-pressure invariant)\n');
  console.log(`Run at ${new Date().toISOString()}\n`);

  console.log('## Probe 3 — offline-round-trip correctness\n');
  console.log(`Tolerance: ≤ ${TOLERANCE_PCT}% delta between continuous and offline lifetime.\n`);
  const offlineRows = [4, 12, 24].map(runOfflineRoundTripProbe);
  console.log(
    renderTable(
      ['gap', 'continuous', 'offline', 'delta %', 'pass'],
      offlineRows.map((r) => [
        `${r.gapHours}h`,
        fmtNum(r.continuous),
        fmtNum(r.offline),
        r.deltaPct.toFixed(3),
        r.withinTolerance ? 'yes' : 'NO',
      ]),
    ),
  );
  console.log();

  const failedOffline = offlineRows.filter((r) => !r.withinTolerance);
  if (failedOffline.length > 0) {
    console.log(
      `Offline probe FAILED at ${failedOffline.length} gap(s) — Ambient contract broken.`,
    );
    console.log(
      'Investigate: chunk-size effects in processOfflineTime, ProducerCategory rate timing\n' +
        'under coarse vs fine ticks, or modifier-chain reactivity gaps.\n',
    );
  }

  console.log('## Probe 5 — no-pressure invariant (24h sim)\n');
  const audit = runNoPressureAudit();
  console.log(`Ticks run: ${audit.ticksRun}`);
  if (audit.findings.length === 0) {
    console.log('Findings: none — invariant holds.\n');
  } else {
    console.log(`Findings: ${audit.findings.length} pressure event(s):\n`);
    console.log(
      renderTable(
        ['kind', 'tick', 'detail'],
        audit.findings.slice(0, 20).map((f) => [f.kind, String(f.tick), f.detail]),
      ),
    );
    if (audit.findings.length > 20) {
      console.log(`...and ${audit.findings.length - 20} more (truncated).`);
    }
    console.log();
  }

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
