import {
  calculateBeatTiming,
  classifyFlowChannel,
  runUntil,
  type Engine,
  type FlowChannel,
} from 'open-loop-engine';

/**
 * One producer's per-purchase pacing texture at a single beat snapshot.
 *
 * `beatTimeSeconds` is `Cost(level) / (perUnitRate × quantity)` — the
 * producer's *own-income* payback for the next purchase. Independent of
 * other income sources. A producer whose payback exits `flow-upper`
 * (>300s) while it's still the player's active purchase target is a
 * cost-scaling miss — the curve is steeper than the integration of
 * upstream production can keep up with.
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

/** All-producer pacing snapshot at one beat's midpoint sim-time. */
export interface BeatSnapshot {
  beatId: string;
  /** Sim-time at which the snapshot was taken (the beat's midpoint target). */
  snapshotSimTime: number;
  /** Whether the snapshot reached its target sim-time (vs. ran out of budget). */
  reachedTarget: boolean;
  /** Pacing for every continuous producer the player has at least 1 of. */
  perProducer: ProducerPacing[];
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

export interface BeatProbe {
  id: string;
  /** Sim-time (seconds) to snapshot at — typically the beat's spec-window midpoint. */
  snapshotAtSec: number;
}

export interface FlowProbeConfig {
  /** Returns a started, bot-driven engine ready for `runUntil`. */
  buildEngine: () => Engine;
  beats: BeatProbe[];
  inspect: ProducerInspector;
}

/**
 * For each beat: build a fresh bot-driven engine, run it until the beat's
 * midpoint sim-time, and compute per-producer payback texture.
 *
 * One engine per beat — clean state, deterministic snapshot. Cost is
 * roughly the snapshot time × tickrate, paid once per probe run.
 */
export function runFlowProbe(config: FlowProbeConfig): BeatSnapshot[] {
  const out: BeatSnapshot[] = [];
  for (const beat of config.beats) {
    const engine = config.buildEngine();
    const result = runUntil({
      engine,
      until: (ctx) => ctx.simTime >= beat.snapshotAtSec,
      maxSimTime: beat.snapshotAtSec + 60,
    });

    const perProducer: ProducerPacing[] = [];
    for (const p of config.inspect.ownedProducers(engine)) {
      const beatTime = calculateBeatTiming({
        baseCost: p.baseCost,
        costMultiplier: p.costScaling,
        baseProduction: p.perUnitRate,
        quantity: p.quantity,
        level: p.level,
      });
      const sec = Number(beatTime);
      perProducer.push({
        producerId: p.id,
        level: p.level,
        quantity: p.quantity,
        perUnitRate: p.perUnitRate,
        nextCost: Number(p.baseCost) * Math.pow(Number(p.costScaling), p.level),
        beatTimeSeconds: sec,
        channel: classifyFlowChannel(sec),
      });
    }

    out.push({
      beatId: beat.id,
      snapshotSimTime: result.elapsedSimulated,
      reachedTarget: result.terminated === 'predicate',
      perProducer,
    });
  }
  return out;
}
