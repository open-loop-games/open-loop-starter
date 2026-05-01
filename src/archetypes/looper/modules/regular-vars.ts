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
 * Per-regularVar state — the four-field manapot model from vanilla idle-loops
 * (`town.js:finishRegular`). Investment-then-payoff: empty checks this loop
 * become known-goods that cash in cheaply on later loops.
 *
 * - `total` — pool size. Persistent across loops; set by progressVar level-up
 *   callbacks summing contributing `level × perLevel` (multi-axis additive).
 *   Stays across loops as a derived cache; recomputed on rehydration via the
 *   level-up emitter wiring in `progress-vars.ts`.
 * - `checked` — lifetime count of items checked. Persistent across loops;
 *   never reset except by the pool-shrink safety branch.
 * - `good` — lifetime count of known-goods discovered (`floor(checked /
 *   rewardRatio)` invariant). Persistent across loops; accumulates.
 * - `goodTemp` — known-goods remaining to consume this loop. Reset to `good`
 *   on every loop boundary (per `loop.ts:onRestart`); decrements as
 *   `checkOne` consumes known-goods.
 *
 * Dispatch (in `checkOne`):
 *   - if `unchecked > 0` and `goodTemp <= 0` → check a new item (every Nth
 *     becomes a known-good, fires reward).
 *   - else if `goodTemp > 0` → consume a known-good (fires reward, no new
 *     exploration).
 *   - else → exhausted (no-op).
 *
 * `searchToggle` is hardcoded `true` (always prefer known-goods first).
 * Vanilla exposes it as a player UX toggle; v1 of this module defers that
 * surface — forks add it as a per-action `RegularVarDef` field if needed.
 *
 * `lootFrom` (vanilla's per-loop reward accumulator) is intentionally
 * omitted: looper's action dispatcher fires `rewardEffects` directly on
 * `goodFound: true` (both branches return it), so a separate accumulator
 * adds no observable behavior.
 */
export interface RegularVarState {
  readonly def: RegularVarDef;
  readonly total: Persistent<DecimalSource>;
  readonly checked: Persistent<number>;
  readonly good: Persistent<number>;
  readonly goodTemp: Persistent<number>;
  /**
   * Per-pool dispatch toggle. When `true` (default, vanilla shape), checkOne
   * consumes known-goods (`goodTemp`) before exploring unchecked items —
   * cheap reward firings on already-discovered goods. When `false`, the
   * action skips `goodTemp` consumption entirely and goes straight to
   * exploring new items — the player commits mana to find new goods.
   *
   * Persistent so the choice survives saves; per-pool so the player can
   * tune Beginnersville's Pots (cheap goods → consume) and Forest Path's
   * Wild Mana (manapot harvest → explore for fresh goods) independently.
   */
  readonly valuablesFirst: Persistent<boolean>;
}

/**
 * Outcome of a `checkOne` call. The action dispatcher uses `goodFound` to
 * decide whether to fire `rewardEffects` for this check. `goodFound: true`
 * fires for both branches: a fresh-discovery (every Nth check, increments
 * `good`) AND a known-good consumption (decrements `goodTemp`).
 */
export interface CheckOutcome {
  /** Pool was exhausted (no unchecked items AND no known-goods left) — `checkOne` was a no-op. */
  exhausted: boolean;
  /** This check fires `rewardEffects`. True for fresh-discovery and known-good-consume branches. */
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
   * Dispatch one check against the regularVar pool. Branches:
   *
   * 1. Pool-shrink safety — if `total < checked` (rebalance dropped pool
   *    below lifetime checked), recompute `checked = total`, `good =
   *    floor(total / rewardRatio)`, `goodTemp = good` to restore the
   *    invariant. Vanilla `town.js:finishRegular` carries the same branch.
   * 2. If `unchecked > 0` AND `goodTemp <= 0` — explore an unchecked item.
   *    Increments `checked`; on every Nth check, increments `good` and
   *    returns `goodFound: true`.
   * 3. Else if `goodTemp > 0` — consume a known-good. Decrements
   *    `goodTemp` and returns `goodFound: true` (fires reward without new
   *    exploration).
   * 4. Else — pool exhausted (`unchecked = 0` and `goodTemp = 0`). No-op.
   */
  checkOne(regularVarId: string, rewardRatio: number): CheckOutcome;
}

export const RegularVarsKey: InjectionKey<LooperRegularVarsModule> = Symbol(
  'looper/regular-vars',
) as InjectionKey<LooperRegularVarsModule>;

/**
 * Pools whose `total` derives from progressVar levels. State lives here;
 * the level-up coupling that drives `total` lives in `progress-vars.ts`
 * (it injects this module's `setRegularTotal` and wires it onto each
 * progressVar's `levelUp` event).
 *
 * `checked` and `good` accumulate across loops (manapot model); `goodTemp`
 * resets to `good` at every loop boundary in `loop.ts:onRestart`. See
 * `RegularVarState` doc-comment for the four-field model.
 *
 * Per-regularVar state scoping: `regular:<id>` persistent context so save
 * layout is stable when defs are added / removed in forks. New `goodTemp`
 * field defaults to 0 on save migration; `onRestart` reseeds it from
 * `good` on the first loop boundary post-load.
 */
export function createRegularVarsModule(data: LooperData): EngineModule {
  return {
    id: 'looper/regular-vars',
    install(ctx) {
      const states = new Map<string, RegularVarState>();

      for (const def of data.regularVars) {
        const { total, checked, good, goodTemp, valuablesFirst } = withPersistentContext(
          `regular:${def.id}`,
          () => ({
            total: persistent<DecimalSource>(0, { name: 'total' }),
            checked: persistent<number>(0, { name: 'checked' }),
            good: persistent<number>(0, { name: 'good' }),
            goodTemp: persistent<number>(0, { name: 'goodTemp' }),
            valuablesFirst: persistent<boolean>(true, { name: 'valuablesFirst' }),
          }),
        );
        states.set(def.id, { def, total, checked, good, goodTemp, valuablesFirst });
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

          // Pool-shrink safety: progressVar level-ups only grow `total`,
          // but content rebalance (def edits at boot) can drop it below
          // lifetime `checked`. Restore the invariant from the new total.
          if (Decimal.lt(state.total.value, state.checked.value)) {
            const totalNum = Number(new Decimal(state.total.value).toNumber());
            state.checked.value = totalNum;
            state.good.value = Math.floor(totalNum / rewardRatio);
            state.goodTemp.value = state.good.value;
          }

          const hasUnchecked = Decimal.gt(state.total.value, state.checked.value);
          const hasGoodTemp = state.goodTemp.value > 0;

          // Dispatch order depends on the per-pool `valuablesFirst` toggle.
          // valuablesFirst=true (default) — consume goodTemp first, then
          // explore unchecked. Cheap-reward harvest mode.
          // valuablesFirst=false — explore unchecked first, then fall back
          // to goodTemp. New-discovery mode (mana-positive when rewardRatio
          // converges; useful early-loop when goodTemp is empty anyway).
          if (state.valuablesFirst.value) {
            if (hasGoodTemp) {
              state.goodTemp.value -= 1;
              return { exhausted: false, goodFound: true };
            }
            if (hasUnchecked) {
              state.checked.value += 1;
              if (state.checked.value % rewardRatio === 0) {
                state.good.value += 1;
                return { exhausted: false, goodFound: true };
              }
              return { exhausted: false, goodFound: false };
            }
            return { exhausted: true, goodFound: false };
          }

          if (hasUnchecked) {
            state.checked.value += 1;
            if (state.checked.value % rewardRatio === 0) {
              state.good.value += 1;
              return { exhausted: false, goodFound: true };
            }
            return { exhausted: false, goodFound: false };
          }
          if (hasGoodTemp) {
            state.goodTemp.value -= 1;
            return { exhausted: false, goodFound: true };
          }
          return { exhausted: true, goodFound: false };
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

/**
 * Helper for cross-module retention-key collection — lifetime `checked` +
 * `good` refs. Both accumulate across loops (manapot model). `goodTemp` is
 * NOT included: it's reseeded imperatively in `loop.ts:onRestart` from
 * `good`'s post-restoration value.
 */
export function getRegularVarLifetimeRefs(module: LooperRegularVarsModule): Persistent<number>[] {
  const refs: Persistent<number>[] = [];
  for (const s of module.getAll()) {
    refs.push(s.checked);
    refs.push(s.good);
  }
  return refs;
}
