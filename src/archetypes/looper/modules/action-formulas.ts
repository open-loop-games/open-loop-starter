/**
 * Pure formulas for action execution — cost, XP, and queue counting.
 *
 * Extracted from action-runner to keep the runner focused on dispatch and
 * completion wiring. These functions read stats and queue state but own no
 * state of their own.
 *
 * Reference: idleLoops/actions.js setAdjustedTicks, addExpFromAction, getNumOnList
 */

import { Decimal, type DecimalSource } from 'open-loop-engine';
import type { ActionDef } from '../data/types';
import { getStatLevel, getTotalBonusXP, addStatXP } from './stats';
import { getActiveLoopQueue, accumulateCurrentItemStatExp } from './action-queue';

/** Evaluate a manaCost field (static number or Decimal-compatible source) */
function evalManaCost(def: ActionDef): DecimalSource {
  return typeof def.manaCost === 'number' ? def.manaCost : def.manaCost;
}

/**
 * Compute adjusted ticks (action cost after stat reduction).
 *
 * `adjustedTicks = ceil(manaCost * sum(weight / (1 + level/costDivisor)) - 0.000001)`
 *
 * The -0.000001 epsilon prevents floating point from rounding up at exact boundaries.
 * costDivisor is 100 (vanilla canonical, from LOOPER_BALANCE).
 *
 * Reference: idleLoops/actions.js setAdjustedTicks
 */
export function computeAdjustedTicks(def: ActionDef): Decimal {
  let costMult = Decimal.dZero;
  for (const [stat, weight] of Object.entries(def.weights)) {
    if (!weight) continue;
    const level = getStatLevel(stat);
    costMult = Decimal.add(costMult, Decimal.div(weight, Decimal.add(1, Decimal.div(level, 100))));
  }
  return Decimal.ceil(Decimal.sub(Decimal.mul(evalManaCost(def), costMult), 0.000001));
}

/**
 * Grant stat XP from an action's tick.
 *
 * Per stat with weight: `xp = weight * expMult * (manaCost / adjustedTicks) * totalBonusXP`
 *
 * Reference: idleLoops/actions.js addExpFromAction
 */
export function addExpFromAction(def: ActionDef, adjustedTicks: DecimalSource): void {
  const manaCost = evalManaCost(def);
  const adjustedExp = Decimal.mul(def.expMult, Decimal.div(manaCost, adjustedTicks));

  const statExpGains: Record<string, number> = {};
  for (const [stat, weight] of Object.entries(def.weights)) {
    if (!weight) continue;
    const bonusXP = getTotalBonusXP(stat);
    const xpToAdd = Decimal.mul(Decimal.mul(weight, adjustedExp), bonusXP);
    addStatXP(stat, xpToAdd);
    statExpGains[stat] = xpToAdd.toNumber();
  }
  accumulateCurrentItemStatExp(statExpGains);
}

/**
 * Count how many of `actionName` exist in the active queue.
 * Used by `canRun`'s `allowed` gate to prevent runaway execution.
 * Reference: idleLoops/actions.js getNumOnCurList
 */
export function getNumOnList(actionName: string): number {
  const items = getActiveLoopQueue().items.value;
  let count = 0;
  for (const item of items) {
    if (item.id === actionName) {
      count += item.metadata.loops;
    }
  }
  return count;
}
