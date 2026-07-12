import type { EngineModule } from '@open-loop/engine';
import { createCycleModule, type CycleModuleOptions } from './cycle';
import { createBuildModule, getBuild, type BuildModuleOptions } from './build';
import { createBurnTierModule, getBurnTier, type BurnTierModuleOptions } from './burn-tier';
import { createPrestigeModule, type PrestigeModuleOptions } from './prestige';

export {
  CycleKey,
  getCycle,
  createCycleModule,
  type CycleApi,
  type CyclePhase,
  type RunState,
  type CycleModuleOptions,
} from './cycle';
export {
  BuildKey,
  getBuild,
  createBuildModule,
  type BuildApi,
  type BuildModuleOptions,
} from './build';
export {
  BurnTierKey,
  getBurnTier,
  createBurnTierModule,
  type BurnTierApi,
  type BurnTierModuleOptions,
} from './burn-tier';
export {
  PrestigeKey,
  getPrestige,
  createPrestigeModule,
  type PrestigeApi,
  type PrestigeModuleOptions,
} from './prestige';

export interface CyclerModulesOptions
  extends CycleModuleOptions, BuildModuleOptions, BurnTierModuleOptions, PrestigeModuleOptions {}

/**
 * Compose the Cycler modules. Build installs first and owns the saturated
 * capacity ceiling D_max; the cycle kernel's peg reads it (`getBuild().dMax`)
 * unless an explicit `capacity` override is passed (kernel-only boots, forced
 * prestige-tier stand-ins). Burn-tier installs next and owns the pace surface —
 * the kernel reads its active schedule (`getBurnTier().schedule()`) unless an
 * explicit `schedule` override is passed. Prestige closes the loop — it reads the
 * live kernel (run-end) and build (raisePower) via their getters, so it installs
 * last. Upgrade module joins as the archetype grows further (see `../IDENTITY.md`
 * § Growth ports).
 */
export function createCyclerModules(options: CyclerModulesOptions = {}): EngineModule[] {
  const build = createBuildModule(options);
  const burnTier = createBurnTierModule(options);
  const cycle = createCycleModule({
    ...options,
    capacity: options.capacity ?? (() => getBuild().dMax.value),
    schedule: options.schedule ?? (() => getBurnTier().schedule()),
  });
  const prestige = createPrestigeModule(options);
  return [build, burnTier, cycle, prestige];
}
