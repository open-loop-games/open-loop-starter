/**
 * Discovery: when does the transcend-arc beat fire under autobuyers, on a
 * fresh save?
 *
 * Beat shape per task closure:
 *   1. First prestige fires (existing leaf-2 beat, regression check)
 *   2. Coin earnings continue, coinsThisTranscension accumulates across resets
 *   3. transcendPointGain ≥ 0.5 (canonical disjunctive gate)
 *   4. First transcend fires → transcendPoints.cumulative > 0
 *   5. coin and prestige tiers zero (including prestigePoints — canonical
 *      inversion from prestige reset's keep)
 *   6. First Mythos producer affordable (auto-buy via setupPolicyAutoPurchase)
 *   7. First Transcend Upgrade 41 affordable (auto-sweep)
 *
 * Run via:
 *   pnpm exec vite-node src/archetypes/scaler/balance/transcend-beat.ts
 *
 * Math-first prediction (per starter `CLAUDE.md` § Balance methodology):
 *   - First prestige fires when coinsThisPrestige ≥ 1e16 OR PP-gain ≥ 100.
 *     Discovery snapshot from leaf 2 / 3 / 4: ~3499s (58 min).
 *   - Auto-prestige fires immediately on disjunction satisfaction. Each
 *     prestige zeroes coinsThisPrestige (back to 100) but adds to
 *     coinsThisTranscension (which only resets on transcend).
 *   - Transcend gate: coinsThisTranscension ≥ 1e100 OR
 *     transcendPointGain ≥ 0.5. The gain branch is much earlier — at
 *     coinsThisTranscension = (0.5)^(1/0.03) × 1e100 = 1e100 × ~1e-10 ≈
 *     1e90, which is reachable far before the 1e100 coin threshold itself.
 *     But floor() truncates 0.x to 0, so the gain-branch effectively only
 *     fires once gain ≥ 1, i.e. coinsThisTranscension ≥ 1e100. So the
 *     coin-threshold branch is the load-bearing path.
 *   - Coin production grows fast post-prestige with mAcc/mMult/Prism rune
 *     bindings + crystal upgrades + auto-purchases of all coin upgrades.
 *     Predicted timeline: first transcend likely fires within minutes-to-
 *     low-tens-of-minutes after first prestige once the cross-tier rate
 *     boost compounds.
 *
 * Discovery surface per `archetypes/BALANCING.md` § Theme 5: prints proposals,
 * does not assert, does not mutate data. Output feeds the regression locks
 * in `sim/transcend-beat.test.ts`.
 */

import { Decimal, runUntil } from '@open-loop/engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import {
  getCoinResource,
  getCoinProducers,
  getPrestigePoints,
  getTranscendPoints,
  getTranscendShards,
  getCoinsThisTranscension,
  getMythosProducers,
  getTranscendUpgrades,
  getTranscendPointGain,
} from '../modules';

const TICK_DELTA = 1; // 1s — same scale as prestige-beat / runes-beat regression locks.
const MAX_SIM_SECONDS = 24 * 60 * 60; // 24h cap — wide net for discovery.

function bn(v: unknown): Decimal {
  return new Decimal(v as never);
}

