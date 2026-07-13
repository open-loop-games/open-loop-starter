/**
 * Blank game — sim probe: shipping module vs the closed-form projection. Lane 2.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/_blank/balance/game-probe.ts`
 *
 * Lane 2 (see `../../README.md` § Balance — three lanes): drives the REAL
 * assembled engine — the shipping `game/core` module ticked by the real loop —
 * and measures the realized accrual rate, verifying it matches the Lane-1
 * projection (`game-projection.ts`: count(t) = ratePerSecond · t). A probe is
 * discovery, not a test — a probe that disagrees found something. The invariant
 * it settles on gets pinned in the Lane-3 lock (`../sim/game.probe.test.ts`).
 *
 * Coarse tick (1s) per `.claude/CLAUDE.md` § Balance methodology — no sub-second
 * fidelity needed for a linear rate.
 */

import { bootTestEngine } from '@/test/bootTestEngine';
import { createGameModules } from '../modules';
import { CoreKey } from '../modules/core';
import { GAME_BALANCE } from '../data/game';

const TICK_RATE = 1; // 1 tick = 1 sim-second — coarse, matches the linear rate

async function main(): Promise<void> {
  console.log('Blank game — core probe (shipping accrual vs closed-form projection)');

  const handle = bootTestEngine({
    modules: createGameModules(),
    tickRate: TICK_RATE,
    namespacePrefix: 'game-probe',
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
  console.log(`  projection (Lane 1)     = ${predicted.toLocaleString()}`);
  console.log(`  measured (real engine)  = ${measured.toLocaleString()}`);
  console.log(
    `  drift ${driftPct >= 0 ? '+' : ''}${driftPct.toFixed(2)}%   → ${
      Math.abs(driftPct) < 0.5 ? 'MATCH ✓ (shipping = projection)' : 'DRIFT ✗'
    }`,
  );
}

main();
