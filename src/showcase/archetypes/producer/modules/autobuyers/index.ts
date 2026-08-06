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
//     AutobuyerState class hierarchy (AutobuyerState → IntervaledAutobuyerState
//     → UpgradeableAutobuyerState).
//   AntimatterDimensionsSourceCode/src/core/autobuyers/autobuyers.js:122-137 —
//     master tick loop (single sequential canTick → tick).
//
// AD's hierarchy carries the buy loop because AD has no auto-purchase
// primitive — interval accumulation, the affordability scan, and the purchase
// all live on the autobuyer object. Here the engine owns that half:
// `setupSweepAutoPurchase` / `setupPolicyAutoPurchase` throttle, scan, and buy.
// So the registry keeps only what the engine can't know — which autobuyers
// exist, what to call them, when they unlock, and whether the player switched
// them on — and installs no tick handler of its own. A spec that looks like it
// needs a bespoke tick is describing a helper option that doesn't exist yet;
// grow the helper rather than running a second loop beside it.
//
// Mirror of `src/showcase/archetypes/ambient/modules/autobuyers/index.ts`.

/**
 * One player-facing autobuyer: its identity, its unlock, and its toggle.
 *
 * Behavior is deliberately absent. A spec's own module pushes it here for UI
 * surfacing, then hands {@link autobuyerGate} to an engine auto-purchase
 * helper — the helper is where throttling and the buy decision live.
 */
export interface AutobuyerSpec {
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
 *
 * Registers no tick handler. Every autobuyer's behavior sits in the engine
 * helper its own module installed, so the master toggle reaches the buy loop
 * through {@link autobuyerGate} rather than through a loop here — one owner
 * per behavior, and the throttle state lands in the engine's persistent
 * accumulator instead of a registry-side map the save never sees.
 */
export function createAutobuyerRegistryModule(): EngineModule {
  return {
    id: 'producer/autobuyers',
    install(ctx: EngineContext): void {
      const master = persistent<boolean>(false, { name: 'autobuyersOn' });
      const registry: AutobuyerSpec[] = [];

      ctx.provide(AutobuyerMasterToggleKey, master);
      ctx.provide(AutobuyerRegistryKey, registry);
    },
  };
}
