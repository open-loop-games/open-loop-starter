// Diagnostic: how far does coin.cumulative climb under the autobuyer-driven
// sim? Sub-leaf D's Reset.canReset gate threshold is `data.balance.
// prestigeConversionLog` (1e25). If coin.cumulative never reaches that
// floor within the budget, beat-3 never fires regardless of ROI threshold.
//
// Run: pnpm exec vite-node src/archetypes/scaler/balance/probe-coin.ts

import { runUntil, ResourceRegistryKey } from 'open-loop-engine';
import { buildScalerSimEngine } from './bot';
import { ScalerTuningRegistryKey } from '../modules/tuning';

const BUDGET_SEC = 90 * 60 * 2.5;

const engine = buildScalerSimEngine();
const tuning = engine.tryInject(ScalerTuningRegistryKey)!;
// Apply sub-leaf C's calibrated achievementMultiplier so we measure under
// the same regime the beat-3 solver runs at, not raw default (1.02).
tuning.pushScope('probe-coin', {
  'balance/achievementMultiplier': () => 1000,
});
const registry = engine.tryInject(ResourceRegistryKey)!;
const coinEntry = registry.list().find((e) => e.resource.id === 'scaler/coins');
const prestigeShardsEntry = registry.list().find((e) => e.resource.id === 'scaler/prestige-shards');
const prestigePointsEntry = registry.list().find((e) => e.resource.id === 'scaler/prestige-points');
if (!coinEntry || !prestigeShardsEntry || !prestigePointsEntry) {
  throw new Error('probe-coin: required resources not registered');
}
const coin = coinEntry.resource;
const prestigeShards = prestigeShardsEntry.resource;
const prestigePoints = prestigePointsEntry.resource;

const checkpoints = [60, 300, 600, 1200, 1800, 3600, 5400, BUDGET_SEC];
let nextIdx = 0;
const t0 = Date.now();

const result = runUntil({
  engine,
  until: ({ simTime }) => {
    while (nextIdx < checkpoints.length && simTime >= checkpoints[nextIdx]!) {
      const cp = checkpoints[nextIdx]!;
      console.log(
        `t=${cp}s  coin=${String(coin.value)}  coin.cumulative=${String(
          coin.cumulative?.value,
        )}  prestigeShards.cumulative=${String(
          prestigeShards.cumulative?.value,
        )}  prestigePoints.cumulative=${String(prestigePoints.cumulative?.value)}`,
      );
      nextIdx++;
    }
    return false;
  },
  maxSimTime: BUDGET_SEC,
  tickDelta: 1,
});

console.log(
  `\nfinished t=${result.elapsedSimulated}s in ${
    (Date.now() - t0) / 1000
  }s. terminated=${result.terminated}`,
);
