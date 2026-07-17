import type { EngineModule } from '@open-loop/engine';
import { createCycleModule, type CycleModuleOptions } from './cycle';
import { createBuildModule, getBuild, type BuildModuleOptions } from './build';
import { createBurnTierModule, getBurnTier, type BurnTierModuleOptions } from './burn-tier';
import { createPrestigeModule, type PrestigeModuleOptions } from './prestige';
import { createUpgradesModule, getUpgrades, type UpgradesModuleOptions } from './upgrades';

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
  evaluateBoard,
  previewAt,
  coveredCells,
  type OccupancyView,
  type BoardEvaluation,
  type ProducerCell,
} from './adjacency';
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
export {
  UpgradesKey,
  getUpgrades,
  createUpgradesModule,
  type UpgradesApi,
  type UpgradesModuleOptions,
} from './upgrades';

export interface CyclerModulesOptions
  extends
    CycleModuleOptions,
    BuildModuleOptions,
    BurnTierModuleOptions,
    PrestigeModuleOptions,
    UpgradesModuleOptions {}

/**
 * Compose the Cycler modules. Build installs first and owns the saturated
 * capacity ceiling D_max; the cycle kernel's peg reads it (`getBuild().dMax`)
 * unless an explicit `capacity` override is passed (kernel-only boots, forced
 * prestige-tier stand-ins). Burn-tier installs next and owns the pace surface —
 * the kernel reads its active schedule (`getBurnTier().schedule()`) unless an
 * explicit `schedule` override is passed. Prestige closes the loop — it reads the
 * live kernel (run-end) and build (resetRun) via their getters. Upgrades is the
 * permanent catalog on the prestige wallet — it reads the Fragments Resource
 * (prestige) and the power level (build), so it installs LAST.
 */
export function createCyclerModules(options: CyclerModulesOptions = {}): EngineModule[] {
  const build = createBuildModule(options);
  const burnTier = createBurnTierModule(options);
  const cycle = createCycleModule({
    ...options,
    capacity: options.capacity ?? (() => getBuild().dMax.value),
    // The active pace surface: the burn-tier schedule with the g-bender applied to
    // its escalation base (the sole pace lever bends g toward 1). Lazy — read only
    // at startRun, so it's frozen for the run and the crossing stays closed-form.
    schedule:
      options.schedule ??
      (() => {
        const s = getBurnTier().schedule();
        return {
          escalationBase: getUpgrades().bendBase(s.escalationBase),
          escalationTimescale: s.escalationTimescale,
        };
      }),
  });
  const prestige = createPrestigeModule(options);
  const upgrades = createUpgradesModule(options);
  return [build, burnTier, cycle, prestige, upgrades];
}
