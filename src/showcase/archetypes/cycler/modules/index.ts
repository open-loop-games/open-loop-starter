import type { EngineModule } from '@open-loop/engine';
import { createCycleModule, type CycleModuleOptions } from './cycle';
import { createBuildModule, getBuild, type BuildModuleOptions } from './build';
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
  PrestigeKey,
  getPrestige,
  createPrestigeModule,
  type PrestigeApi,
  type PrestigeModuleOptions,
} from './prestige';

export interface CyclerModulesOptions
  extends CycleModuleOptions, BuildModuleOptions, PrestigeModuleOptions {}

/**
 * Compose the Cycler modules. Build installs first and owns the saturated
 * capacity ceiling D_max; the cycle kernel's peg reads it (`getBuild().dMax`)
 * unless an explicit `capacity` override is passed (kernel-only boots, forced
 * prestige-tier stand-ins). Prestige closes the loop — it reads the live kernel
 * (run-end) and build (raisePower) via their getters, so it installs last.
 * Burn-tier / upgrade modules join as the archetype grows up through its ports
 * (see `../IDENTITY.md` § Growth ports).
 */
export function createCyclerModules(options: CyclerModulesOptions = {}): EngineModule[] {
  const build = createBuildModule(options);
  const cycle = createCycleModule({
    ...options,
    capacity: options.capacity ?? (() => getBuild().dMax.value),
  });
  const prestige = createPrestigeModule(options);
  return [build, cycle, prestige];
}
