import { computed, type ComputedRef, type Ref } from 'vue';
import {
  Decimal,
  persistent,
  tunable,
  withPersistentContext,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from 'open-loop-engine';
import type { ActionDef, LooperData } from '../data/types';
import { LooperTuningRegistryKey, ManaModuleKey, type LooperTunables } from './mana';
import { CapabilitiesKey, grantCapabilityXp } from './capabilities';

export interface ActionState {
  /** Ticks of progress accrued on the current attempt. Resets to 0 on completion or loop reset. */
  progress: Persistent<DecimalSource>;
  /** Cumulative completions across loops — drives prereq predicates. NOT in thingsToReset. */
  timesCompleted: Persistent<number>;
  /**
   * Adjusted ticks needed at the current Level — `ceil(manaCost × Σ weight / (1 + level / costDivisor))`.
   * Drives queue cost-readout, gauge fill rates, and the per-tick completion check.
   */
  adjustedTicks: ComputedRef<DecimalSource>;
  /** Tunable-wrapped manaCost for this action. */
  manaCost: Ref<DecimalSource>;
}

export interface ActionsModule {
  /** All action defs (registration order). */
  getAll(): ActionDef[];
  /** Lookup by id. */
  getDef(id: string): ActionDef | undefined;
  /** Per-action state. */
  getState(id: string): ActionState | undefined;
  /** Cumulative completions across loops (zero if action unknown). */
  getTimesCompleted(id: string): number;
  /**
   * Advance an action's progress by `ticks` ticks. On completion grants
   * capability XP per the canonical formula, applies `manaGrant` (extends
   * the loop pool, NOT clamped), increments `timesCompleted`, resets
   * `progress` to 0, and returns `true` (queue dispatcher uses this to call
   * `sequencer.complete()`). Returns `false` while still in progress.
   */
  tick(id: string, ticks: number): boolean;
}

export const ActionsKey: InjectionKey<ActionsModule> = Symbol(
  'looper/actions',
) as InjectionKey<ActionsModule>;

// Per-zone solver representative: one action per zone whose `manaCost` is
// wrapped via `tunable()`. Satisfies the at-least-one-per-zone bisect minimum
// while keeping the tunable surface small. Other actions pass through unwrapped.
const TUNABLE_MANA_COST_IDS = new Set<string>(['stretch', 'trek', 'apprentice', 'confront']);

type Ref2<T> = { value: T };
const asRef = <T>(r: Ref2<T>): Ref<T> => r as unknown as Ref<T>;

/**
 * Per-action state with progress accumulator and cumulative completion count.
 * Action category in the engine sense doesn't fit — actions aren't
 * purchasables (no cost-resource state, no scaling-cost shape). The bespoke
 * shape is intentional.
 *
 * State scoping: each action gets its own persistent context
 * (`looper/actions:<id>`) so save layout is stable when defs are added /
 * removed in forks. `progress` is in `thingsToReset` (cleared on loop end);
 * `timesCompleted` is NOT in any reset scope (cumulative across loops, drives
 * action-completion-count prereqs).
 */
export function createActionsModule(data: LooperData): EngineModule {
  return {
    id: 'looper/actions',
    dependencies: ['looper/mana', 'looper/capabilities'],
    install(ctx) {
      const capabilities = ctx.inject(CapabilitiesKey);
      const manaModule = ctx.inject(ManaModuleKey);
      const tuningRegistry = ctx.inject(LooperTuningRegistryKey);

      // Cost-reduction divisor + Talent accrual ratio wrapped once so
      // pushScope retunes cost path / XP split without rebooting.
      const costDivisor = asRef(
        tunable<DecimalSource>(
          tuningRegistry,
          'balance/costDivisor',
          () => data.balance.costDivisor,
        ),
      );
      const talentAccrualRatio = asRef(
        tunable<DecimalSource>(
          tuningRegistry,
          'balance/talentAccrualRatio',
          () => data.balance.talentAccrualRatio,
        ),
      );

      const states = new Map<string, ActionState>();
      const defsById = new Map<string, ActionDef>(data.actions.map((d) => [d.id, d]));

      for (const def of data.actions) {
        const manaCost: Ref<DecimalSource> = TUNABLE_MANA_COST_IDS.has(def.id)
          ? (tunable<DecimalSource>(
              tuningRegistry,
              `actions/${def.id}/manaCost` as keyof LooperTunables,
              () => def.manaCost,
            ) as unknown as Ref<DecimalSource>)
          : asRef({ value: def.manaCost });

        const { progress, timesCompleted } = withPersistentContext(
          `looper/actions:${def.id}`,
          () => ({
            progress: persistent<DecimalSource>(0, { name: 'progress' }),
            timesCompleted: persistent<number>(0, { name: 'timesCompleted' }),
          }),
        );

        // Canonical adjusted-ticks formula (idle-loops-ng action-formulas.ts:31-39):
        //   costMult = Σ(weights) weight / (1 + level / costDivisor)
        //   adjustedTicks = ceil(manaCost × costMult - epsilon)
        const adjustedTicks = computed<DecimalSource>(() => {
          let costMult = new Decimal(0);
          for (const [capId, weight] of Object.entries(def.weights)) {
            const state = capabilities.getState(capId);
            if (!state) continue;
            const level = state.level.level.value;
            const factor = Decimal.add(1, Decimal.div(level, costDivisor.value));
            costMult = costMult.add(Decimal.div(weight, factor));
          }
          // The -epsilon prevents floating-point boundary rounding from
          // bumping a clean integer up by 1 (vanilla idleLoops's pattern).
          return Decimal.ceil(Decimal.sub(Decimal.mul(manaCost.value, costMult), 0.000001));
        });

        states.set(def.id, {
          progress,
          timesCompleted,
          adjustedTicks,
          manaCost,
        });
      }

      function tick(id: string, ticks: number): boolean {
        const state = states.get(id);
        if (!state) return false;

        const newProgress = Decimal.add(state.progress.value, ticks);
        const cost = state.adjustedTicks.value;
        if (Decimal.gte(newProgress, cost)) {
          state.progress.value = 0;
          state.timesCompleted.value += 1;
          const def = defsById.get(id);
          if (def) {
            // Canonical XP grant (idle-loops-ng action-formulas.ts:48-61):
            //   adjustedExp = expMult × (manaCost / adjustedTicks)
            //   for each (cap, weight) in weights:
            //     xpGain = weight × adjustedExp × talentMult
            //     level.addXp(xpGain); talent.addXp(xpGain × talentAccrualRatio)
            const adjustedExp = Decimal.mul(def.expMult, Decimal.div(state.manaCost.value, cost));
            for (const [capId, weight] of Object.entries(def.weights)) {
              const capState = capabilities.getState(capId);
              if (!capState) continue;
              const xpGain = Decimal.mul(
                Decimal.mul(weight, adjustedExp),
                capState.talentMult.value,
              );
              grantCapabilityXp(capabilities, capId, xpGain, talentAccrualRatio.value);
            }
            if (def.manaGrant !== undefined) {
              manaModule.addMana(def.manaGrant);
            }
          }
          return true;
        }
        state.progress.value = newProgress;
        return false;
      }

      const moduleApi: ActionsModule = {
        getAll: () => data.actions,
        getDef: (id) => defsById.get(id),
        getState: (id) => states.get(id),
        getTimesCompleted: (id) => states.get(id)?.timesCompleted.value ?? 0,
        tick,
      };

      ctx.provide(ActionsKey, moduleApi);
    },
  };
}

/** Helper for cross-module retention-key collection — `progress` refs to clear on loop end. */
export function getActionProgressRefs(actions: ActionsModule): Persistent<DecimalSource>[] {
  const refs: Persistent<DecimalSource>[] = [];
  for (const def of actions.getAll()) {
    const state = actions.getState(def.id);
    if (state) refs.push(state.progress);
  }
  return refs;
}

/** Helper for cross-module retention-key collection — `timesCompleted` refs (kept across loops). */
export function getActionTimesCompletedRefs(actions: ActionsModule): Persistent<number>[] {
  const refs: Persistent<number>[] = [];
  for (const def of actions.getAll()) {
    const state = actions.getState(def.id);
    if (state) refs.push(state.timesCompleted);
  }
  return refs;
}
