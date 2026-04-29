import { type ComputedRef, computed } from 'vue';
import {
  Decimal,
  createOverrideRegistry,
  createResource,
  createTimeSystem,
  persistent,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type OverrideRegistry,
  type Persistent,
  type Resource,
  type TimeSystem,
} from 'open-loop-engine';
import type { LooperData } from '../data/types';

/**
 * Push-scope key list. Push-targets:
 *   - balance/initialMana          — pool size at loop start (ticks)
 *   - balance/costDivisor          — cost-reduction divisor on capability Level
 *   - balance/talentAccrualRatio   — fraction of Level XP accruing to Talent
 *   - actions/<id>/manaCost        — per-action cost knobs (one per zone wired
 *                                     by `actions.ts` to satisfy the
 *                                     at-least-one-per-zone solver minimum)
 *   - actions/<id>/rewardRatio     — per-action manapot-harvest cadence (every
 *                                     Nth check fires rewardEffects). Wired
 *                                     for the manapot-driver action only.
 *   - actions/<id>/exchangeMult    — basic-action gold↔mana multiplier read
 *                                     by `exchange-gold-to-mana` completion
 *                                     effects. Wired for Trade.
 *   - progressVars/<pvId>/scales/<rvId>/perLevel
 *                                  — additive contribution from a progressVar
 *                                     level to a regularVar pool size. Wired
 *                                     for the manapot-driver pair only.
 */
export type LooperTunableKey =
  | 'balance/initialMana'
  | 'balance/costDivisor'
  | 'balance/talentAccrualRatio'
  | `actions/${string}/manaCost`
  | `actions/${string}/rewardRatio`
  | `actions/${string}/exchangeMult`
  | `progressVars/${string}/scales/${string}/perLevel`;

export type LooperTunables = Record<string, () => DecimalSource>;

// Injection keys consumed by sibling modules + composables.

/** Live mana value (decreases as the loop ticks; can rise via mana-grant actions). */
export const ManaKey: InjectionKey<Resource<DecimalSource>> = Symbol('looper/mana') as InjectionKey<
  Resource<DecimalSource>
>;

/** Pool size at loop start (ticks). Reset target on every loop restart. */
export const InitialManaKey: InjectionKey<ComputedRef<DecimalSource>> = Symbol(
  'looper/initial-mana',
) as InjectionKey<ComputedRef<DecimalSource>>;

/** Sum of mana-grants this loop. Resets to 0 on loop restart; persists mid-loop. */
export const ManaAddedKey: InjectionKey<Persistent<DecimalSource>> = Symbol(
  'looper/mana-added',
) as InjectionKey<Persistent<DecimalSource>>;

/**
 * `initialMana + manaAdded` — the *total* budget visible to the player this
 * loop. Drives the gauge fill denominator and the queue-budget readout.
 */
export const TotalManaBudgetKey: InjectionKey<ComputedRef<DecimalSource>> = Symbol(
  'looper/total-mana-budget',
) as InjectionKey<ComputedRef<DecimalSource>>;

/**
 * Imperative mana operations. Drain runs from `loop.ts` at `tickRate × dt`
 * per engine tick; addMana from action completions in `actions.ts`; resetMana
 * from the loop restart sequence.
 */
export interface LooperManaModule {
  /** Subtract from mana, clamped at 0. */
  drainMana(amount: DecimalSource): void;
  /**
   * Extend the current loop's pool. Tracked separately as `manaAdded` so the
   * total budget readout stays accurate; mana-positive actions extend, but
   * the pool always resets to `initialMana` on loop restart (mana does NOT
   * compound across loops — cross-loop progress is on capabilities only).
   */
  addMana(amount: DecimalSource): void;
  /** Restore mana to `initialMana`, manaAdded → 0. Called from loop onRestart. */
  resetMana(): void;
}

export const ManaModuleKey: InjectionKey<LooperManaModule> = Symbol(
  'looper/mana-module',
) as InjectionKey<LooperManaModule>;

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
 * Mana = the loop time-budget resource, denominated in ticks. The drain
 * (`round(tickRate × dt)` per engine tick) lives in `loop.ts` where it can
 * be gated on `loop.running`. This module owns the resource, the pool-size
 * computed, the mana-added counter, the imperative ops surface, and the
 * tuning registry shared across all looper modules.
 *
 * Mana resets to `initialMana` on loop restart via `loop.ts`'s `onRestart`
 * hook (calls `manaModule.resetMana()`); NOT via `thingsToReset`, so we can
 * distinguish "loop ended ⇒ refill" from "save reset ⇒ zero out".
 */
export function createManaModule(data: LooperData): EngineModule {
  return {
    id: 'looper/mana',
    install(ctx) {
      const tuningRegistry = createOverrideRegistry<LooperTunables>('looper-tuning');

      const initialManaTunable = tunable<DecimalSource>(
        tuningRegistry,
        'balance/initialMana',
        () => data.balance.initialMana,
      );
      const initialMana = computed<DecimalSource>(() => initialManaTunable.value);

      const mana = createResource<DecimalSource>(Number(initialMana.value), {
        displayName: 'Mana',
        precision: 0,
        id: 'mana',
      });
      const manaAdded = persistent<DecimalSource>(0, { name: 'manaAdded' });

      const totalBudget = computed<DecimalSource>(() =>
        Decimal.add(initialMana.value, manaAdded.value),
      );

      const moduleApi: LooperManaModule = {
        drainMana(amount) {
          mana.value = Decimal.max(Decimal.sub(mana.value, amount), 0);
        },
        addMana(amount) {
          mana.value = Decimal.add(mana.value, amount);
          manaAdded.value = Decimal.add(manaAdded.value, amount);
        },
        resetMana() {
          mana.value = initialMana.value;
          manaAdded.value = 0;
        },
      };

      const time = createTimeSystem();
      ctx.onTick((dt: number) => time.tick(dt));

      ctx.provide(ManaKey, mana);
      ctx.provide(InitialManaKey, initialMana);
      ctx.provide(ManaAddedKey, manaAdded);
      ctx.provide(TotalManaBudgetKey, totalBudget);
      ctx.provide(ManaModuleKey, moduleApi);
      ctx.provide(TimeSystemKey, time);
      ctx.provide(LooperDataKey, data);
      ctx.provide(LooperTuningRegistryKey, tuningRegistry);
    },
  };
}
