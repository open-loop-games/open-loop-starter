import { unref } from 'vue';
import {
  persistent,
  processGetter,
  type Computable,
  type EngineContext,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from 'open-loop-engine';

// vanilla canonical (architecture):
//   AntimatterDimensionsSourceCode/src/core/autobuyers/autobuyer.js — abstract
//     AutobuyerState class hierarchy (AutobuyerState → IntervaledAutobuyerState
//     → UpgradeableAutobuyerState).
//   AntimatterDimensionsSourceCode/src/core/autobuyers/autobuyers.js:122-137 —
//     master tick loop (single sequential canTick → tick).
//
// Mirror of `src/archetypes/scaler/modules/autobuyers/index.ts` — the scaler
// archetype established this shape under OL-854; OL-855 backports it across
// archetypes so the autobuyer-as-content pattern is the in-tree default.

export interface AutobuyerSpec<Config = unknown> {
  /** Stable identifier; persistent state lives under this name. */
  id: string;
  /** Group affordance for UI accessors. Free-form. */
  groupId?: string;
  /** Human-readable label for the toggle row. */
  displayName: string;
  /** Unlock predicate. Mirrors AD's `get isUnlocked()`. */
  isUnlocked: Computable<boolean>;
  /** Player toggle. Mirrors AD's per-instance `isActive`. */
  isActive: Persistent<boolean>;
  /**
   * Throttle interval in seconds. `0` (default) fires every tick; engine-level
   * helpers like {@link setupPolicyAutoPurchase} carry their own interval, so
   * autobuyers wrapping those helpers leave this at 0 and let the helper
   * throttle.
   */
  interval?: Computable<number>;
  /** Bespoke per-autobuyer config. */
  config?: Config;
  /**
   * Action body. Autobuyers that delegate to `setupPolicyAutoPurchase` /
   * `setupSweepAutoPurchase` pass an empty `tick` and rely on the engine
   * helper's own ctx.onTick — they only need the registry for unlock
   * surfacing + UI toggle bridging.
   */
  tick?: (dt: number, ctx: EngineContext) => void;
}

export const AutobuyerMasterToggleKey: InjectionKey<Persistent<boolean>> = Symbol(
  'producer/autobuyer-master',
) as InjectionKey<Persistent<boolean>>;

export const AutobuyerRegistryKey: InjectionKey<AutobuyerSpec[]> = Symbol(
  'producer/autobuyer-registry',
) as InjectionKey<AutobuyerSpec[]>;

// Helper that callers compose into engine-helper `enabled` knobs. Equivalent
// to AD's `canTick` predicate minus the interval check (which engine helpers
// handle internally).
export function autobuyerGate(master: Persistent<boolean>, ab: AutobuyerSpec): () => boolean {
  const unlocked = processGetter(ab.isUnlocked);
  return () => master.value && ab.isActive.value && Boolean(unref(unlocked));
}

/**
 * Master autobuyer registry module. Installs the `autobuyersOn` toggle and an
 * empty registry; per-category autobuyer modules push their specs in connect().
 */
export function createAutobuyerRegistryModule(): EngineModule {
  return {
    id: 'producer/autobuyers',
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
