/**
 * Scaler balance discovery — consolidated vite-node driver per sub-pass.
 *
 * Replaces the per-leaf `{prestige,runes,transcend}-beat.ts` discovery
 * scripts. Each sub-pass adds a section: runs a sim, snapshots state at
 * each beat, prints the closure value the regression locks in
 * `sim/<beat>-beat.test.ts` consume.
 *
 * Per `archetypes/BALANCING.md § Theme 5`: discovery prints proposals; the
 * human picks. Locks come after discovery converges. Output here is read
 * once when re-pinning a lock window, not on every run.
 *
 *   pnpm exec vite-node src/archetypes/scaler/balance/solve.ts
 */

import { Decimal, runUntil } from '@open-loop/engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import {
  getCoinResource,
  getCoinProducers,
  getOfferings,
  getPrestigePoints,
  getRuneEffects,
  getRuneLevel,
} from '../modules';

const TICK_DELTA = 1; // 1s — minute-scale events.
const MAX_SIM_SECONDS = 24 * 60 * 60;

function bn(v: unknown): Decimal {
  return new Decimal(v as never);
}

// ─── Runes ───────────────────────────────────────────────────────────────────

function runRunesDiscovery(): void {
  console.log('=== Scaler runes-beat discovery ===');
  console.log(`tickDelta=${TICK_DELTA}s   maxSimTime=${MAX_SIM_SECONDS}s\n`);

  const { engine } = createScalerEngine({
    persistenceNamespace: `solve-runes-${Date.now()}`,
  });
  engine.selectMod(SCALER_MOD_ID);
  engine.start();

  const pp = getPrestigePoints();
  const offerings = getOfferings();
  const speedLv = getRuneLevel('speed');
  const speedFx = getRuneEffects('speed');

  let firstPrestigeAtSec = -1;
  let firstSpeedLv1AtSec = -1;

  const result = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: MAX_SIM_SECONDS,
    until: ({ simTime }) => {
      if (firstPrestigeAtSec < 0 && Decimal.gt(pp.cumulative?.value ?? 0, 0)) {
        firstPrestigeAtSec = simTime;
      }
      if (firstSpeedLv1AtSec < 0 && speedLv.value >= 1) {
        firstSpeedLv1AtSec = simTime;
      }
      return firstPrestigeAtSec >= 0 && firstSpeedLv1AtSec >= 0;
    },
  });

  if (result.terminated !== 'predicate') {
    console.log(
      `!! beats did not fire within budget (prestige=${firstPrestigeAtSec}s, ` +
        `speedLv1=${firstSpeedLv1AtSec}s)`,
    );
    engine.dispose();
    return;
  }

  console.log(
    `>> first prestige fired at simTime = ${firstPrestigeAtSec}s ` +
      `(${(firstPrestigeAtSec / 60).toFixed(1)}min)`,
  );
  console.log(
    `>> first Speed level ≥1 fired at simTime = ${firstSpeedLv1AtSec}s ` +
      `(Δ from first prestige = ${firstSpeedLv1AtSec - firstPrestigeAtSec}s)`,
  );
  console.log(`>> Speed level after first sacrifice = ${speedLv.value}`);
  console.log(
    `>> Speed.mAcc at level ${speedLv.value} = ${speedFx.value.multiplicativeAccelerators}`,
  );
  console.log(`>> offerings residual = ${bn(offerings.value).toString()}`);

  // ─── Rune chain bindings on coin-1 (lock-shape confirmation) ─────────────
  const coin1 = getCoinProducers().getProducer('coin-1');
  if (coin1) {
    console.log(`\n>> coin-1 rateChain bindings (${coin1.rateChain.bindings().length}):`);
    for (const b of coin1.rateChain.bindings()) {
      console.log(`     - ${b.id}`);
    }
  }

  const coins = getCoinResource();
  console.log(`\n>> coins at beat = ${bn(coins.value).toString()}`);

  engine.dispose();
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  runRunesDiscovery();
}

main();
