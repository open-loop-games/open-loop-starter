import { unref } from 'vue';
import {
  persistent,
  processGetter,
  type AutomationTiers,
  type Computable,
  type EngineContext,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import type { AmbientAutomationTier } from '../automation';

// vanilla canonical (architecture):
//   AntimatterDimensionsSourceCode/src/core/autobuyers/autobuyer.js — abstract
//     AutobuyerState class hierarchy.
//   AntimatterDimensionsSourceCode/src/core/autobuyers/autobuyers.js:122-137 —
//     master tick loop.
//
// AD's hierarchy carries the buy loop because AD has no auto-purchase
// primitive. Here the engine owns that half — `setupSweepAutoPurchase` /
// `setupPolicyAutoPurchase` throttle, scan, and buy — so the registry declares
// content and gates it, and installs no tick handler of its own.
//
// This is the cross-archetype autobuyer-as-content shape. Visibility unlocks
// (`modules/unlocks.ts`) remain non-registered: their `setupSweepAutoPurchase`
// install fires unconditionally on threshold cross, since the Ambient contract
// forbids player-pausable content reveals.

/**
 * One player-facing autobuyer: its identity, its unlock, and its toggle.
 * Behavior lives in the engine helper the spec's module installs, gated by
 * {@link autobuyerGate}.
 */
export interface AutobuyerSpec {
  /** Stable identifier; persistent state lives under this name. */
  id: string;
  /** Group affordance for UI accessors. Free-form. */
  groupId?: string;
  /** Human-readable label for the toggle row. */
  displayName: string;
  /**
   * Automation tier that must be reached before this autobuyer is available.
   * The progression gate — player-invisible until the tier unlocks.
   */
  tier: AmbientAutomationTier;
  /**
   * Extra unlock predicate, on top of {@link AutobuyerSpec.tier}. For content
   * conditions the ladder does not express; most specs pass `() => true` and
   * let the tier carry the gate.
   */
  isUnlocked: Computable<boolean>;
  /** Player toggle. */
  isActive: Persistent<boolean>;
}

export const AutobuyerMasterToggleKey: InjectionKey<Persistent<boolean>> = Symbol(
  'ambient/autobuyer-master',
) as InjectionKey<Persistent<boolean>>;

export const AutobuyerRegistryKey: InjectionKey<AutobuyerSpec[]> = Symbol(
  'ambient/autobuyer-registry',
) as InjectionKey<AutobuyerSpec[]>;

/**
 * The one gate every autobuyer buy-loop runs behind: tier reached, master on,
 * this spec toggled on, and any extra content condition met. Order is
 * cheapest-first; `hasReached` is a reactive order comparison.
 */
export function autobuyerGate(
  tiers: AutomationTiers,
  master: Persistent<boolean>,
  ab: AutobuyerSpec,
): () => boolean {
  const unlocked = processGetter(ab.isUnlocked);
  return () =>
    tiers.hasReached(ab.tier) && master.value && ab.isActive.value && Boolean(unref(unlocked));
}

/**
 * Master autobuyer registry module. Per-category autobuyer modules push
 * their specs in connect().
 *
 * Registers no tick handler — the master toggle reaches each buy loop through
 * {@link autobuyerGate}, not through a loop here.
 */
export function createAutobuyerRegistryModule(): EngineModule {
  return {
    id: 'ambient/autobuyers',
    install(ctx: EngineContext): void {
      const master = persistent<boolean>(false, { name: 'autobuyersOn' });
      const registry: AutobuyerSpec[] = [];

      ctx.provide(AutobuyerMasterToggleKey, master);
      ctx.provide(AutobuyerRegistryKey, registry);
    },
  };
}
