/**
 * Pure formulas for action execution — cost, XP, and queue counting.
 *
 * Extracted from action-runner to keep the runner focused on dispatch and
 * completion wiring. These functions read stats and queue state but own no
 * state of their own.
 *
 * Reference: idleLoops/actions.js setAdjustedTicks, addExpFromAction, getNumOnList
 */

import { Decimal, type DecimalSource } from '@open-loop/engine';
import type { ActionDef } from '../data/types';
import { getStatLevel, getTalentMult, addStatXP } from './stats';
import { getActiveLoopQueue, accumulateCurrentItemStatExp } from './action-queue';

/** Evaluate a manaCost field (static number or Decimal-compatible source) */
function evalManaCost(def: ActionDef): DecimalSource {
  return typeof def.manaCost === 'number' ? def.manaCost : def.manaCost;
}

/** Cost-reduction divisor on stat Level. Vanilla canonical 100 (`1 + level/100`).
 *  Bound by action-runner's install through the looper tuning registry so
 *  balance scopes can perturb the cost-curve shape. */
let costDivisor: () => DecimalSource = () => 100;

export function setCostDivisorReader(read: () => DecimalSource): void {
  costDivisor = read;
}

/**
 * Compute adjusted ticks (action cost after stat reduction).
 *
 * `adjustedTicks = ceil(manaCost * sum(weight / (1 + level/costDivisor)) - 0.000001)`
 *
 * The -0.000001 epsilon prevents floating point from rounding up at exact boundaries.
 *
 * Reference: idleLoops/actions.js setAdjustedTicks
 */
export function computeAdjustedTicks(def: ActionDef): Decimal {
  let costMult = Decimal.dZero;
  const divisor = costDivisor();
  for (const [stat, weight] of Object.entries(def.weights)) {
    if (!weight) continue;
    const level = getStatLevel(stat);
    costMult = Decimal.add(
      costMult,
      Decimal.div(weight, Decimal.add(1, Decimal.div(level, divisor))),
    );
  }
  return Decimal.ceil(Decimal.sub(Decimal.mul(evalManaCost(def), costMult), 0.000001));
}

/**
 * Grant stat XP from an action's tick.
 *
 * Per stat with weight: pass the raw `weight * adjustedExp` to `addStatXP`.
 * The stat-level + talent gainChains apply the talent multiplier (bound in
 * `statsModule.connect()`), so the boosted amount lands on the level skill
 * and `boosted * talentAccrualRatio` lands on the talent skill — matching
 * the canonical idle-loops formula without manual talentMult application
 * at this call site.
 *
 * Reference: idleLoops/actions.js addExpFromAction
 */
export function addExpFromAction(def: ActionDef, adjustedTicks: DecimalSource): void {
  const manaCost = evalManaCost(def);
  const adjustedExp = Decimal.mul(def.expMult, Decimal.div(manaCost, adjustedTicks));

  const statExpGains: Record<string, number> = {};
  for (const [stat, weight] of Object.entries(def.weights)) {
    if (!weight) continue;
    const raw = Decimal.mul(weight, adjustedExp);
    // Boosted = what gainChain applies inside addStatXP — surface it for the
    // per-item statExp display ("actual XP accumulated this loop").
    const boosted = Decimal.mul(raw, getTalentMult(stat));
    addStatXP(stat, raw);
    statExpGains[stat] = boosted.toNumber();
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
