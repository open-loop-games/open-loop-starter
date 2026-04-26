import { inject, type ComputedRef } from 'vue';
import type { Engine, Persistent } from 'open-loop-engine';
import { LaneKey, type LaneApi, type Side, type UnitInstance } from '../modules';

export interface LaneView {
  /** Per-side reactive unit arrays (persistent so save/load round-trips
   *  positions + hp; behaves as Ref<UnitInstance[]> for read access). */
  units: Record<Side, Persistent<UnitInstance[]>>;
  /** Per-side frontmost lane position (0..laneLength). */
  frontline: Record<Side, ComputedRef<number>>;
  /** Total lane length in lane-units (unitless; structural). */
  laneLength: number;
  /** Normalize an absolute lane position into 0..1 left-to-right.
   *  Player spawns at 0 (left), AI spawns at laneLength (right). */
  normalize(position: number): number;
  /** Subscribe to lane events (fortress-reached / unit-killed). */
  on: LaneApi['on'];
}

/**
 * Reactive view of the lane — both sides' unit arrays, both frontlines, and
 * a position-normalizer for the LaneStrip's left→right rendering.
 */
export function useLane(): LaneView {
  const engine = inject<Engine>('engine');
  const lane = engine?.tryInject(LaneKey);
  if (!lane) {
    throw new Error('useLane() called outside an active tug engine');
  }
  return {
    units: lane.units,
    frontline: lane.frontline,
    laneLength: lane.laneLength,
    normalize: (position) => Math.max(0, Math.min(1, position / lane.laneLength)),
    on: lane.on,
  };
}
