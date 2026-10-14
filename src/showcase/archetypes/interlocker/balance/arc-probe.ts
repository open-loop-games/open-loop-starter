/**
 * The arc: Exposition after Exposition under the reference foreman (`./_foreman.ts`), on
 * the real engine and modules. Prints every beat, each run's length and build, what bound
 * each trade minute by minute, and the end state. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/interlocker/balance/arc-probe.ts [expositions] [dt]
 *
 * Defaults: 5 Expositions at a 0.5 s tick, about 2 s. TRACE=1 adds a line a minute.
 *
 * Reading it:
 * - EXPOSITION 1 against the projection's first-Exposition prediction is the spine check.
 *   Pass the build it prints to `interlocker-projection.ts` to separate a plan miss from a
 *   model miss.
 * - "bound by" shows each trade's limit, in sampled minutes: `labour` is crew-bound,
 *   `input:x` starved of x, `storage` blocked by a full output bin, `locked` not yet patented.
 */

import { RESOURCES, ROLES } from '../data';
import { DT, runArc } from './_foreman';

declare const process: { argv: string[]; env: Record<string, string | undefined> };

const expositions = Number(process.argv[2] ?? 5);
const dt = Number(process.argv[3] ?? DT);
const fmt = (t: number) => `${Math.floor(t / 60)}m${String(Math.round(t % 60)).padStart(2, '0')}s`;

const arc = runArc({
  expositions,
  dt,
  maxSimSeconds: 7200 * Math.max(1, expositions / 5),
  trace: !!process.env.TRACE,
});

console.log(`== beats (dt ${dt}) ==`);
for (const [t, label] of arc.beats) console.log(`  ${fmt(t).padStart(7)}  ${label}`);

console.log('== runs ==');
for (const [i, r] of arc.expositions.entries())
  console.log(
    `  ${String(i + 1).padStart(2)}: ${fmt(r.runSeconds).padStart(6)} · ${Math.floor(r.planes)} planes → +${r.renown} · crew ${r.crew} · ${Object.entries(
      r.built,
    )
      .map(([k, v]) => `${k} ${v}`)
      .join(' ')}`,
  );

const t = arc.tally;
console.log(`== bound by (sampled minutes of ${t.minutes}) ==`);
for (const r of ROLES)
  console.log(
    `  ${r.name.padEnd(11)} ${Object.entries(t.limits[r.id])
      .sort((a, b) => b[1]! - a[1]!)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}`,
  );
console.log(
  `  bins ≥95% full: ${RESOURCES.filter((d) => t.fullBins[d.id])
    .map((d) => `${d.id} ${Math.round((100 * t.fullBins[d.id]!) / t.minutes)}%`)
    .join(', ')}; ration short ${t.hungry} min`,
);

if (arc.trace.length) {
  console.log('== trace ==');
  for (const line of arc.trace) console.log(`  ${line}`);
}
console.log('== end state ==');
for (const line of arc.endState) console.log(`  ${line}`);
