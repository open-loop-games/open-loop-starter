/**
 * Blank game — sim probe: shipping module vs the closed-form projection.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/_blank/balance/game-probe.ts`
 *
 * See `.claude/rules/archetype-authoring.md` § Balance — where each surface
 * lands: drives the REAL assembled engine — the shipping `game/core` module
 * ticked by the real loop — and measures the realized accrual rate, verifying it
 * matches the projection (`game-projection.ts`: count(t) = ratePerSecond · t). A
 * probe is discovery, not a test — it prints, it does not assert, and a probe
 * that disagrees found something. Magnitudes stay here; `../sim/` specs
 * behavior, which is why those suites survive a retune.
 *
 * Coarse tick (1s) per `.claude/CLAUDE.md` § Balance methodology — no sub-second
 * fidelity needed for a linear rate.
 */

import { bootTestEngine } from '@/test/bootTestEngine';
import { createGameModules } from '../modules';
import { CoreKey } from '../modules/core';
import { GAME_BALANCE } from '../data/game';

const INTERVAL_RATE = 1; // 1 tick = 1 sim-second — coarse, matches the linear rate

async function main(): Promise<void> {
  console.log('Blank game — core probe (shipping accrual vs closed-form projection)');

  const handle = bootTestEngine({
    modules: createGameModules(),
    intervalRate: INTERVAL_RATE,
    persistenceNamespacePrefix: 'game-probe',
  });
  const core = handle.engine.tryInject(CoreKey);
  if (!core) throw new Error('game-probe: core module did not provide CoreKey');

  const seconds = 60;
  await handle.tick(seconds);

  const measured = core.count.value.toNumber();
  const predicted = GAME_BALANCE.ratePerSecond * seconds;
  const driftPct = ((measured - predicted) / predicted) * 100;
  handle.dispose();

  console.log(
    `\n═══ Realized accrual over ${seconds}s (ratePerSecond = ${GAME_BALANCE.ratePerSecond}) ═══`,
  );
  console.log(`  projection             = ${predicted.toLocaleString()}`);
  console.log(`  measured (real engine)  = ${measured.toLocaleString()}`);
  console.log(
    `  drift ${driftPct >= 0 ? '+' : ''}${driftPct.toFixed(2)}%   → ${
      Math.abs(driftPct) < 0.5 ? 'MATCH ✓ (shipping = projection)' : 'DRIFT ✗'
    }`,
  );
}

main();
