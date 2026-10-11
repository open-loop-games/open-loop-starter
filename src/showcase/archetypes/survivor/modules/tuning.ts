import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * The `tunable()` key registry — the one perturbation path (no parallel
 * `data/balance.ts`; `.claude/rules/archetype-authoring.md` § Directory shape).
 * Probes and solvers perturb these keys via `registry.pushOverrides`.
 *
 * A key exists here only if perturbing it is MEANINGFUL. The solved quantities —
 * the beat ratio, the per-pick DPS gain, the XP ladder — are deliberately absent:
 * each is derived from the others to satisfy a constraint, so overriding one
 * directly decouples it from what it was derived for while still looking like a
 * knob. Perturb the inputs and re-derive (`../BALANCING.md` § The knobs).
 *
 * Namespaces:
 *   - `threat/*`   — escalation and density (`../data/arena.ts`)
 *   - `arena/*`    — geometry, and the risk premium on income
 *   - `schedule/*` — the run's time axis (`../data/schedule.ts`)
 *   - `income/*`   — collector yield (`../data/income.ts`)
 */
export type SurvivorTunableKey =
  | 'threat/spawnRate0'
  | 'threat/spawnGrowthPerMinute'
  | 'threat/hpGrowthPerMinute'
  | 'threat/contactDamageGrowthPerMinute'
  | 'threat/contactDps'
  | 'threat/densityCap'
  | 'arena/killRadius'
  | 'arena/collectRadius'
  | 'arena/baseHp'
  | 'schedule/hpPickGain'
  | 'income/collectorOnscreenShare';

export const SurvivorTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'survivor/tuning-registry',
) as InjectionKey<TuningRegistry>;

/**
 * Cross-module foundation. Runs first (no dependencies); every other module
 * carries `dependencies: ['survivor/tuning']` and injects the registry.
 */
export function createTuningModule(): EngineModule {
  return {
    id: 'survivor/tuning',
    install(ctx) {
      ctx.provide(SurvivorTuningRegistryKey, createTuningRegistry('survivor-tuning'));
    },
  };
}
