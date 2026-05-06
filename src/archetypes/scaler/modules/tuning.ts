import type { DecimalSource, InjectionKey, OverrideRegistry } from 'open-loop-engine';

// Scaler-side tuning registry — declared-invention surface only.
//
// Per `archetypes/BALANCING.md § Canonical numbers are not tunable`:
// Synergism-cited values (baseCosts, log bases, mythos rates, Crystal
// baseLogCost arrays) are off-limits to the solver. The keys below are the
// declared-invention numbers from `balance/shape.ts SCALER_SUBSYSTEMS` —
// solver scripts (`balance/solve.ts` and the future D/E sub-leaf passes)
// `pushScope` against this registry to bisect each beat without rebuilding
// the engine per iteration.
//
// Mirrors `producer/modules/producers.ts ProducerTuningRegistryKey`. Created
// + provided by the antimatter module's install (first-installed scaler
// tier), so prestige + transcend modules can `ctx.inject(...)` during their
// own install and wire each declared knob through `tunable(...)`.

export type ScalerTunables = Record<string, () => DecimalSource>;

export const ScalerTuningRegistryKey: InjectionKey<OverrideRegistry<ScalerTunables>> = Symbol(
  'scaler/tuning-registry',
) as InjectionKey<OverrideRegistry<ScalerTunables>>;

// Convention: namespaced paths so a `grep -rn "tunable(" src/archetypes/scaler/`
// surfaces the auditable surface alongside its key.
//
//   modules/antimatter/UPGRADE_PER_LEVEL_MULT/accelerator
//   modules/prestige/CRYSTAL_PER_LEVEL_BONUS
//   modules/transcend/UPGRADE_PER_LEVEL_MULT/acc-boost
//   modules/transcend/TRANSCEND_UPGRADE_DEFAULT_PER_LEVEL_MULT
//   modules/transcend/UPGRADE_COST_SCALING
//   modules/transcend/CHALLENGE_BASE_REQUIREMENT/<id>
//   modules/transcend/CHALLENGE_COMPLETION_LIMIT
//   balance/achievementMultiplier
//   balance/challengeCompletionMultiplier
