/**
 * Cycler behavioral/lock harness — the game-facing wrapper over `bootTestEngine`.
 * Hardcodes the Cycler module stack so tests read as specs:
 *
 *   beforeEach(() => boot());
 *   it('…', async () => { await tickUntil(() => cycle().runState.value === 'ended'); … });
 *
 * Fresh engine per `boot()` (call it in `beforeEach`) — modules rebind state on
 * `install` and the namespace is unique per boot, so a fresh boot IS the reset.
 *
 * Unlike the `_blank` no-arg harness, `boot()` takes `CycleModuleOptions`: the
 * Cycler's entire test surface is parameterized runs (force the difficulty
 * surface H/g, force a raised capacity to stand in for a prestige tier), so
 * threading options through is the natural shape. `boot()` with no args is the
 * shipped configuration.
 *
 * TICK_RATE is 1 — the Cycler economy is minute-scale, so 1 tick = 1 game-second
 * gives minute resolution via `tick(60)` and keeps a full run to ~1k ticks. This
 * matches the coarse tick the balance probe uses (`.claude/CLAUDE.md`
 * § Balance methodology); the crossing lands within one dt.
 */

import { type Engine, type TuningRegistry } from '@open-loop/engine';
import { bootTestEngine, type TestEngineHandle } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { BOARD, REFERENCE_DEFENSE } from '../data/pieces';
import {
  CyclerTuningRegistryKey,
  createCyclerModules,
  CycleKey,
  BuildKey,
  WallKey,
  BurnTierKey,
  PrestigeKey,
  UpgradesKey,
  type CycleApi,
  type BuildApi,
  type WallApi,
  type BurnTierApi,
  type PrestigeApi,
  type UpgradesApi,
  type CyclerModulesOptions,
} from '../modules';

const TICK_RATE = 1;

let handle: TestEngineHandle;

/** Build a fresh engine with the Cycler stack. Options force H/g/capacity/board. */
export function boot(options: CyclerModulesOptions = {}): Engine {
  handle = bootTestEngine({
    modules: [...sharedBase, ...createCyclerModules(options)],
    namespacePrefix: 'cycler-test',
    tickRate: TICK_RATE,
  });
  return handle.engine;
}

/**
 * The archetype's tuning registry — the one perturbation path. A suite that
 * needs a different balance value pushes a scope rather than re-booting with
 * overridden data:
 *
 *   const restore = tuning().pushScope('test:H', { 'peg/headroom': () => 32 });
 *   try { ... } finally { restore(); }
 */
export function tuning(): TuningRegistry {
  const registry = getEngine().tryInject(CyclerTuningRegistryKey);
  if (!registry) throw new Error('cycler/harness: tuning registry not provided');
  return registry;
}

export function getEngine(): Engine {
  return handle.engine;
}

/** The installed cycle kernel API for the current engine. */
export function cycle(): CycleApi {
  const api = handle.engine.tryInject(CycleKey);
  if (!api) throw new Error('cycler/sim/harness: cycle module not installed');
  return api;
}

/** The installed build API for the current engine. */
export function build(): BuildApi {
  const api = handle.engine.tryInject(BuildKey);
  if (!api) throw new Error('cycler/sim/harness: build module not installed');
  return api;
}

/** The installed wall (defended line) API for the current engine. */
export function wall(): WallApi {
  const api = handle.engine.tryInject(WallKey);
  if (!api) throw new Error('cycler/sim/harness: wall module not installed');
  return api;
}

/** The installed burn-tier API for the current engine. */
export function burnTier(): BurnTierApi {
  const api = handle.engine.tryInject(BurnTierKey);
  if (!api) throw new Error('cycler/sim/harness: burn-tier module not installed');
  return api;
}

/** The installed prestige API for the current engine. */
export function prestige(): PrestigeApi {
  const api = handle.engine.tryInject(PrestigeKey);
  if (!api) throw new Error('cycler/sim/harness: prestige module not installed');
  return api;
}

/** The installed upgrades API (the permanent catalog) for the current engine. */
export function upgrades(): UpgradesApi {
  const api = handle.engine.tryInject(UpgradesKey);
  if (!api) throw new Error('cycler/sim/harness: upgrades module not installed');
  return api;
}

/**
 * Place the shared `REFERENCE_DEFENSE` board (`data/pieces.ts`) — a forward Lance
 * line, Reactors behind, one Bulwark. Its realized `clearRate` is a fixed fraction k
 * of the aspirational `cMax`, so a run reaches a CONSISTENT, power-invariant crossing
 * (both realized C and cMax scale ·producerUpgradeRatio^L, so k holds across power).
 * Wave-model tests place this so the run reaches the pegged crossing + Δ_wall tail
 * rather than breaching at wave 0 with an empty board.
 */
export function placeDefense(): void {
  const b = build();
  for (let y = 0; y < BOARD.height; y++) {
    for (let x = 0; x < BOARD.width; x++) {
      const kind = REFERENCE_DEFENSE[y * BOARD.width + x];
      if (kind) b.placeAt(x, y, kind);
    }
  }
}

/** Advance n ticks (n game-seconds at TICK_RATE=1), flushing reactive effects. */
export function tick(n = 1): Promise<void> {
  return handle.tick(n);
}

/** Step until `condition()` holds (or throw after `maxTicks`). */
export function tickUntil(condition: () => boolean, maxTicks?: number): Promise<number> {
  return handle.tickUntil(condition, maxTicks);
}
