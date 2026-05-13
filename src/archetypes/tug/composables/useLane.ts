import type { ComputedRef } from 'vue';
import type { Persistent } from '@open-loop/engine';
import { useModule } from '@/composables/useModule';
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
  /** Subscribe to lane events (`unit-killed`). Fortress damage is no
   *  longer event-routed — it flows through the fortress unit's hp
   *  accessor in lane combat; match.ts watches the resource directly. */
  on: LaneApi['on'];
}

/**
 * Reactive view of the lane — both sides' unit arrays, both frontlines, and
 * a position-normalizer for the LaneStrip's left→right rendering.
 */
export function useLane(): LaneView {
  const lane = useModule(LaneKey);
  return {
    units: lane.units,
    frontline: lane.frontline,
    laneLength: lane.laneLength,
    normalize: (position) => Math.max(0, Math.min(1, position / lane.laneLength)),
    on: lane.on,
  };
}
