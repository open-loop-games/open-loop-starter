/**
 * The arc: one cold start through three ships to the Dreadnought's fall, under the
 * reference fitter (`./_fitter.ts`), on the real engine and modules. Prints every beat and
 * carrier beside the spine's walk, the flow channel of each gap, the fitter's tallies, and
 * each ship's board as it was relieved. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/packer/balance/arc-probe.ts [dt]
 *
 * TRACE=1 adds a line a minute.
 *
 * Reading it:
 * - `Δt` is measured minus the walk's time. A beat ahead of the walk is negative.
 * - `income` is salvage a second when the beat fired; `pred.inc` is the walk's at its time.
 * - `channel` classes the gap since the previous beat (`classifyFlowChannel`).
 * - `withdrawals` counts engagements a carrier survived: the fitter engages only once a
 *   window's fire covers the hull, so a withdrawal is a hull the layout fell short of.
 */

import { classifyFlowChannel } from '@open-loop/engine';
import { ARC_END_S, BEAT_TIME, predictedIncome } from '../data';
import { DT, runArc } from './_fitter';

declare const process: { argv: string[]; env: Record<string, string | undefined> };

const dt = Number(process.argv[2] ?? DT);
const arc = runArc({ dt, trace: !!process.env.TRACE });

const clock = (t: number) => {
  const s = Math.round(t);
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const e = (n: number) => n.toExponential(2).padStart(9);
console.log(`Hardpoint arc — reference fitter, dt ${dt}s, one deterministic run`);
console.log(`spine: the Dreadnought falls at ${clock(ARC_END_S)}`);
console.log('');
console.log(
  'beat                              actual     walk    Δt(s)    income  pred.inc  gap(s) channel',
);
let prev = 0;
for (const b of arc.beats) {
  const p = BEAT_TIME[b.id];
  const gap = b.t - prev;
  prev = b.t;
  console.log(
    `${b.id.padEnd(32)} ${clock(b.t).padStart(8)} ${p !== undefined ? clock(p).padStart(8) : '       -'} ${p !== undefined ? String(Math.round(b.t - p)).padStart(7) : '      -'} ${e(b.income)} ${p !== undefined ? e(predictedIncome(p)) : '        -'} ${String(Math.round(gap)).padStart(6)} ${classifyFlowChannel(gap)}`,
  );
}
console.log('');
const fired = new Set(arc.beats.map((b) => b.id));
for (const id of Object.keys(BEAT_TIME))
  if (!fired.has(id)) console.log(`NOT FIRED: ${id} (walk ${clock(BEAT_TIME[id]!)})`);
console.log(
  `ended: ${arc.ended} at ${clock(arc.endedAt)}${arc.anomaly ? ` — ${arc.anomaly}` : ''}`,
);
const c = arc.counts;
console.log(
  `passes ${c.passes}, steers ${c.steers} (${c.claimed} to a claimed board), fits ${c.fits}, swaps ${c.swaps}, trades ${c.trades}, engagements ${c.engagements}, withdrawals ${c.withdrawals}, calibrations ${c.calibrations}`,
);
for (const b of arc.boards) {
  console.log('');
  console.log(
    `${b.ship}: ${Object.entries(b.fitted)
      .map(([t, n]) => `${t} ${n}`)
      .join(', ')}`,
  );
  for (const r of b.rows) if (r.trim()) console.log(`  ${r}`);
}
if (arc.trace.length) {
  console.log('');
  for (const line of arc.trace) console.log(`  ${line}`);
}
