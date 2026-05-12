/**
 * Cross-archetype balance toolkit. Wraps engine pacing primitives + the
 * `runMatrixUntil` harness into shapes a per-archetype `balance/` folder
 * can plug into.
 *
 * Discovery shape: scripts call `runWaypointProbe` + `runProbe`, render
 * with `report.ts`, iterate balance constants until tables are green.
 * Regression shape: a thin sim test pins the chosen `terminationTime`
 * distribution per beat.
 *
 * `runWaypointProbe` checks per-producer payback texture at scheduled
 * waypoints (own-income beat time, classified into Csikszentmihalyi flow
 * channels). `runProbe` with `BeatProbe.targetWindow` checks
 * beat-completion-time distributions across a seed sweep, with `inWindow`
 * classification. `runSensitivity` (with `until`/`axes` for predicate-
 * bounded sweeps) confirms ±%-perturbation robustness once a balance is
 * chosen.
 */

import {
  type Engine,
  calculateBeatTiming,
  classifyFlowChannel,
  type FlowChannel,
} from 'open-loop-engine';

export {
  runProbe,
  runWaypointProbe,
  type BeatProbe,
  type BeatResult,
  type Waypoint,
  type WaypointSnapshot,
} from 'open-loop-engine';

export {
  formatChannel,
  formatDuration,
  formatWindow,
  renderArcTable,
  renderFlowTable,
  renderSensitivityTable,
} from './report';

/**
 * One producer's per-purchase pacing texture at a single waypoint snapshot.
 *
 * `beatTimeSeconds` is `Cost(level) / (perUnitRate × quantity)` — the
 * producer's own-income payback for the next purchase. Independent of
 * other income sources.
 */
export interface ProducerPacing {
  producerId: string;
  level: number;
  quantity: number;
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
    level: number;
    quantity: number;
    perUnitRate: number;
    baseCost: number;
    costScaling: number;
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
      const beatTime = calculateBeatTiming({
        baseCost: p.baseCost,
        costMultiplier: p.costScaling,
        baseProduction: p.perUnitRate,
        quantity: p.quantity,
        level: p.level,
      });
      const sec = Number(beatTime);
      out.push({
        producerId: p.id,
        level: p.level,
        quantity: p.quantity,
        perUnitRate: p.perUnitRate,
        nextCost: Number(p.baseCost) * Math.pow(Number(p.costScaling), p.level),
        beatTimeSeconds: sec,
        channel: classifyFlowChannel(sec),
      });
    }
    return out;
  };
}
