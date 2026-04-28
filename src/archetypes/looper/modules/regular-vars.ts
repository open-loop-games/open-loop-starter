import {
  Decimal,
  persistent,
  withPersistentContext,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from 'open-loop-engine';
import type { LooperData, RegularVarDef } from '../data/types';

/**
 * Per-regularVar state.
 *
 * - `total` — pool size, persistent. Set by progressVar level-up callbacks
 *   summing all contributing `level × perLevel` (multi-axis additive). Stays
 *   across loops as a derived cache; recomputed on rehydration via the
 *   level-up emitter wiring in `progress-vars.ts`.
 * - `checked` / `good` — per-loop counters. Cleared on `onRestart` via
 *   `loop.ts`'s `thingsToReset`. `checked` increments every time
 *   `checkOne(regularVarId)` fires; `good` increments on every Nth check
 *   (per the action's `rewardRatio`). The dispatcher consults `good`'s
 *   pre-increment value to decide whether to fire `rewardEffects`.
 *
 * Vanilla idle-loops carries `goodTemp` (search-toggle UX) and `lootFrom`
 * (per-loop reward accumulator) — both are mod-extension surface in the
 * canonical demo and intentionally absent here. Forks layer them on top.
 */
export interface RegularVarState {
  readonly def: RegularVarDef;
  readonly total: Persistent<DecimalSource>;
  readonly checked: Persistent<number>;
  readonly good: Persistent<number>;
}

/**
 * Outcome of a `checkOne` call. The action dispatcher uses `goodFound` to
 * decide whether to fire `rewardEffects` for this check.
 */
export interface CheckOutcome {
  /** Pool was exhausted (every item already checked) — `checkOne` was a no-op. */
  exhausted: boolean;
  /** This check landed on the every-Nth-check boundary and incremented `good`. */
  goodFound: boolean;
}

export interface LooperRegularVarsModule {
  /** All regularVar entries (registration order). */
  getAll(): RegularVarState[];
  /** Per-regularVar state lookup. */
  getState(regularVarId: string): RegularVarState | undefined;
  /**
   * Set a regularVar's `total`. Called by `progress-vars.ts` level-up
   * callbacks summing `level × perLevel` across all contributors.
   */
  setRegularTotal(regularVarId: string, total: DecimalSource): void;
  /**
   * Increment `checked`; on every `rewardRatio`-th check, increment `good`
   * and return `goodFound: true`. If `checked >= total` (pool exhausted),
   * the call is a no-op and returns `exhausted: true`.
   */
  checkOne(regularVarId: string, rewardRatio: number): CheckOutcome;
}

export const RegularVarsKey: InjectionKey<LooperRegularVarsModule> = Symbol(
  'looper/regular-vars',
) as InjectionKey<LooperRegularVarsModule>;

/**
 * Per-loop pools whose `total` derives from progressVar levels. State lives
 * here; the level-up coupling that drives `total` lives in `progress-vars.ts`
 * (it injects this module's `setRegularTotal` and wires it onto each
 * progressVar's `levelUp` event).
 *
 * Per-regularVar state scoping: `regular:<id>` persistent context so save
 * layout is stable when defs are added / removed in forks.
 */
export function createRegularVarsModule(data: LooperData): EngineModule {
  return {
    id: 'looper/regular-vars',
    install(ctx) {
      const states = new Map<string, RegularVarState>();

      for (const def of data.regularVars) {
        const { total, checked, good } = withPersistentContext(`regular:${def.id}`, () => ({
          total: persistent<DecimalSource>(0, { name: 'total' }),
          // Persistent so save/load mid-loop preserves the player's progress
          // through the pool. Cleared by `loop.ts`'s `thingsToReset` on every
          // `onRestart` (per-loop counter, not retention-tier state).
          checked: persistent<number>(0, { name: 'checked' }),
          good: persistent<number>(0, { name: 'good' }),
        }));
        states.set(def.id, { def, total, checked, good });
      }

      const moduleApi: LooperRegularVarsModule = {
        getAll: () => [...states.values()],
        getState: (id) => states.get(id),
        setRegularTotal(regularVarId, total) {
          const state = states.get(regularVarId);
          if (!state) return;
          state.total.value = total;
        },
        checkOne(regularVarId, rewardRatio) {
          const state = states.get(regularVarId);
          if (!state) return { exhausted: true, goodFound: false };
          if (Decimal.gte(state.checked.value, state.total.value)) {
            return { exhausted: true, goodFound: false };
          }
          state.checked.value += 1;
          if (state.checked.value % rewardRatio === 0) {
            state.good.value += 1;
            return { exhausted: false, goodFound: true };
          }
          return { exhausted: false, goodFound: false };
        },
      };

      ctx.provide(RegularVarsKey, moduleApi);
    },
  };
}

/** Helper for cross-module retention-key collection — `total` refs (kept across loops). */
export function getRegularVarTotalRefs(
  module: LooperRegularVarsModule,
): Persistent<DecimalSource>[] {
  return module.getAll().map((s) => s.total);
}

/** Helper for cross-module reset-scope collection — `checked` + `good` refs (cleared per loop). */
export function getRegularVarPerLoopRefs(module: LooperRegularVarsModule): Persistent<number>[] {
  const refs: Persistent<number>[] = [];
  for (const s of module.getAll()) {
    refs.push(s.checked);
    refs.push(s.good);
  }
  return refs;
}
