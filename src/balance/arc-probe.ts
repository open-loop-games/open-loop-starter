import {
  runProbe,
  type BeatProbe,
  type BeatResult,
  type ProbeConfig,
} from 'open-loop-engine/harness';

/**
 * Arc-beat variant of the engine's generic {@link BeatProbe}. Adds the
 * § 4 spec window — a beat-design concept that belongs in the starter's
 * interpretation layer, not in the engine primitive.
 */
export interface ArcBeatProbe extends BeatProbe {
  /** § 4 window in seconds, `[lower, upper]`. */
  specWindow: [number, number];
}

/** Per-beat arc result. Adds spec-window + `inWindow` classification. */
export interface BeatArcResult extends BeatResult {
  specWindow: [number, number];
  /** True iff `terminationTime.p50` falls inside `specWindow`. */
  inWindow: boolean;
}

/**
 * Config for {@link runArcProbe}. Shaped like {@link ProbeConfig} but with
 * arc-specific beats (carrying a spec window each).
 */
export interface ArcProbeConfig extends Omit<ProbeConfig, 'beats'> {
  beats: ArcBeatProbe[];
}

/**
 * For each beat: run `seeds.length` engines until the predicate fires
 * (or `maxSimTime` is reached), aggregate the termination-time
 * distribution via the engine's `runProbe`, and add the spec-window
 * interpretation (`inWindow` = p50 ∈ window).
 */
export function runArcProbe(config: ArcProbeConfig): BeatArcResult[] {
  const results = runProbe({
    buildEngine: config.buildEngine,
    beats: config.beats,
    seeds: config.seeds,
    maxSimTime: config.maxSimTime,
    tickDelta: config.tickDelta,
  });
  return results.map((r, i) => {
    const beat = config.beats[i]!;
    const p50 = r.terminationTime?.p50 ?? Infinity;
    const inWindow = p50 >= beat.specWindow[0] && p50 <= beat.specWindow[1];
    return { ...r, specWindow: beat.specWindow, inWindow };
  });
}
