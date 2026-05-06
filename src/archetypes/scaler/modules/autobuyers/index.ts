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
// AD's hooks (isUnlocked / isActive / canTick / tick / reset) lift directly
// onto an engine-module shape — `isUnlocked` becomes a `Computable<boolean>`,
// `isActive` becomes a `Persistent<boolean>`, `tick` becomes a function over
// `(dt, ctx)`, and the master `Autobuyers.tick()` loop becomes a single
// `ctx.onTick` handler that walks the registry.

export interface AutobuyerSpec<Config = unknown> {
  /** Stable identifier; persistent state lives under this name. */
  id: string;
  /** Group affordance for UI accessors (per-tier sweep, etc.). Free-form. */
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
  /** Bespoke per-autobuyer config (modes, thresholds, per-challenge bitmaps). */
  config?: Config;
  /**
   * Action body. Called when {@link AutobuyerSpec.canTick canTick} returns
   * true. The driver subtracts `interval` from the tick accumulator after
   * dispatch (matches AD's `IntervaledAutobuyerState.tick()` discipline).
   *
   * Autobuyers that delegate to {@link setupPolicyAutoPurchase} /
   * {@link setupSweepAutoPurchase} pass an empty `tick` and rely on the
   * engine helper's own ctx.onTick — they only need the registry for unlock
   * surfacing + UI toggle bridging.
   */
  tick?: (dt: number, ctx: EngineContext) => void;
}

export const AutobuyerMasterToggleKey: InjectionKey<Persistent<boolean>> = Symbol(
  'scaler/autobuyer-master',
) as InjectionKey<Persistent<boolean>>;

export const AutobuyerRegistryKey: InjectionKey<AutobuyerSpec[]> = Symbol(
  'scaler/autobuyer-registry',
) as InjectionKey<AutobuyerSpec[]>;

// Helper that callers (per-tier autobuyer modules + balance/bot.ts) compose
// into engine-helper `enabled` knobs. Equivalent to AD's `canTick` predicate
// minus the interval check (which engine helpers handle internally).
export function autobuyerGate(master: Persistent<boolean>, ab: AutobuyerSpec): () => boolean {
  const unlocked = processGetter(ab.isUnlocked);
  return () => master.value && ab.isActive.value && Boolean(unref(unlocked));
}

/**
 * Master autobuyer registry module. Installs the `autobuyersOn` toggle and an
 * empty registry; per-tier autobuyer modules push their specs in connect().
 *
 * Drives the registry once per tick: filters for unlocked + active + master-
 * on, then dispatches each spec's optional `tick(dt, ctx)`. Specs that
 * delegate to `setupPolicyAutoPurchase` / `setupSweepAutoPurchase` leave
 * `tick` empty — the engine helper has its own ctx.onTick wired through
 * {@link autobuyerGate}.
 */
export function createAutobuyerRegistryModule(): EngineModule {
  return {
    id: 'scaler/autobuyers',
    install(ctx: EngineContext): void {
      const master = persistent<boolean>(false, { name: 'autobuyersOn' });
      const registry: AutobuyerSpec[] = [];

      ctx.provide(AutobuyerMasterToggleKey, master);
      ctx.provide(AutobuyerRegistryKey, registry);

      // Per-spec interval accumulators. Map keyed on the spec object so late-
      // registered specs (autobuyers added during connect()) participate
      // automatically without requiring a separate registration step.
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
          // Drain-while-≥-interval matches engine-side setupPolicyAutoPurchase
          // semantics so coarse-dt probes (dt > interval) see N passes.
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
