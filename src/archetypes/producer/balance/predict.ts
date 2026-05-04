/**
 * Closed-form spec inspection — pure math via engine queries, no sim.
 *
 *   pnpm exec vite-node src/archetypes/producer/balance/predict.ts
 *
 * Walks a strict-tier-order schedule against a static engine instance
 * (no bot, no ticks). Each step's Δt is the engine's own
 * `repeatable.getCost(1)` divided by `getTotalRate` at the frozen state
 * — the full modifier chain applies. Bot policy walks a different path
 * through the same lattice; mismatch with `./run.ts` is the calibration
 * signal, not a defect.
 */

import { PRODUCER_BALANCE } from '..';
import { arcWaypoints, strictTierOrderSchedule } from './spec';

// Third milestone threshold (default 25): the count at which the tier-up
// feel of a milestone-bonus stack reads as "earned". Caller knob.
const PER_TIER_COUNT = Number(PRODUCER_BALANCE.milestoneThresholds[2] ?? 25);

const SCHEDULE = strictTierOrderSchedule({ perTierCount: PER_TIER_COUNT });

// Cursor seeded at 1 to skip the click-driven bootstrap (bot territory).
const INITIAL: Readonly<Record<string, number>> = { cursor: 1 };

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞';
  if (sec < 1) return `${sec.toFixed(2)}s`;
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

function main(): void {
  console.log('# Producer closed-form arc (engine queried as pure math)\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log(
    'Cursor seeded at 1 (click bootstrap not modeled). Higher tiers bootstrap from frozen lower-tier production.',
  );
  console.log(
    "Each Δt is the engine's `repeatable.getCost(1)` ÷ `getTotalRate` at the frozen step state — full modifier chain applied.\n",
  );

  const wps = arcWaypoints(SCHEDULE, INITIAL);
  const wpRows = wps.map((w, i) => {
    const counts = Object.entries(w.counts)
      .filter(([, c]) => c > 0)
      .map(([id, c]) => `${id}:${c}`)
      .join(' ');
    const action = w.step.kind === 'tier' ? `tier ${w.step.id} → ${w.step.to}` : `buy ${w.step.id}`;
    return [String(i + 1), action, fmt(w.atSec), counts];
  });
  console.log(renderTable(['#', 'action', 'total', 'counts after'], wpRows));
  console.log();
  console.log(`Total schedule time: ${fmt(wps[wps.length - 1]!.atSec)}`);
}

main();
