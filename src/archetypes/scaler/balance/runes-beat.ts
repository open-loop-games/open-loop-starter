/**
 * Discovery: when does the rune-arc beat fire under autobuyers, on a fresh save?
 *
 * Beat shape per task closure:
 *   1. First prestige fires → Runes tab unlocks, offerings begin accruing
 *   2. Auto-sacrifice consumes offerings into the lowest-level rune
 *   3. First rune (Speed by canonical sacrifice order) reaches level ≥ 1
 *   4. Speed-rune mAcc multiplier visible in coin rateChain (non-1 contribution)
 *
 * Run via:
 *   pnpm exec vite-node src/archetypes/scaler/balance/runes-beat.ts
 *
 * Discovery surface per `archetypes/BALANCING.md` § Theme 5: prints proposals,
 * does not assert, does not mutate data. Output feeds the regression locks
 * in `sim/runes-beat.test.ts`.
 */

import { Decimal, runUntil } from 'open-loop-engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import {
  getCoinResource,
  getCoinProducers,
  getPrestigePoints,
  getOfferings,
  getRuneLevel,
  getRuneEffects,
} from '../modules';

const TICK_DELTA = 1; // 1s — same scale as prestige-beat lock; minute-scale events.
const MAX_SIM_SECONDS = 24 * 60 * 60; // 24h cap — wide net for discovery.

function bn(v: unknown): Decimal {
  return new Decimal(v as never);
}

function snapshot(label: string): void {
  const coins = getCoinResource();
  const pp = getPrestigePoints();
  const offerings = getOfferings();
  const speedLv = getRuneLevel('speed');
  const dupLv = getRuneLevel('duplication');
  const prismLv = getRuneLevel('prism');
  const thriftLv = getRuneLevel('thrift');
  const siLv = getRuneLevel('superiorIntellect');
  const speedFx = getRuneEffects('speed');

  console.log(`\n── ${label} ──────────────────────────────────────────`);
  console.log(`  coins                = ${bn(coins.value).toString()}`);
  console.log(`  prestigePoints.cum   = ${bn(pp.cumulative?.value ?? 0).toString()}`);
  console.log(`  offerings            = ${bn(offerings.value).toString()}`);
  console.log(
    `  rune levels          = speed=${speedLv.value} dup=${dupLv.value} prism=${prismLv.value} thrift=${thriftLv.value} si=${siLv.value}`,
  );
  console.log(`  speed.mAcc           = ${speedFx.value.multiplicativeAccelerators}`);
  // Producer rateChain attribution — confirms Speed/Dup/Prism rune binds register.
  const coin1 = getCoinProducers().getProducer('coin-1');
  if (coin1) {
    const bindings = coin1.rateChain.bindings();
    console.log(`  coin-1 rateChain (${bindings.length} bindings):`);
    for (const b of bindings) {
      console.log(`    - ${b.id}`);
    }
  }
}

function runDiscovery(): void {
  console.log('=== Scaler runes-beat discovery ===');
  console.log(`tickDelta=${TICK_DELTA}s   maxSimTime=${MAX_SIM_SECONDS}s`);

  const { engine } = createScalerEngine({
    persistenceNamespace: `runes-beat-discovery-${Date.now()}`,
  });
  engine.selectMod(SCALER_MOD_ID);
  engine.start();

  const pp = getPrestigePoints();
  const offerings = getOfferings();
  const speedLv = getRuneLevel('speed');
  const speedFx = getRuneEffects('speed');

  snapshot('t=0 (post-start, autobuyers idle)');

  // Phase 1 — first prestige (gates offerings + runes tab).
  let firstPrestigeAt = -1;
  const phase1 = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: MAX_SIM_SECONDS,
    until: ({ simTime }) => {
      if (Decimal.gt(pp.cumulative?.value ?? 0, 0)) {
        firstPrestigeAt = simTime;
        return true;
      }
      return false;
    },
  });

  if (phase1.terminated !== 'predicate') {
    console.log('\n!! prestige did NOT fire within budget !!');
    snapshot(`maxSimTime hit @ ${phase1.elapsedSimulated}s`);
    engine.dispose();
    return;
  }

  console.log(
    `\n>> first prestige fired at simTime = ${firstPrestigeAt}s (${(firstPrestigeAt / 60).toFixed(1)}min)`,
  );
  snapshot('immediately after first prestige');

  // Phase 2 — first offering accrued (auto on the prestige reset's afterReset).
  // The cumulative tracker tags the resource lifetime, but offerings should
  // be > 0 immediately after the first reset's afterReset hook fires.
  if (Decimal.gt(offerings.value, 0)) {
    console.log(`\n>> offerings accrued on first prestige: ${bn(offerings.value).toString()}`);
  } else {
    console.log('\n!! offerings did NOT accrue — afterReset hook may not be wired !!');
  }

  // Phase 3 — first rune level reached. Auto-sacrifice consumes offerings each
  // tick into the lowest-level rune (Speed first by canonical order).
  let speedLv1At = -1;
  const phase3 = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: MAX_SIM_SECONDS,
    until: ({ simTime }) => {
      if (speedLv.value >= 1) {
        speedLv1At = firstPrestigeAt + simTime;
        return true;
      }
      return false;
    },
  });

  if (phase3.terminated !== 'predicate') {
    console.log('\n!! Speed rune did NOT reach level 1 within budget !!');
    snapshot(`runes-beat timeout @ ${phase3.elapsedSimulated}s after first prestige`);
    engine.dispose();
    return;
  }

  const elapsedToSpeed1 = speedLv1At - firstPrestigeAt;
  console.log(
    `\n>> Speed reached level 1 at simTime = ${speedLv1At}s (${elapsedToSpeed1.toFixed(0)}s after first prestige; ${(elapsedToSpeed1 / 60).toFixed(2)}min)`,
  );
  console.log(`>> Speed.mAcc at level 1 = ${speedFx.value.multiplicativeAccelerators}`);
  snapshot('runes-beat reached');

  engine.dispose();
}

runDiscovery();
