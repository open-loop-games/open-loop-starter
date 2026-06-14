import { unref } from 'vue';
import {
  persistent,
  processGetter,
  type Computable,
  type EngineContext,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';

// vanilla canonical (architecture):
//   AntimatterDimensionsSourceCode/src/core/autobuyers/autobuyer.js — abstract
//     AutobuyerState class hierarchy.
//   AntimatterDimensionsSourceCode/src/core/autobuyers/autobuyers.js:122-137 —
//     master tick loop.
//
// Mirror of `src/archetypes/scaler/modules/autobuyers/index.ts` and
// `src/archetypes/producer/modules/autobuyers/index.ts` — the cross-archetype
// autobuyer-as-content shape. Visibility unlocks (`modules/unlocks.ts`)
// remain non-registered: their `setupSweepAutoPurchase` install fires
// unconditionally on threshold cross, since the Ambient contract forbids
// player-pausable content reveals.

export interface AutobuyerSpec<Config = unknown> {
  /** Stable identifier; persistent state lives under this name. */
  id: string;
  /** Group affordance for UI accessors. Free-form. */
  groupId?: string;
  /** Human-readable label for the toggle row. */
  displayName: string;
  /** Unlock predicate. */
  isUnlocked: Computable<boolean>;
  /** Player toggle. */
  isActive: Persistent<boolean>;
  /** Throttle interval in seconds; 0 fires every tick. */
  interval?: Computable<number>;
  /** Bespoke per-autobuyer config. */
  config?: Config;
  /** Action body. Specs delegating to engine helpers leave this empty. */
  tick?: (dt: number, ctx: EngineContext) => void;
}

export const AutobuyerMasterToggleKey: InjectionKey<Persistent<boolean>> = Symbol(
  'ambient/autobuyer-master',
) as InjectionKey<Persistent<boolean>>;

export const AutobuyerRegistryKey: InjectionKey<AutobuyerSpec[]> = Symbol(
  'ambient/autobuyer-registry',
) as InjectionKey<AutobuyerSpec[]>;

export function autobuyerGate(master: Persistent<boolean>, ab: AutobuyerSpec): () => boolean {
  const unlocked = processGetter(ab.isUnlocked);
  return () => master.value && ab.isActive.value && Boolean(unref(unlocked));
}

/**
 * Master autobuyer registry module. Per-category autobuyer modules push
 * their specs in connect().
 */
export function createAutobuyerRegistryModule(): EngineModule {
  return {
    id: 'ambient/autobuyers',
    install(ctx: EngineContext): void {
      const master = persistent<boolean>(false, { name: 'autobuyersOn' });
      const registry: AutobuyerSpec[] = [];

      ctx.provide(AutobuyerMasterToggleKey, master);
      ctx.provide(AutobuyerRegistryKey, registry);

      const accum = new WeakMap<AutobuyerSpec, number>();

      ctx.onTick((dt: number) => {
        if (!master.value) return;
        for (const spec of registry) {
          if (!spec.tick) continue;
          if (!spec.isActive.value) continue;
          if (!unref(processGetter(spec.isUnlocked))) continue;

          const interval = Number(unref(processGetter(spec.interval ?? 0)));
          if (interval <= 0) {
            spec.tick(dt, ctx);
            continue;
          }
          const carried = (accum.get(spec) ?? 0) + dt;
          if (carried < interval) {
            accum.set(spec, carried);
            continue;
          }
          let remaining = carried;
          while (remaining >= interval) {
            spec.tick(dt, ctx);
            remaining -= interval;
          }
          accum.set(spec, remaining);
        }
      });
    },
  };
}
