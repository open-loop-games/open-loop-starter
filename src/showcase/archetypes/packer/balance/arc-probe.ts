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
 * - § packing compares the finished board with the reference packing the spine claims.
 */

import { classifyFlowChannel } from '@open-loop/engine';
import {
  ARC_S,
  BEAT_TIME,
  BEATS,
  FINAL_RATE,
  OPENING_RATE,
  OPENING_S,
  REF_RAIL_SHARE,
  REF_WEAPON_MULT,
  REF_WEAPON_SHARE,
  REFIT_MULT,
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
      ? OPENING_S + ARC_S
      : (BEATS as readonly string[]).includes(id)
        ? BEAT_TIME[id as BeatId]
        : undefined;

const w = (n: number, width = 7) => n.toFixed(0).padStart(width);
console.log(`Hardpoint arc — reference fitter, dt ${dt}s, one deterministic run`);
console.log(
  `spine: opening ${OPENING_S.toFixed(0)}s → ${OPENING_RATE}/s, arc ${ARC_S.toFixed(0)}s → ${FINAL_RATE.toFixed(0)}/s`,
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
const row = (label: string, claimed: string, measured: number) =>
  console.log(`${label.padEnd(18)}  ${claimed.padStart(7)}  ${measured.toFixed(2).padStart(8)}`);
console.log('');
console.log('packing             claimed  measured');
row('weapon share', REF_WEAPON_SHARE.toFixed(2), k.weaponShare);
row('rail share', REF_RAIL_SHARE.toFixed(2), k.railShare);
row('weapon mult (mean)', REF_WEAPON_MULT.toFixed(2), k.weaponMult);
row('  links / weapon', '-', k.linksPerWeapon);
row('  stamps / weapon', '-', k.stampsPerWeapon);
row('global mult', (REFIT_MULT ** 2).toFixed(2), k.globalMult);
for (const r of arc.board) console.log(`  ${r}`);

if (arc.trace.length) {
  console.log('');
  for (const line of arc.trace) console.log(`  ${line}`);
}
