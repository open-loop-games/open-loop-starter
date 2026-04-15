/**
 * Benchmark runner — boots CF via `bootMod`, drives a per-tick wall-clock
 * measurement loop, and returns percentile stats.
 *
 * Why we don't use `runMatrix` / `runHeadless`: those harnesses are
 * designed for deterministic batch simulation. Their inner loop is tight
 * sync with no yield points between ticks, so Vue's watcher queue batches
 * every reactive effect and flushes once at the very end. The measured
 * per-tick cost then excludes watcher-flush work, which for a reactive
 * consumer engine is a dishonest number. We drive ticks ourselves with
 * `await nextTick()` after each `stepOnce()` so reactive effects flush
 * per-tick like they do in live play, and yield to the event loop
 * periodically so the UI stays responsive during long runs.
 *
 * Worker offload is a known follow-up — at realistic tick counts and
 * inflated content the main thread will still freeze between yields.
 * Tracked under the engine-performance umbrella, not this mod.
 *
 * Comparison baseline: borglike — a full roguelike with per-turn BFS,
 * Dijkstra flow caches, and danger grids — runs at 0.13ms avg/tick
 * (borglike/docs/PERFORMANCE.md, 2026-02-07). Numbers meaningfully
 * worse than that at a handful of producers are an engine perf signal.
 */
import { nextTick } from 'vue';
import { Decimal } from 'open-loop-engine';
import { settingsModule } from '@/modules/settings';
import { uiRegistryModule, setSlotWritesEnabled } from '@/modules/ui-registry';
import {
  cookieFactoryModule,
  CookieFactoryKey,
} from '@/modules/mods/cookie-factory';
import { bootMod } from '@/test/bootMod';

export interface CellConfig {
  name: string;
  description: string;
  warmup: number;
  ticks: number;
  automation: boolean;
  seedCookies?: number;
}

export interface CellStats {
  name: string;
  ticks: number;
  meanMs: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  totalMs: number;
}

export interface RunCellOptions {
  /** Called with a human-readable progress string every ~500 ticks. */
  onProgress?: (message: string) => void;
}

/** Starting set. Shipped as a first slice; expand once perf work lands. */
export const DEFAULT_CELLS: CellConfig[] = [
  {
    name: 'cf-idle',
    description: 'no automation, no seed — wiring floor per tick',
    warmup: 100,
    ticks: 2000,
    automation: false,
  },
  {
    name: 'cf-auto-burning',
    description:
      'auto-buy on, seeded 1e30 — purchases + chain rebuilds fire every tick',
    warmup: 100,
    ticks: 2000,
    automation: true,
    seedCookies: 1e30,
  },
  {
    name: 'cf-auto-steady',
    description:
      'auto-buy on, seeded 1e100 — warmup saturates; measured window is steady-state',
    warmup: 500,
    ticks: 3000,
    automation: true,
    seedCookies: 1e100,
  },
];

function computeStats(name: string, samples: number[]): CellStats {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const pick = (p: number): number =>
    sorted[Math.min(n - 1, Math.floor(n * p))] ?? 0;
  const totalMs = samples.reduce((a, b) => a + b, 0);
  return {
    name,
    ticks: n,
    meanMs: n > 0 ? totalMs / n : 0,
    p50: pick(0.5),
    p95: pick(0.95),
    p99: pick(0.99),
    max: sorted[n - 1] ?? 0,
    totalMs,
  };
}

/**
 * Boot a fresh CF engine, warm it up, then measure per-tick wall-clock
 * cost with Vue watchers flushed between ticks. Yields every ~500 ticks
 * so the calling tab stays interactive.
 */
export async function runCell(
  cfg: CellConfig,
  opts: RunCellOptions = {},
): Promise<CellStats> {
  // Prevent CF's install from mutating the outer app's slot registry.
  // `await nextTick()` in the measurement loop is a Vue flush point, so
  // any transient `setSlot('game-layout', CFLayout)` would re-render the
  // outer app mid-run and unmount BenchmarkLayout under our own handler.
  setSlotWritesEnabled(false);
  const boot = bootMod({
    modules: [settingsModule, uiRegistryModule, cookieFactoryModule],
    namespacePrefix: `bench-${cfg.name}`,
  });
  try {
    const state = boot.engine.tryInject(CookieFactoryKey);
    if (!state) throw new Error(`${cfg.name}: CookieFactoryKey not provided`);

    if (cfg.seedCookies !== undefined) {
      state.cookies.value = Decimal.fromNumber(cfg.seedCookies);
    }
    if (cfg.automation) {
      state.autoBuyProducers.value = true;
      state.autoBuyUpgrades.value = true;
    }

    for (let i = 0; i < cfg.warmup; i++) {
      boot.engine.loop.stepOnce();
      await nextTick();
      if ((i & 0x1ff) === 0x1ff) {
        opts.onProgress?.(`${cfg.name}: warmup ${i + 1}/${cfg.warmup}`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    const samples: number[] = new Array(cfg.ticks);
    for (let i = 0; i < cfg.ticks; i++) {
      const t0 = performance.now();
      boot.engine.loop.stepOnce();
      await nextTick();
      samples[i] = performance.now() - t0;
      if ((i & 0x1ff) === 0x1ff) {
        opts.onProgress?.(`${cfg.name}: ${i + 1}/${cfg.ticks}`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    return computeStats(cfg.name, samples);
  } finally {
    boot.dispose();
    setSlotWritesEnabled(true);
  }
}
