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
  eccTranscend,
  getCoinResource,
  getCoinProducers,
  getCoinsThisPrestige,
  getCoinsThisTranscension,
  getDiamondProducers,
  getMythosProducers,
  getOfferings,
  getPrestigeCount,
  getPrestigePoints,
  getPrestigePointGain,
  getRuneEffects,
  getRuneLevel,
  getTranscendCount,
  getTranscendPoints,
  getTranscendPointGain,
  getTranscendUpgrades,
} from '../modules';
import { ECC_SAMPLE_COMPLETIONS } from './balance';
import {
  predictPrestigeAtCanonicalThreshold,
  predictTranscendAtCanonicalThreshold,
  specEccTranscend,
} from './spec';

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

// ─── ECC ─────────────────────────────────────────────────────────────────────

function runEccDiscovery(): void {
  console.log('\n=== Scaler ECC piecewise discovery ===');
  console.log('Regimes: linear ≤100, +1/20 in (100, 1000], +1/100 above 1000.\n');
  console.log('  completions      engine eccTranscend      spec walker');
  for (const c of ECC_SAMPLE_COMPLETIONS) {
    const eng = eccTranscend(c);
    const spec = specEccTranscend(c);
    console.log(
      `  ${String(c).padStart(8)}        ${String(eng).padStart(16)}    ${String(spec).padStart(14)}` +
        (eng !== spec ? '   <- DIVERGES' : ''),
    );
  }
}

// ─── Prestige ────────────────────────────────────────────────────────────────

function runPrestigeDiscovery(): void {
  console.log('\n=== Scaler prestige-beat discovery ===');
  console.log(`tickDelta=${TICK_DELTA}s   maxSimTime=${MAX_SIM_SECONDS}s\n`);

  // Frozen-state predictions — engine-as-oracle at the canonical threshold.
  const prediction = predictPrestigeAtCanonicalThreshold();
  console.log(`  Canonical threshold predictions (engine queries at coinsThisPrestige=1e16):`);
  console.log(`    prestigePointGain         = ${prediction.gainAtCoinThreshold}`);
  console.log(`    prestigeConversion.canConvert = ${prediction.canConvertAtCoinThreshold}`);
  console.log(
    `    gain-threshold equivalence  = ` +
      `${prediction.gainAtCoinThreshold === prediction.canonicalGainThreshold ? 'yes (anyOf is structurally a single threshold)' : 'NO'}\n`,
  );

  const { engine } = createScalerEngine({
    persistenceNamespace: `solve-prestige-${Date.now()}`,
  });
  engine.selectMod(SCALER_MOD_ID);
  engine.start();

  const pp = getPrestigePoints();
  const cthis = getCoinsThisPrestige();
  const gain = getPrestigePointGain();
  const prestigeCount = getPrestigeCount();
  const diamond1 = getDiamondProducers().getProducer('diamond-1');

  // Phase 1 — observe first prestige. Trip on coin-threshold cross to
  // capture pre-reset state; the actual conversion fires on a separate
  // onTick callback within the same tick.
  let firstPrestigeAt = -1;
  let firstCoinsAtFire = '0';
  let firstGainAtFire = 0;
  const phase1 = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: MAX_SIM_SECONDS,
    until: ({ simTime }) => {
      if (firstPrestigeAt < 0 && Decimal.gte(cthis.value, 1e16)) {
        firstPrestigeAt = simTime;
        firstCoinsAtFire = Decimal.fromValue(cthis.value).toExponential(3);
        firstGainAtFire = Decimal.fromValue(gain.value).toNumber();
      }
      return prestigeCount.value >= 1;
    },
  });
  if (phase1.terminated !== 'predicate') {
    console.log(`!! first prestige did not fire within budget`);
    engine.dispose();
    return;
  }
  console.log(
    `>> first prestige fired at simTime = ${firstPrestigeAt}s ` +
      `(${(firstPrestigeAt / 60).toFixed(1)}min)`,
  );
  console.log(`>> coinsThisPrestige at fire = ${firstCoinsAtFire}`);
  console.log(`>> prestigePointGain at fire = ${firstGainAtFire}`);
  console.log(
    `>> long-run-avg PP rate (cycle 1) = ${(firstGainAtFire / firstPrestigeAt).toFixed(4)} PP/s`,
  );

  // Phase 2 — diamond-1 autobuy.
  let diamond1At = -1;
  const phase2 = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: 60,
    until: ({ simTime }) => {
      if (diamond1 && Decimal.gte(diamond1.count.value, 1)) {
        diamond1At = firstPrestigeAt + simTime;
        return true;
      }
      return false;
    },
  });
  if (phase2.terminated === 'predicate') {
    console.log(
      `>> diamond-1 auto-bought at simTime = ${diamond1At}s ` +
        `(${phase2.elapsedSimulated}s after first prestige)`,
    );
  } else {
    console.log(`!! diamond-1 not auto-bought within 60s of first prestige`);
  }

  // Phase 3 — observe per-cycle compounding for cycles 2..5 (informs transcend
  // sub-pass and the optimal-stopping long-run-average reference).
  console.log(`\n  Per-cycle PP gain (cycles 2..5):`);
  const cycleTimes: number[] = [firstPrestigeAt];
  for (let cycle = 2; cycle <= 5; cycle++) {
    let cycleStartSec = -1;
    const phase = runUntil({
      engine,
      tickDelta: TICK_DELTA,
      maxSimTime: MAX_SIM_SECONDS,
      until: ({ simTime }) => {
        if (prestigeCount.value >= cycle) {
          cycleStartSec = simTime;
          return true;
        }
        return false;
      },
    });
    if (phase.terminated !== 'predicate' || cycleStartSec < 0) {
      console.log(`    cycle ${cycle}: did not fire within budget`);
      break;
    }
    cycleTimes.push(cycleTimes[cycleTimes.length - 1] + cycleStartSec);
    const dur = cycleStartSec;
    console.log(
      `    cycle ${cycle}: Δt = ${dur}s (${(dur / 60).toFixed(1)}min), ` +
        `cumulative PP = ${Decimal.fromValue(pp.value).toString()}`,
    );
  }

  engine.dispose();
}

