import { type ComputedRef, computed } from 'vue';
import {
  createOverrideRegistry,
  createResource,
  createTimeSystem,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type OverrideRegistry,
  type Resource,
  type TimeSystem,
} from 'open-loop-engine';
import type { LooperData } from '../data/types';

/**
 * The override-registry value type. The canonical key list is the
 * `LooperTunableKey` union; push-scope sites are typed via
 * `Partial<Record<LooperTunableKey, () => DecimalSource>>` so typos surface at
 * the call site.
 */
export type LooperTunableKey =
  | 'balance/timeResourcePoolBase'
  | 'balance/skillLevelDivisor'
  | 'balance/instinctXpRatio'
  | 'balance/retentionDivisor'
  | 'balance/retentionExponent'
  | `actions/${string}/baseCost`
  | `zones/${string}/unlockThreshold`;

export type LooperTunables = Record<string, () => DecimalSource>;

// Injection keys consumed by sibling modules + composables.

export const ManaKey: InjectionKey<Resource<DecimalSource>> = Symbol('looper/mana') as InjectionKey<
  Resource<DecimalSource>
>;

export const ManaPoolMaxKey: InjectionKey<ComputedRef<DecimalSource>> = Symbol(
  'looper/mana-pool-max',
) as InjectionKey<ComputedRef<DecimalSource>>;

/**
 * Engine TimeSystem — `elapsed` is sim-seconds since the last `time.reset`,
 * `totalPlayTime` is cumulative across all resets. `loop.elapsed` covers the
 * "since loop start" need; `totalPlayTime` is here so a future achievement /
 * arc layer can read cumulative play.
 */
export const TimeSystemKey: InjectionKey<TimeSystem> = Symbol(
  'looper/time-system',
) as InjectionKey<TimeSystem>;

export const LooperDataKey: InjectionKey<LooperData> = Symbol(
  'looper/data',
) as InjectionKey<LooperData>;

export const LooperTuningRegistryKey: InjectionKey<OverrideRegistry<LooperTunables>> = Symbol(
  'looper/tuning-registry',
) as InjectionKey<OverrideRegistry<LooperTunables>>;

/**
 * Mana = the time-budget resource. The drain (1/sec sim-time) lives in
 * `loop.ts` where it can be gated on `loop.running`. This module is provider-
 * only: the resource, its pool-max ComputedRef, the tuning registry, and the
 * engine TimeSystem.
 *
 * Mana refills to `manaPoolMax` on loop restart via `loop.ts`'s `onRestart`
 * hook (NOT via `thingsToReset` — we want max, not zero). The pool max is a
 * `ComputedRef` over the `timeResourcePoolBase` tunable so a scope-push
 * retunes pool size without rebooting the engine.
 */
export function createManaModule(data: LooperData): EngineModule {
  return {
    id: 'looper/mana',
    install(ctx) {
      const tuningRegistry = createOverrideRegistry<LooperTunables>('looper-tuning');

      const manaPoolBase = tunable<DecimalSource>(
        tuningRegistry,
        'balance/timeResourcePoolBase',
        () => data.balance.timeResourcePoolBase,
      );
      const manaPoolMax = computed<DecimalSource>(() => manaPoolBase.value);

      // Initial mana = full pool on first boot. Saved value overrides on
      // subsequent loads (createResource is persistent under the hood).
      const mana = createResource<DecimalSource>(Number(manaPoolMax.value), {
        displayName: 'Mana',
        precision: 0,
        id: 'mana',
      });

      const time = createTimeSystem();
      ctx.onTick((dt: number) => time.tick(dt));

      ctx.provide(ManaKey, mana);
      ctx.provide(ManaPoolMaxKey, manaPoolMax);
      ctx.provide(TimeSystemKey, time);
      ctx.provide(LooperDataKey, data);
      ctx.provide(LooperTuningRegistryKey, tuningRegistry);
    },
  };
}
