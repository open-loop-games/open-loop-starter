import { computed } from 'vue';
import type { ComputedRef } from 'vue';
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
import type { ActionDef, CompletionEffect, LooperData, RewardEffect } from '../data/types';
import { LooperTuningRegistryKey, ManaModuleKey } from './mana';
import { CapabilitiesKey, grantCapabilityXp } from './capabilities';
import { GoldKey, GoldModuleKey } from './gold';
import { ProgressVarsKey } from './progress-vars';
import { RegularVarsKey } from './regular-vars';

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
  /** manaCost reader (canonical, non-perturbable). */
  manaCost: ComputedRef<DecimalSource>;
  /** rewardRatio reader. Set on regular-type actions only. */
  rewardRatio?: ComputedRef<DecimalSource>;
  /** exchangeMult reader. Set on basic-type actions that declare the field. */
  exchangeMult?: ComputedRef<DecimalSource>;
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
   * capability XP per the canonical formula, applies the type-discriminated
   * completion path (progress: addXp to progressVar; regular: checkOne pool +
   * conditional rewardEffects; basic: completionEffects batch with pre-batch
   * gold snapshot for `exchange-gold-to-mana` effects), increments
   * `timesCompleted`, resets `progress` to 0, and returns `true` (queue
   * dispatcher uses this to call `sequencer.complete()`). Returns `false`
   * while still in progress.
   */
  tick(id: string, ticks: number): boolean;
}

export const ActionsKey: InjectionKey<ActionsModule> = Symbol(
  'looper/actions',
) as InjectionKey<ActionsModule>;

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
    dependencies: [
      'looper/mana',
      'looper/gold',
      'looper/capabilities',
      'looper/progress-vars',
      'looper/regular-vars',
    ],
    install(ctx) {
      const capabilities = ctx.inject(CapabilitiesKey);
      const manaModule = ctx.inject(ManaModuleKey);
      const gold = ctx.inject(GoldKey);
      const goldModule = ctx.inject(GoldModuleKey);
      const progressVars = ctx.inject(ProgressVarsKey);
      const regularVars = ctx.inject(RegularVarsKey);
      const tuningRegistry = ctx.inject(LooperTuningRegistryKey);

      // Cost-reduction divisor + Talent accrual ratio wrapped once so
      // pushScope retunes cost path / XP split without rebooting.
      const costDivisor = tunable<DecimalSource>(
        tuningRegistry,
        'balance/costDivisor',
        () => data.balance.costDivisor,
      );
      const talentAccrualRatio = tunable<DecimalSource>(
        tuningRegistry,
        'balance/talentAccrualRatio',
        () => data.balance.talentAccrualRatio,
      );

      const states = new Map<string, ActionState>();
      const defsById = new Map<string, ActionDef>(data.actions.map((d) => [d.id, d]));

      for (const def of data.actions) {
        const manaCost: ComputedRef<DecimalSource> = computed(() => def.manaCost);

        let rewardRatio: ComputedRef<DecimalSource> | undefined;
        if (def.type === 'regular') {
          rewardRatio = computed(() => def.rewardRatio);
        }

        let exchangeMult: ComputedRef<DecimalSource> | undefined;
        if (def.type === 'basic' && def.exchangeMult !== undefined) {
          const mult = def.exchangeMult;
          exchangeMult = computed(() => mult);
        }

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
          rewardRatio,
          exchangeMult,
        });
      }

      function applyRewardEffect(effect: RewardEffect): void {
        if (effect.kind === 'add-mana') {
          manaModule.addMana(effect.amount);
        } else if (effect.kind === 'add-gold') {
          goldModule.addGold(effect.amount);
        }
      }

      function applyCompletionEffects(actionId: string, effects: CompletionEffect[]): void {
        // Snapshot pre-batch gold once so `exchange-gold-to-mana` captures the
        // gold balance from before any spend-gold in the same batch ran. The
        // Buy Mana canonical relies on this — `[spend-gold:'all', exchange-gold-to-mana]`
        // resolves `manaAdded = preBatchGold × exchangeMult`.
        const preBatchGold = gold.value;
        const state = states.get(actionId);
        for (const effect of effects) {
          if (effect.kind === 'add-mana') {
            manaModule.addMana(effect.amount);
          } else if (effect.kind === 'add-gold') {
            goldModule.addGold(effect.amount);
          } else if (effect.kind === 'spend-gold') {
            goldModule.spendGold(effect.amount);
          } else if (effect.kind === 'exchange-gold-to-mana') {
            const mult = state?.exchangeMult?.value ?? 0;
            manaModule.addMana(Decimal.mul(preBatchGold, mult));
          }
        }
      }

      function tick(id: string, ticks: number): boolean {
        const state = states.get(id);
        if (!state) return false;

        const newProgress = Decimal.add(state.progress.value, ticks);
        const cost = state.adjustedTicks.value;
        if (Decimal.lt(newProgress, cost)) {
          state.progress.value = newProgress;
          return false;
        }

        // Completion path: capability XP for all types, then type-discriminated
        // secondary effect.
        state.progress.value = 0;
        state.timesCompleted.value += 1;
        const def = defsById.get(id);
        if (!def) return true;

        // Canonical XP grant (idle-loops-ng action-formulas.ts:48-61):
        //   adjustedExp = expMult × (manaCost / adjustedTicks)
        //   for each (cap, weight) in weights:
        //     xpGain = weight × adjustedExp × talentMult
        //     level.addXp(xpGain); talent.addXp(xpGain × talentAccrualRatio)
        const adjustedExp = Decimal.mul(def.expMult, Decimal.div(state.manaCost.value, cost));
        for (const [capId, weight] of Object.entries(def.weights)) {
          const capState = capabilities.getState(capId);
          if (!capState) continue;
          const xpGain = Decimal.mul(Decimal.mul(weight, adjustedExp), capState.talentMult.value);
          grantCapabilityXp(capabilities, capId, xpGain, talentAccrualRatio.value);
        }

        // Type-discriminated secondary effect.
        if (def.type === 'progress') {
          const pvDef = progressVars.getDef(def.progressVarId);
          if (pvDef) {
            // ProgressVar XP = action.progressAmount × pvDef.expMult.
            // Vanilla idle-loops shape (idle-loops-ng/src/modules/action-runner.ts:241):
            // explicit per-action progressAmount, decoupled from manaCost so
            // forks can retune cost without affecting progression rate.
            const xpGrant = Decimal.mul(def.progressAmount, pvDef.expMult);
            progressVars.addXp(def.progressVarId, xpGrant);
          }
        } else if (def.type === 'regular') {
          const ratio = Number(state.rewardRatio?.value ?? def.rewardRatio);
          const outcome = regularVars.checkOne(def.regularVarId, ratio);
          if (outcome.goodFound) {
            for (const reward of def.rewardEffects) {
              applyRewardEffect(reward);
            }
          }
        } else if (def.type === 'basic') {
          if (def.completionEffects && def.completionEffects.length > 0) {
            applyCompletionEffects(def.id, def.completionEffects);
          }
        }

        return true;
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
