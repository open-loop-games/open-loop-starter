import type { EngineModule } from '@open-loop/engine';
import { createCycleModule, type CycleModuleOptions } from './cycle';
import { createBuildModule } from './build';
import { createWallModule } from './wall';
import { createBurnTierModule, getBurnTier, type BurnTierModuleOptions } from './burn-tier';
import { createPrestigeModule } from './prestige';
import { createUpgradesModule, getUpgrades } from './upgrades';
import { createTuningModule } from './tuning';

export {
  CycleKey,
  getCycle,
  createCycleModule,
  type CycleApi,
  type CyclePhase,
  type RunState,
  type CycleModuleOptions,
} from './cycle';
export { BuildKey, getBuild, createBuildModule, type BuildApi } from './build';
export {
  evaluateBoard,
  previewAt,
  coveredCells,
  type OccupancyView,
  type BoardEvaluation,
  type ReceiverCell,
} from './adjacency';
export { WallKey, getWall, createWallModule, type WallApi } from './wall';
export {
  CyclerTuningRegistryKey,
  createTuningModule,
  type CyclerTunableKey,
  type CyclerTunables,
} from './tuning';
export {
  BurnTierKey,
  getBurnTier,
  createBurnTierModule,
  type BurnTierApi,
  type BurnTierModuleOptions,
} from './burn-tier';
export { PrestigeKey, getPrestige, createPrestigeModule, type PrestigeApi } from './prestige';
export { UpgradesKey, getUpgrades, createUpgradesModule, type UpgradesApi } from './upgrades';

/**
 * Construction-time options — **content and wiring only**. Balance values are
 * not here: they bind through `tunable()` against the registry in `tuning.ts`,
 * which is the archetype's one perturbation path. A probe sweeps a number with
 * `pushOverrides`, never by rebuilding the engine with a different blob.
 */
export interface CyclerModulesOptions extends CycleModuleOptions, BurnTierModuleOptions {}

/**
 * Compose the Cycler modules. Build installs first and owns the closed-form ceilings
 * (`dMax` output / `cMax` clear-rate); the cycle kernel reads `getBuild().cMax` for the
 * salvo peg and realized `clearRate` for leak resolution. Burn-tier installs next and
 * owns the per-wave pace surface — the kernel reads its active schedule
 * (`getBurnTier().schedule()`) unless an explicit `schedule` override is passed. Wall
 * holds the defended line the kernel drives. Prestige closes the cycle — it reads the
 * live kernel (run-end, endurance) and build (production, resetRun). Upgrades is the
 * permanent catalog on the prestige currency — it reads the Fragments Resource (prestige)
 * and the power level (build), so it installs LAST.
 */
export function createCyclerModules(options: CyclerModulesOptions = {}): EngineModule[] {
  // Installs first and depends on nothing — every balance constant in the
  // archetype binds through the registry it provides.
  const tuning = createTuningModule();
  const build = createBuildModule();
  const burnTier = createBurnTierModule(options);
  const cycle = createCycleModule({
    ...options,
    // The active pace surface: the active posture's salvoBase with the g-bender
    // applied (the sole pace lever bends g toward 1). Lazy — read only at startRun,
    // so it's frozen for the run and the crossing stays closed-form.
    schedule:
      options.schedule ??
      (() => {
        const s = getBurnTier().schedule();
        return { salvoBase: getUpgrades().bendBase(s.salvoBase) };
      }),
  });
  const wall = createWallModule();
  const prestige = createPrestigeModule();
  const upgrades = createUpgradesModule();
  return [tuning, build, burnTier, cycle, wall, prestige, upgrades];
}
