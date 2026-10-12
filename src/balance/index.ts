/**
 * Cross-archetype balance toolkit — the pieces the per-archetype `balance/`
 * folders share, over an engine harness they import directly.
 *
 * Runners and their types (`runBeatProbe`, `runWaypointProbe`, `runUntil`,
 * `runMatrixUntil`, `runSensitivity`, `Beat`, `Waypoint`) come from
 * `@open-loop/engine`. This kit deliberately does not re-export them: it
 * owns the *balance* vocabulary, not the harness, and a partial re-export
 * only made one subsystem arrive from two paths.
 *
 * What lives here:
 *
 * - `costCurve` — the cost side as an engine `Formula` in purchase count, shared by
 *   the beat-time quotient and any inversion/integration downstream.
 * - `producerPacingInspector` — the `inspect` callback `runWaypointProbe`
 *   takes, producing the `ProducerPacing` rows `renderFlowTable` renders.
 * - `report.ts` — the markdown renderers a discovery script prints.
 * - `spread.ts` — seeded multi-run statistics, for a spine whose closed form
 *   stops at a stochastic leg: numeric spread over the engine's own
 *   descriptive kernel, plus the categorical distribution it does not carry.
 *
 * Discovery shape: scripts drive the engine runners, render with `report.ts`,
 * iterate balance constants until tables are green. Regression shape: a thin
 * sim test pins the chosen `terminationTime` distribution per beat.
 */

import {
  Decimal,
  type Engine,
  classifyFlowChannel,
  toNumber,
  type FlowChannel,
} from '@open-loop/engine';
import { costCurve } from './cost-curve';

export { costCurve, type CostCurveParams, type CostScalingFamily } from './cost-curve';

export {
  formatChannel,
  formatDuration,
  formatWindow,
  renderArcTable,
  renderFlowTable,
  renderSensitivityTable,
} from './report';

export {
  categorySpreadOf,
  formatCategorySpread,
  formatSpread,
  seedBatch,
  spreadOf,
  type CategorySpread,
} from './spread';

/**
 * One producer's per-purchase pacing texture at a single waypoint snapshot.
 *
 * `beatTimeSeconds` is `Cost(purchaseCount) / (perUnitRate × effectiveCount)`:
 * the beat time of the next purchase on the producer's own production rate,
 * independent of every other producer.
 */
export interface ProducerPacing {
  producerId: string;
  purchaseCount: number;
  effectiveCount: number;
  perUnitRate: number;
  nextCost: number;
  beatTimeSeconds: number;
  channel: FlowChannel;
}

/** Per-archetype hook: read state out of an engine into pacing inputs. */
export interface ProducerInspector {
  /**
   * List the continuous producers the player has at least 1 of, in tier
   * order. Each entry feeds one row into the pacing snapshot.
   */
  ownedProducers: (engine: Engine) => Array<{
    id: string;
    /** Prices the next purchase. */
    purchaseCount: number;
    /** Units producing: the purchase count plus any extra count. */
    effectiveCount: number;
    perUnitRate: number;
    baseCost: number;
    costRatio: number;
  }>;
}

/**
 * Helper consumed by archetype `balance/run.ts` scripts: closes over a
 * {@link ProducerInspector} and returns the `inspect` callback expected by
 * {@link runWaypointProbe}.
 */
export function producerPacingInspector(
  inspector: ProducerInspector,
): (engine: Engine) => ProducerPacing[] {
  return (engine) => {
    const out: ProducerPacing[] = [];
    for (const p of inspector.ownedProducers(engine)) {
      const nextCost = costCurve(p.purchaseCount, {
        baseCost: p.baseCost,
        costRatio: p.costRatio,
      }).evaluate();
      const production = Decimal.mul(p.perUnitRate, p.effectiveCount);
      // Nothing is ever afforded at zero production. `classifyFlowChannel`
      // reads Infinity as 'breakdown' and the report renders it as '∞'.
      const sec = Decimal.lte(production, 0)
        ? Infinity
        : toNumber(Decimal.div(nextCost, production));
      out.push({
        producerId: p.id,
        purchaseCount: p.purchaseCount,
        effectiveCount: p.effectiveCount,
        perUnitRate: p.perUnitRate,
        nextCost: toNumber(nextCost),
        beatTimeSeconds: sec,
        channel: classifyFlowChannel(sec),
      });
    }
    return out;
  };
}
