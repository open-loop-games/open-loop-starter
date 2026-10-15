/**
 * The arc: one cold start to a fully fitted hull under the reference fitter
 * (`./_fitter.ts`), on the real engine and modules. Prints every beat beside the spine's
 * schedule, the flow channel of each gap, the finished board's packing against the
 * spine's claims, and the board itself. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/packer/balance/arc-probe.ts [dt]
 *
 * Default tick 1 s, about 7 s of wall time; the fitter's per-tick layout evaluation
 * dominates, so a coarser tick is no faster. TRACE=1 adds a line every 30 s.
 *
 * Reading it:
 * - `Δt` is measured minus scheduled. A beat ahead of schedule is negative.
 * - `income` is salvage a second when the beat fired; `pred.inc` is the spine's at the
 *   scheduled time.
 * - `channel` classes the gap since the previous beat (`classifyFlowChannel`).
 * - § finished board compares the fitter's last board with the full-hull packing the spine
 *   claims (`STAGE_PACKING`): its firepower, and the modules each fields.
 */

import { classifyFlowChannel } from '@open-loop/engine';
import {
  ARC_END_S,
  BEAT_TIME,
  BEATS,
  OPENING_S,
  STAGE_PACKING,
  predictedIncome,
  type BeatId,
} from '../data';
import { DT, runArc } from './_fitter';

declare const process: { argv: string[]; env: Record<string, string | undefined> };

const dt = Number(process.argv[2] ?? DT);
const arc = runArc({ dt, trace: !!process.env.TRACE });

const scheduled = (id: string): number | undefined =>
  id === 'corvette fitted'
    ? OPENING_S
    : id === 'arc complete: hull fully fitted'
      ? ARC_END_S
      : (BEATS as readonly string[]).includes(id)
        ? BEAT_TIME[id as BeatId]
        : undefined;

const w = (n: number, width = 7) => n.toFixed(0).padStart(width);
console.log(`Hardpoint arc — reference fitter, dt ${dt}s, one deterministic run`);
console.log(
  `spine: corvette fitted at ${OPENING_S.toFixed(0)}s, hull fully fitted at ${ARC_END_S.toFixed(0)}s`,
);
console.log('');
console.log(
  'beat                              actual  predict   Δt(s)  income  pred.inc  gap(s) channel',
);
let prev = 0;
for (const b of arc.beats) {
  const p = scheduled(b.id);
  const gap = b.t - prev;
  prev = b.t;
  console.log(
    `${b.id.padEnd(32)} ${w(b.t)} ${p !== undefined ? w(p, 8) : '       -'} ${
      p !== undefined ? w(b.t - p) : '      -'
    } ${b.income.toFixed(1).padStart(7)} ${p !== undefined ? predictedIncome(p).toFixed(1).padStart(9) : '        -'} ${w(gap)} ${classifyFlowChannel(gap)}`,
  );
}
console.log('');
const fired = new Set(arc.beats.map((b) => b.id));
for (const b of BEATS)
  if (!fired.has(b)) console.log(`NOT FIRED: ${b} (scheduled ${BEAT_TIME[b].toFixed(0)}s)`);
console.log(`ended: ${arc.ended} at ${arc.endedAt}s${arc.anomaly ? ` — ${arc.anomaly}` : ''}`);
console.log(
  `fits ${arc.counts.fits}, swaps ${arc.counts.swaps}, rearranges ${arc.counts.rearranges}, salvage ${arc.salvage.toFixed(0)}, rate ${arc.rate.toFixed(1)}/s, firepower ${arc.firepower.toFixed(1)}`,
);

const k = arc.packing;
const claim = STAGE_PACKING[STAGE_PACKING.length - 1]!;
console.log('');
console.log(
  `finished board: ${arc.firepower.toFixed(1)} dps after refits · board ${(arc.firepower / k.globalMult).toFixed(1)} against the full-hull claim ${claim.rate} · links/weapon ${k.linksPerWeapon.toFixed(2)} · stamps/weapon ${k.stampsPerWeapon.toFixed(2)} · refits ×${k.globalMult.toFixed(2)}`,
);
console.log(
  `  claimed: ${Object.entries(claim.counts)
    .map(([t, n]) => `${t} ${n}`)
    .join(', ')}`,
);
console.log(
  `  fitted:  ${Object.entries(arc.fitted)
    .map(([t, n]) => `${t} ${n}`)
    .join(', ')}`,
);
for (const r of arc.board) console.log(`  ${r}`);

if (arc.trace.length) {
  console.log('');
  for (const line of arc.trace) console.log(`  ${line}`);
}