// ─── Transcend ───────────────────────────────────────────────────────────────

function runTranscendDiscovery(): void {
  console.log('\n=== Scaler transcend-beat discovery ===');
  console.log(`tickDelta=${TICK_DELTA}s   maxSimTime=${8 * 60 * 60}s\n`);

  const prediction = predictTranscendAtCanonicalThreshold();
  console.log(
    `  Canonical threshold predictions (engine queries at ` +
      `coinsThisTranscension=${prediction.transcendDivisorObserved}):`,
  );
  console.log(`    transcendPointGain         = ${prediction.gainAtCoinThreshold}`);
  console.log(`    transcendConversion.canConvert = ${prediction.canConvertAtCoinThreshold}`);
  console.log(
    `    gain-threshold equivalence = ` +
      `${prediction.gainAtCoinThreshold >= prediction.canonicalGainThreshold ? 'yes (gain step 0→1 satisfies >= 0.5 floor at threshold)' : 'NO'}\n`,
  );

  const { engine } = createScalerEngine({
    persistenceNamespace: `solve-transcend-${Date.now()}`,
  });
  engine.selectMod(SCALER_MOD_ID);
  engine.start();

  const pp = getPrestigePoints();
  const tp = getTranscendPoints();
  const ctt = getCoinsThisTranscension();
  const tpGain = getTranscendPointGain();
  const transcendCount = getTranscendCount();
  const mythos1 = getMythosProducers().getProducer('mythos-1');
  const upg41 = getTranscendUpgrades().getPurchasable('upgrade-41');

  // Phase 1 — observe first prestige (en-route to transcend).
  let firstPrestigeAt = -1;
  const phase1 = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: 8 * 60 * 60,
    until: ({ simTime }) => {
      if (firstPrestigeAt < 0 && Decimal.gt(pp.cumulative?.value ?? 0, 0)) {
        firstPrestigeAt = simTime;
      }
      return firstPrestigeAt >= 0;
    },
  });
  if (phase1.terminated !== 'predicate') {
    console.log(`!! first prestige did not fire within budget`);
    engine.dispose();
    return;
  }
  console.log(
    `>> first prestige at simTime = ${firstPrestigeAt}s (${(firstPrestigeAt / 60).toFixed(1)}min)`,
  );

  // Phase 2 — observe first transcend.
  let firstTranscendAt = -1;
  let coinsAtTranscend = '0';
  const phase2 = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: 8 * 60 * 60,
    until: ({ simTime }) => {
      if (firstTranscendAt < 0 && Decimal.gte(ctt.value, 5e16)) {
        firstTranscendAt = firstPrestigeAt + simTime;
        coinsAtTranscend = Decimal.fromValue(ctt.value).toExponential(3);
      }
      return transcendCount.value >= 1;
    },
  });
  if (phase2.terminated !== 'predicate') {
    console.log(`!! first transcend did not fire within budget`);
    engine.dispose();
    return;
  }
  console.log(
    `>> first transcend at simTime = ${firstTranscendAt}s ` +
      `(${(firstTranscendAt / 60).toFixed(1)}min total; ` +
      `${((firstTranscendAt - firstPrestigeAt) / 60).toFixed(1)}min after first prestige)`,
  );
  console.log(`>> coinsThisTranscension at fire = ${coinsAtTranscend}`);
  console.log(`>> transcendPointGain at fire = ${Decimal.fromValue(tpGain.value).toString()}`);
  console.log(
    `>> cumulative TP after fire = ${Decimal.fromValue(tp.cumulative?.value ?? 0).toString()}`,
  );
  console.log(
    `>> long-run-avg TP rate (cycle 1) = ` +
      `${(Decimal.fromValue(tp.cumulative?.value ?? 0).toNumber() / firstTranscendAt).toFixed(6)} TP/s`,
  );

  // Phase 3 — first mythos + first transcend upgrade auto-bought.
  let firstMythosAt = -1;
  let firstUpg41At = -1;
  const phase3 = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: 8 * 60 * 60,
    until: ({ simTime }) => {
      if (firstMythosAt < 0 && mythos1 && Decimal.gt(mythos1.ownedCount.value, 0)) {
        firstMythosAt = firstTranscendAt + simTime;
      }
      if (firstUpg41At < 0 && upg41 && upg41.active.value) {
        firstUpg41At = firstTranscendAt + simTime;
      }
      return firstMythosAt >= 0 && firstUpg41At >= 0;
    },
  });
  if (phase3.terminated === 'predicate') {
    console.log(
      `>> mythos-1 owned at simTime = ${firstMythosAt}s ` +
        `(${((firstMythosAt - firstTranscendAt) / 60).toFixed(2)}min after transcend)`,
    );
    console.log(
      `>> upgrade-41 bought at simTime = ${firstUpg41At}s ` +
        `(${((firstUpg41At - firstTranscendAt) / 60).toFixed(2)}min after transcend)`,
    );
  } else {
    console.log(`!! mythos / transcend upgrade purchases did not complete in budget`);
  }

  engine.dispose();
}

function main(): void {
  runRunesDiscovery();
  runEccDiscovery();
  runPrestigeDiscovery();
  runTranscendDiscovery();
}

main();