function snapshot(label: string): void {
  const coins = getCoinResource();
  const pp = getPrestigePoints();
  const tp = getTranscendPoints();
  const ts = getTranscendShards();
  const ctt = getCoinsThisTranscension();
  const tpGain = getTranscendPointGain();
  const mythos1 = getMythosProducers().getProducer('mythos-1');
  const upg41 = getTranscendUpgrades().getPurchasable('upgrade-41');

  console.log(`\n── ${label} ──────────────────────────────────────────`);
  console.log(`  coins                  = ${bn(coins.value).toString()}`);
  console.log(`  prestigePoints         = ${bn(pp.value).toString()}`);
  console.log(`  prestigePoints.cum     = ${bn(pp.cumulative?.value ?? 0).toString()}`);
  console.log(`  transcendPoints        = ${bn(tp.value).toString()}`);
  console.log(`  transcendPoints.cum    = ${bn(tp.cumulative?.value ?? 0).toString()}`);
  console.log(`  transcendShards        = ${bn(ts.value).toString()}`);
  console.log(`  coinsThisTranscension  = ${bn(ctt.value).toString()}`);
  console.log(`  transcendPointGain     = ${bn(tpGain.value).toString()}`);
  if (mythos1) {
    console.log(`  mythos-1 owned         = ${bn(mythos1.ownedCount.value).toString()}`);
  }
  if (upg41) {
    console.log(`  upgrade-41 active      = ${upg41.active.value}`);
  }
  // Producer rateChain attribution — confirms transcend upgrades 41/43/56-60
  // bind into coin chain.
  const coin1 = getCoinProducers().getProducer('coin-1');
  if (coin1) {
    const bindings = coin1.rateChain.bindings();
    console.log(`  coin-1 rateChain       (${bindings.length} bindings):`);
    for (const b of bindings) {
      console.log(`    - ${b.id}`);
    }
  }
}

function runDiscovery(): void {
  console.log('=== Scaler transcend-beat discovery ===');
  console.log(`tickDelta=${TICK_DELTA}s   maxSimTime=${MAX_SIM_SECONDS}s`);

  const { engine } = createScalerEngine({
    persistenceNamespace: `transcend-beat-discovery-${Date.now()}`,
  });
  engine.selectMod(SCALER_MOD_ID);
  engine.start();

  const pp = getPrestigePoints();
  const tp = getTranscendPoints();
  const mythos1 = getMythosProducers().getProducer('mythos-1');
  const upg41 = getTranscendUpgrades().getPurchasable('upgrade-41');

  snapshot('t=0 (post-start, autobuyers idle)');

  // Phase 1 — first prestige (gates the runes tab; transcend depends on
  // continued coin production post-prestige).
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

  // Phase 2 — first transcend (gates everything in this leaf).
  let firstTranscendAt = -1;
  const phase2 = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: MAX_SIM_SECONDS,
    until: ({ simTime }) => {
      if (Decimal.gt(tp.cumulative?.value ?? 0, 0)) {
        firstTranscendAt = firstPrestigeAt + simTime;
        return true;
      }
      return false;
    },
  });

  if (phase2.terminated !== 'predicate') {
    console.log('\n!! transcend did NOT fire within budget !!');
    snapshot(`transcend-beat timeout @ ${phase2.elapsedSimulated}s after first prestige`);
    engine.dispose();
    return;
  }

  const elapsedToTranscend = firstTranscendAt - firstPrestigeAt;
  console.log(
    `\n>> first transcend fired at simTime = ${firstTranscendAt}s (${(firstTranscendAt / 60).toFixed(1)}min total; ${(elapsedToTranscend / 60).toFixed(2)}min after first prestige)`,
  );
  snapshot('immediately after first transcend');

  // Phase 3 — first mythos producer + first transcend upgrade auto-bought.
  let firstMythosAt = -1;
  let firstUpg41At = -1;
  const phase3 = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: MAX_SIM_SECONDS,
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

  if (phase3.terminated !== 'predicate') {
    console.log('\n!! mythos / transcend upgrade purchases did NOT complete in budget !!');
    snapshot(`autobuyer timeout @ ${phase3.elapsedSimulated}s after first transcend`);
  } else {
    console.log(
      `\n>> first mythos-1 owned at simTime = ${firstMythosAt}s (${((firstMythosAt - firstTranscendAt) / 60).toFixed(2)}min after transcend)`,
    );
    console.log(
      `>> upgrade-41 bought at simTime    = ${firstUpg41At}s (${((firstUpg41At - firstTranscendAt) / 60).toFixed(2)}min after transcend)`,
    );
    snapshot('transcend-beat reached');
  }

  engine.dispose();
}

runDiscovery();
