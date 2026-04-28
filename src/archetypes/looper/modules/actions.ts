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
import { LooperTuningRegistryKey, type LooperTunables } from './mana';
import { SkillsKey, grantSkillXp } from './skills';

export interface ActionState {
  /** Sim-seconds of progress accrued on the current attempt. Resets to 0 on completion or loop reset. */
  progress: Persistent<DecimalSource>;
  /** Cumulative completions across loops — drives zone-unlock predicates. NOT in thingsToReset. */
  timesCompleted: Persistent<number>;
  /** Effective mana cost at the current gen-level — `baseCost / (1 + level / divisor)`. */
  effectiveCost: ComputedRef<DecimalSource>;
  /** Tunable-wrapped baseCost for this action. */
  baseCost: Ref<DecimalSource>;
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
   * Advance an action's progress by `dt` sim-seconds. On completion grants
   * skill XP, increments `timesCompleted`, resets `progress` to 0, and
   * returns `true` (queue dispatcher uses this to call `sequencer.complete()`).
   *
   * Mana drains independently in `loop.ts` at 1/sec — each action's
   * `effectiveCost` is in sim-seconds, so a 100-mana action takes 100s of
   * sim-time at level 0. Action progress and mana drain are decoupled:
   * mana is the global "sand running out" while the queue dispatches work.
   */
  tick(id: string, dt: number): boolean;
}

export const ActionsKey: InjectionKey<ActionsModule> = Symbol(
  'looper/actions',
) as InjectionKey<ActionsModule>;

// Actions whose baseCost is wrapped via `tunable()`. Solver bisects against
// the first action of each zone (per OL-729 minimum). Other actions pass
// through unchanged.
const TUNABLE_BASE_COST_IDS = new Set<string>([
  'wander',
  'forest-walk',
  'apprentice-mason',
  'face-undead',
]);

type Ref2<T> = { value: T };
const asRef = <T>(r: Ref2<T>): Ref<T> => r as unknown as Ref<T>;

/**
 * Per-action state with progress accumulator and cumulative completion count.
 * Action category in the engine sense doesn't fit — actions aren't
 * purchasables (no cost-resource state, no scaling-cost shape). The bespoke
 * shape is intentional and called out in OL-729 § 7's anti-rollback notes.
 *
 * State scoping: each action gets its own persistent context
 * (`looper/actions:<id>`) so save layout is stable when defs are added /
 * removed in forks. `progress` is in `thingsToReset` (cleared on loop end);
 * `timesCompleted` is NOT in any reset scope (cumulative across loops).
 */
export function createActionsModule(data: LooperData): EngineModule {
  return {
    id: 'looper/actions',
    dependencies: ['looper/mana', 'looper/skills'],
    install(ctx) {
      const skills = ctx.inject(SkillsKey);
      const tuningRegistry = ctx.inject(LooperTuningRegistryKey);

      const states = new Map<string, ActionState>();
      const defsById = new Map<string, ActionDef>(data.actions.map((d) => [d.id, d]));

      for (const def of data.actions) {
        const baseCost: Ref<DecimalSource> = TUNABLE_BASE_COST_IDS.has(def.id)
          ? (tunable<DecimalSource>(
              tuningRegistry,
              `actions/${def.id}/baseCost` as keyof LooperTunables,
              () => def.baseCost,
            ) as unknown as Ref<DecimalSource>)
          : asRef({ value: def.baseCost });

        const { progress, timesCompleted } = withPersistentContext(
          `looper/actions:${def.id}`,
          () => ({
            progress: persistent<DecimalSource>(0, { name: 'progress' }),
            timesCompleted: persistent<number>(0, { name: 'timesCompleted' }),
          }),
        );

        const effectiveCost = computed<DecimalSource>(() => {
          // First grant goes to the action's headlining skill; pick the same
          // skill the cost-divisor reads (the skill granted the most XP).
          // For multi-skill grants we sum gen levels (idle-loops vanilla
          // does this implicitly — every skill at the action contributes).
          let totalLevel = new Decimal(0);
          for (const grant of def.xpGrants) {
            const state = skills.getState(grant.skillId);
            if (!state) continue;
            totalLevel = totalLevel.add(state.gen.level.value);
          }
          const divisor = data.balance.skillLevelDivisor;
          // cost = baseCost / (1 + sumLevel / divisor)
          const factor = Decimal.add(1, Decimal.div(totalLevel, divisor));
          return Decimal.div(baseCost.value, factor);
        });

        states.set(def.id, {
          progress,
          timesCompleted,
          effectiveCost,
          baseCost,
        });
      }

      function tick(id: string, dt: number): boolean {
        const state = states.get(id);
        if (!state) return false;

        const newProgress = Decimal.add(state.progress.value, dt);
        const cost = state.effectiveCost.value;
        if (Decimal.gte(newProgress, cost)) {
          state.progress.value = 0;
          state.timesCompleted.value += 1;
          const def = defsById.get(id);
          if (def) {
            for (const grant of def.xpGrants) {
              grantSkillXp(skills, grant.skillId, grant.xp, data.balance.instinctXpRatio);
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
