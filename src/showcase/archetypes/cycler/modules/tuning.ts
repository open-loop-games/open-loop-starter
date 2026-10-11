import {
  createTuningRegistry,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * Keys registered against the cycler tuning registry — the one perturbation
 * path. Probes and the balance workbench sweep these via `pushOverrides`; the
 * registry surfaces them to the picker so they can be enumerated rather than
 * known in advance.
 *
 * Namespaces follow the spine's terms rather than the files the constants sit
 * in, because that is how the economy decomposes (`../BALANCING.md` § The knobs):
 *
 *   - `peg/*`        — the two numbers that author pacing: headroom H, salvo base g
 *   - `wave/*`       — the STANDBY/INBOUND cycle that converts waves to minutes
 *   - `line/*`       — the defended line: HP buffer and its repair drip
 *   - `capacity/*`   — the terms of the saturating ceilings dMax and cMax
 *   - `upgrades/*`   — the convergent within-run ladder and the g-bender
 *   - `prestige/*`   — currency minting and the reach quorum
 *
 * Grep for `tunable(` to audit the surface.
 *
 * **Structural, deliberately absent:** board and zone cardinality
 * (`boardCells`, `forwardCells`, `forwardRows`, `backCells`) and
 * `bossMilestone` are content shape, not balance — the engine guide
 * § Where balance constants live keeps those in the data layer. The salvo
 * posture ladder is content too; it is passed as `posture` at construction.
 */
export type CyclerTunableKey =
  | 'peg/headroom'
  | 'peg/salvoBase'
  | 'wave/standbySeconds'
  | 'wave/inboundSeconds'
  | 'line/hp'
  | 'line/baseRepair'
  | 'capacity/baseOutputCeiling'
  | 'capacity/adjacencyBoost'
  | 'capacity/lanceIntercept'
  | 'capacity/producerUpgradeRatio'
  | 'upgrades/reinvestCostRatio'
  | 'upgrades/reinvestOutputExponent'
  | 'upgrades/powerUpgradeCostRatio'
  | 'upgrades/gBendRatio'
  | 'upgrades/gBendBaseCost'
  | 'upgrades/gBendCostRatio'
  | 'prestige/fragmentScalePrimary'
  | 'prestige/fragmentScaleSecondary'
  | 'prestige/mergeQuorum';

export type CyclerTunables = Record<string, () => DecimalSource>;

export const CyclerTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'cycler/tuning-registry',
) as InjectionKey<TuningRegistry>;

/**
 * Creates the override registry every `tunable()` reader site binds into.
 *
 * Installs first and depends on nothing; every other cycler module carries
 * `dependencies: ['cycler/tuning']` and injects the registry. A dedicated
 * module rather than folding it into `build.ts` — build is the first module
 * that reads a balance constant, but it is not the only one that could be, and
 * hosting the registry there would make the install order carry a meaning it
 * does not otherwise have.
 */
export function createTuningModule(): EngineModule {
  return {
    id: 'cycler/tuning',
    install(ctx) {
      ctx.provide(CyclerTuningRegistryKey, createTuningRegistry('cycler-tuning'));
    },
  };
}
