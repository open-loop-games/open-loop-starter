import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';
import type { BloonId, DefenderData, TowerId } from '../data/types';

/**
 * Keys registered against the defender tuning registry. Solvers and balance
 * probes perturb these via `pushScope`; the engine pattern lives at
 * `open-loop-engine/src/core/override-registry.ts` and surfaces through the
 * picker (`open-loop-engine/docs/api/harness.md` § Picker).
 *
 * Namespaces:
 *   - `towers/<id>/*`   — per-tower stats (cost, range, cooldown, projectile
 *                          speed, pierce, plus shape-specific extras)
 *   - `bloons/<id>/*`   — per-bloon stats (speed, lives-on-leak)
 *   - `economy/*`       — global economy scalars
 *
 * Wave compositions (`data/waves.ts`) are scaffolding — verbatim from
 * `BloonsTD.as:574+ BuildLevels()`, citation-anchored, NOT perturbable. The
 * arc-1 balance pass tunes per-tower/per-bloon stats + economy against the
 * fixed wave schedule.
 *
 * Grep for `tunable(` to audit the surface.
 */
export type DefenderTunableKey =
  | `towers/${TowerId}/baseCost`
  | `towers/${TowerId}/rangeLaneUnits`
  | `towers/${TowerId}/attackCooldownSec`
  | `towers/${TowerId}/projectileSpeedLaneUnitsPerSec`
  | `towers/${TowerId}/pierceMax`
  | 'towers/bomb/splashRadiusLaneUnits'
  | 'towers/ice/freezeDurationSec'
  | 'towers/tack/volleyCount'
  | `bloons/${BloonId}/speedLaneUnitsPerSec`
  | `bloons/${BloonId}/livesOnLeak`
  | 'economy/startingMoney'
  | 'economy/maxLives'
  | 'economy/sellRate'
  | 'economy/moneyPerPop';

export const DefenderDataKey: InjectionKey<DefenderData> = Symbol(
  'defender/data',
) as InjectionKey<DefenderData>;

export const DefenderTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'defender/tuning-registry',
) as InjectionKey<TuningRegistry>;

/**
 * Cross-module foundation. Creates the override registry that all `tunable()`
 * reader sites bind into and publishes the immutable `DefenderData` for
 * sibling modules to pin against.
 *
 * Runs first in the module list — no dependencies. Per-module modules carry
 * `dependencies: ['defender/tuning']` and inject the registry.
 */
export function createTuningModule(data: DefenderData): EngineModule {
  return {
    id: 'defender/tuning',
    install(ctx) {
      const registry = createTuningRegistry('defender-tuning');
      ctx.provide(DefenderDataKey, data);
      ctx.provide(DefenderTuningRegistryKey, registry);
    },
  };
}
