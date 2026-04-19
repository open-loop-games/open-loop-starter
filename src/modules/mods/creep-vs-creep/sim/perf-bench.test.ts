/**
 * Tick-throughput measurement for the creep-vs-creep sim. Skipped by default
 * (would inflate every CI run); opt in with `SIM_PROBES=1 pnpm test:sim` or
 * by removing the `skipIf`. Owned by OL-617's perf investigation.
 *
 * Reports active-phase ticks/sec by stepping each sample inside a fresh
 * round (resetting after the round terminates so we never measure idle
 * `phase: ended` ticks). The active-phase floor is the number that matters
 * for probe-budget projections.
 */
import { beforeAll, describe, it } from 'vitest';
import { buildDirectorEngine, simProbesEnabled, type BuiltEngine } from './helpers';

describe.skipIf(!simProbesEnabled())('creep-vs-creep tick perf bench', () => {
  let built: BuiltEngine;

  beforeAll(() => {
    built = buildDirectorEngine();
  });

  it(
    'measures active-phase tick throughput and projects probe budgets',
    { timeout: 120_000 },
    () => {
      // Warm: 200 ticks at 0.05 dt = 10 sim-sec, past slow-start.
      for (let i = 0; i < 200; i++) built.engine.loop.stepOnce();

      const samples: {
        ticks: number;
        ms: number;
        ticksPerSec: number;
        simSecPerWallSec: number;
      }[] = [];

      for (const ticks of [1_000, 5_000]) {
        // Snap back to a fresh active-phase round so we measure real sim work,
        // not the ~zero-cost ticks the mod runs while phase === 'ended'.
        if (built.state.round.phase.value !== 'active') {
          built.state.round.startNextRound();
        } else if (built.state.round.elapsed.value > 200) {
          built.state.round.endRound();
          built.state.round.startNextRound();
        }
        const start = performance.now();
        for (let i = 0; i < ticks; i++) built.engine.loop.stepOnce();
        const ms = performance.now() - start;
        samples.push({
          ticks,
          ms: Math.round(ms),
          ticksPerSec: Math.round(ticks / (ms / 1000)),
          simSecPerWallSec: Math.round((ticks * 0.05) / (ms / 1000)),
        });
      }

      console.log('--- creep-vs-creep tick bench (active phase) ---');
      for (const s of samples) {
        console.log(
          `  ${`${s.ticks} ticks`.padEnd(12)} → ${s.ms.toString().padStart(6)} ms  ` +
            `(${s.ticksPerSec.toString().padStart(7)} ticks/s, ${s.simSecPerWallSec} sim-sec/wall-sec)`,
        );
      }

      const tps = samples[samples.length - 1]!.ticksPerSec;
      const project = (label: string, simMin: number, seeds: number, cells: number) => {
        const totalTicks = ((simMin * 60) / 0.05) * seeds * cells;
        const wallSec = totalTicks / tps;
        console.log(
          `  ${label.padEnd(40)} ${simMin}min × ${seeds} × ${cells} = ` +
            `${(totalTicks / 1e6).toFixed(2)}M ticks → ~${wallSec.toFixed(0)}s wall (${(wallSec / 60).toFixed(1)}min)`,
        );
      };
      console.log('--- probe-budget projections ---');
      project('flow-field-decay-primary-feel', 5, 50, 3);
      project('ai-personality-swap', 5, 50, 3);
      project('spread-base-rate-pacing', 3, 50, 3);
      project('hotspot-yield-scaling beat-6', 100, 50, 3);
      project('meta-upgrade-cost-scaling beat-7', 140, 50, 3);
      project('meta-currency-accumulation-rate', 140, 50, 3);
    },
  );
});
