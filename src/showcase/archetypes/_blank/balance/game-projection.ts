/**
 * Blank game — closed-form balance projection (no engine).
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/_blank/balance/game-projection.ts`
 *
 * Pure math, NO engine (see `.claude/rules/archetype-authoring.md` § Balance —
 * where each surface goes). The spine in runnable form: it predicts the mechanic's
 * trajectory on paper. The probe (`game-probe.ts`) then drives the shipping
 * module and prints where reality lands against it. Predicts; does not discover.
 *
 * Bucket: linear accumulation — amount(t) = ratePerSecond · t. A forward
 * archetype replaces this with its spine's closed form (the crossing, the
 * geometric series, the log-frontier) and sizes its authored numbers here.
 */

import { GAME_BALANCE } from '../data/game';

const rate = GAME_BALANCE.ratePerSecond;

/** The whole spine, closed-form: units accrued after `t` game-seconds. */
const countAt = (t: number): number => rate * t;

const col = (s: string | number, w: number): string => String(s).padEnd(w);

function main(): void {
  console.log('Blank game — closed-form balance projection (linear accumulation)');
  console.log(`\n═══ amount(t) = ratePerSecond · t   (ratePerSecond = ${rate}) ═══`);
  console.log(col('  t (s)', 10) + 'predicted amount');
  for (const t of [0, 10, 30, 60, 300, 3600]) {
    console.log(col(`  ${t}`, 10) + countAt(t).toLocaleString());
  }
  console.log(
    `\n  One authored number: ratePerSecond. Replace this projection with your` +
      ` spine's\n  closed form when the game gets a real economy.`,
  );
}

main();
