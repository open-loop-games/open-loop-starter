/**
 * Discovery: when does first prestige fire under autobuyers, on a fresh save?
 *
 * Run via:
 *   pnpm exec vite-node src/archetypes/scaler/balance/prestige-beat.ts
 *
 * Discovery surface per `archetypes/BALANCING.md` § Theme 5: prints proposals,
 * does not assert, does not mutate data. Output feeds the regression locks
 * in `sim/prestige-beat.test.ts`. If autobuyers can't reach prestige in a
 * realistic budget the locks switch to structural-only — the sim's job here
 * is to surface the closure value, not assume one.
 */

import { Decimal, runUntil } from 'open-loop-engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import {
  getCoinResource,
  getCoinProducers,
  getAccelerator,
  getMultiplier,
  getCoinUpgrades,
  getPrestigePoints,
  getCoinsThisPrestige,
  getDiamondProducers,
  getPrestigeUpgrades,
} from '../modules';

const TICK_DELTA = 1; // 1s — sufficient resolution for per-prestige-cycle dynamics.
const MAX_SIM_SECONDS = 24 * 60 * 60; // 24h cap — wide net for discovery.

function bn(v: unknown): Decimal {
  return new Decimal(v as never);
}

function snapshot(label: string): void {
  const coins = getCoinResource();
  const pp = getPrestigePoints();
  const cthis = getCoinsThisPrestige();
  const acc = getAccelerator();
  const mul = getMultiplier();
  const producers = getCoinProducers().getAll();
  const upgrades = getCoinUpgrades();
  const diamond = getDiamondProducers();
  const prestigeUp = getPrestigeUpgrades();

  console.log(`\n── ${label} ──────────────────────────────────────────`);
  console.log(`  coins                = ${bn(coins.value).toString()}`);
  console.log(`  coinsThisPrestige    = ${bn(cthis.value).toString()}`);
  console.log(`  prestigePoints       = ${bn(pp.value).toString()}`);
  console.log(`  prestigePoints.cum   = ${bn(pp.cumulative?.value ?? 0).toString()}`);
  console.log(`  accelerator amount   = ${bn(acc.amount.value).toString()}`);
  console.log(`  multiplier  amount   = ${bn(mul.amount.value).toString()}`);
  for (const e of producers) {
    console.log(
      `  ${e.def.id.padEnd(8)} owned=${bn(e.producer.count.value).toString().padStart(6)}  rate=${bn(e.producer.computedRate.value).toString()}/s`,
    );
  }
  const purchasedCoinUpgrades = upgrades.purchasedCount.value;
  console.log(`  coinUpgrades.purchased = ${purchasedCoinUpgrades}/${upgrades.size}`);
  const d1 = diamond.getProducer('diamond-1');
  if (d1) {
    console.log(`  diamond-1 owned       = ${bn(d1.count.value).toString()}`);
  }
  console.log(`  prestigeUp.purchased = ${prestigeUp.purchasedCount.value}/${prestigeUp.size}`);
}

function runDiscovery(): void {
  console.log('=== Scaler prestige-beat discovery ===');
  console.log(`tickDelta=${TICK_DELTA}s   maxSimTime=${MAX_SIM_SECONDS}s`);

  const { engine } = createScalerEngine({
    persistenceNamespace: `prestige-beat-discovery-${Date.now()}`,
  });
  engine.selectMod(SCALER_MOD_ID);
  engine.start();

  const pp = getPrestigePoints();
  const diamond1 = getDiamondProducers().getProducer('diamond-1');

  snapshot('t=0 (post-start, autobuyers idle)');

  // Phase 1 — first prestige fires.
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

  // Phase 2 — diamond autobuyer kicks in (tier-presence gate now open).
  let diamondOwnedAt = -1;
  const phase2 = runUntil({
    engine,
    tickDelta: TICK_DELTA,
    maxSimTime: 60, // diamond-1 is cheap; should appear within seconds.
    until: ({ simTime }) => {
      if (diamond1 && Decimal.gte(diamond1.count.value, 1)) {
        diamondOwnedAt = firstPrestigeAt + simTime;
        return true;
      }
      return false;
    },
  });

  if (phase2.terminated !== 'predicate') {
    console.log('\n!! diamond-1 not auto-bought within 60s of first prestige !!');
    snapshot('diamond gate budget exhausted');
  } else {
    console.log(
      `\n>> diamond-1 auto-bought at simTime = ${diamondOwnedAt}s (${phase2.elapsedSimulated}s after first prestige)`,
    );
    snapshot('beat-2 reached');
  }

  engine.dispose();
}

runDiscovery();
