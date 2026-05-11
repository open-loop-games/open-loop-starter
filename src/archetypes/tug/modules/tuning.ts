import {
  createTuningRegistry,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from 'open-loop-engine';
import type { TugData } from '../data/types';

/** Side discriminator for mirrored-instance modules (units, income). */
export type Side = 'player' | 'ai';

export const SIDES: readonly Side[] = ['player', 'ai'];

/** Length of the lane in lane-units. Direct-Strike-typical fixed length;
 *  structural, not a tunable. Player spawns at 0, AI at `LANE_LENGTH`;
 *  fortress positions mirror those endpoints. Shared between `lane.ts`
 *  (movement/combat) and `fortress.ts` (fortress unit positioning) to
 *  avoid drift between the two. */
export const LANE_LENGTH = 100;

/**
 * The keys leaf 6's Tier-C tuner perturbs via `pushScope`. Add new keys here
 * AND register them at the consumer site via `tunable(registry, key, ...)`.
 * Grep for `tunable(` to audit the surface.
 */
export type TugTunableKey =
  | 'balance/baseIncomeRate'
  | 'balance/aiIncomeMultiplier'
  | 'fortress/hp'
  | 'units/marine/cost'
  | 'units/siege-tank/cost'
  | 'income-upgrades/refinery-1/cost'
  | 'income-upgrades/refinery-1/multiplier'
  | 'counter-matrix/strongCounter'
  | 'counter-matrix/weakCounter';

export type TugTunables = Record<string, () => DecimalSource>;

export const TugDataKey: InjectionKey<TugData> = Symbol('tug/data') as InjectionKey<TugData>;

export const TugTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'tug/tuning-registry',
) as InjectionKey<TuningRegistry>;

/**
 * Cross-side foundation. Creates the override registry that all `tunable()`
 * reader sites bind into and publishes the immutable `TugData` for sibling
 * modules + composables to pin against.
 *
 * Runs first in the match-scope module list (no dependencies). Per-side
 * modules carry `dependencies: ['tug/tuning']` and inject the registry.
 *
 * A dedicated module — rather than folding the registry into the first
 * per-side factory — keeps creation symmetric: Producer/Ambient host the
 * registry inside their distinguished resource-defining module
 * (`producer/producers`, `ambient/auto-producers`); Tug has no symmetric
 * counterpart, so any per-side choice would be asymmetric. categories.ts
 * cannot host it either — it depends on per-side category keys, and per-side
 * modules need the registry first.
 */
export function createTuningModule(data: TugData): EngineModule {
  return {
    id: 'tug/tuning',
    install(ctx) {
      const registry = createTuningRegistry('tug-tuning');
      ctx.provide(TugDataKey, data);
      ctx.provide(TugTuningRegistryKey, registry);
    },
  };
}
