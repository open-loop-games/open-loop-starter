/**
 * Interlocker behavioral harness — the game-facing wrapper over `bootTestEngine`.
 * Hardcodes the interlocker module stack (shared base + all archetype modules)
 * so per-module specs read as behavior:
 *
 *   beforeEach(() => boot());
 *   it('…', async () => { automation().tierSystem.unlock('build'); await tick(50); … });
 *
 * Fresh engine per `boot()` (call it in `beforeEach`) — modules rebind state on
 * `install` and `bootTestEngine` allocates a unique persistence namespace per
 * call, so a fresh boot IS the reset (no per-module reset surface to maintain).
 *
 * TICK_RATE is 1 — the interlocker economy is second/minute-scale, so 1 tick =
 * 1 game-second matches the coarse tick the balance lane uses
 * (`.claude/CLAUDE.md` § Balance methodology) and keeps behavioral runs short.
 * The automation module throttles at 1s, so it fires once per tick here.
 */

import { type Engine } from '@open-loop/engine';
import { bootTestEngine, type TestEngineHandle } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  createInterlockerModules,
  ResourcesKey,
  BuildingsKey,
  VillageKey,
  SciencesKey,
  WorkshopKey,
  AutomationKey,
  type ResourcesApi,
  type BuildingsApi,
  type VillageApi,
  type SciencesApi,
  type WorkshopApi,
  type AutomationApi,
} from '../modules';
import { DEFAULT_INTERLOCKER_DATA } from '../data';

const TICK_RATE = 1;

let handle: TestEngineHandle;

/** Build a fresh engine with the full interlocker stack. */
export function boot(): Engine {
  handle = bootTestEngine({
    modules: [...sharedBase, ...createInterlockerModules(DEFAULT_INTERLOCKER_DATA)],
    namespacePrefix: 'interlocker-test',
    tickRate: TICK_RATE,
  });
  return handle.engine;
}

export function getEngine(): Engine {
  return handle.engine;
}

function inject<T>(key: Parameters<Engine['tryInject']>[0] & { __t?: T }, label: string): T {
  const api = handle.engine.tryInject(key) as T | undefined;
  if (!api) throw new Error(`interlocker/sim/harness: ${label} module not installed`);
  return api;
}

export const resources = (): ResourcesApi => inject(ResourcesKey, 'resources');
export const buildings = (): BuildingsApi => inject(BuildingsKey, 'buildings');
export const village = (): VillageApi => inject(VillageKey, 'village');
export const sciences = (): SciencesApi => inject(SciencesKey, 'sciences');
export const workshop = (): WorkshopApi => inject(WorkshopKey, 'workshop');
export const automation = (): AutomationApi => inject(AutomationKey, 'automation');

/** Advance n ticks (n game-seconds at TICK_RATE=1), flushing reactive effects. */
export function tick(n = 1): Promise<void> {
  return handle.tick(n);
}

/** Step until `condition()` holds (or throw after `maxTicks`). */
export function tickUntil(condition: () => boolean, maxTicks?: number): Promise<number> {
  return handle.tickUntil(condition, maxTicks);
}
