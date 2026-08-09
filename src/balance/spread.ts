/**
 * Seeded multi-run spread — the measurement half of a spine whose closed form
 * stops at a stochastic leg.
 *
 * An archetype whose coverage boundary names "seeded multi-run distribution
 * statistics" as what measures the remainder needs two readings its probes
 * cannot get from one run: the SPREAD of a numeric outcome across seeds, and
 * the DISTRIBUTION of a categorical one. A single-seed probe reports a point
 * and cannot say whether it is the centre of anything.
 *
 * The numeric half is the engine's — `computeMetricStats` is its descriptive
 * kernel, and reusing it is what keeps percentiles here on the same
 * floor-index convention as every other stats surface in the tree. What this
 * adds is the categorical half, which the engine's `CellAggregate` documents
 * as deliberately absent ("string/boolean metric aggregation (mode,
 * distribution) is deferred until a consumer demands it") — and the shape it
 * aggregates, `AnalyzerResult.metrics`, carries strings that `aggregateCell`
 * then silently drops.
 *
 * TODO(expansion): categorical aggregation over a seed sweep is a parked
 * engine primitive — `candidate-primitives.md` § Categorical outcome
 * distribution over a seed sweep. Promote when a second archetype's spine
 * declares a categorical outcome as its measured remainder.
 *
 * This file is deliberately statistics only. Running the seeds is the probe's
 * job: a per-seed run boots its own engine under its own persistence
 * namespace, and what that run *is* differs per archetype far more than what
 * you then ask of the batch.
 */

import { computeMetricStats, type MetricStats } from '@open-loop/engine/harness';

/**
 * A reproducible batch of seeds.
 *
 * Stepped by a prime rather than counting up, because a batch is meant to
 * sample the generator's space and consecutive integers are the one input
 * where a weak seeding routine can correlate its early output. `base` is the
 * batch identity — change it to draw a genuinely different batch, keep it to
 * re-read the same one.
 */
export function seedBatch(count: number, base = 12345): number[] {
  return Array.from({ length: count }, (_, i) => base + i * 7919);
}

/**
 * Descriptive stats per named metric over a batch of per-run readouts.
 *
 * The metric map is `(run) => number` selectors rather than a metrics object
 * on the run, so a probe keeps its own rich domain-shaped result and names
 * only the columns it wants a spread on.
 *
 * Non-finite samples are dropped, and `count` therefore reports how many runs
 * contributed rather than how many ran — matching `aggregateCell`, and for the
 * same reason: a run that ended before a quantity existed has no reading to
 * average, and substituting zero would be inventing one. A metric with no
 * finite sample is omitted entirely.
 */
export function spreadOf<T>(
  samples: readonly T[],
  metrics: Record<string, (sample: T) => number>,
): Record<string, MetricStats> {
  const out: Record<string, MetricStats> = {};
  for (const [key, select] of Object.entries(metrics)) {
    const values = samples.map(select).filter((v) => Number.isFinite(v));
    if (values.length > 0) out[key] = computeMetricStats(values);
  }
  return out;
}

/**
 * How a categorical outcome landed across a seed batch.
 *
 * `modalShare` is the reading a spine target is usually written against: a
 * personality bound by one cause on every seed reads 1.0, which is a wall in
 * costume however well-tuned the number underneath it is.
 */
export interface CategorySpread {
  /** Occurrences per category, insertion-ordered by first appearance. */
  counts: Record<string, number>;
  total: number;
  /** Most frequent category; ties resolve to the one seen first. */
  modal: string;
  /** `counts[modal] / total`. 1.0 means the outcome never varied. */
  modalShare: number;
  distinct: number;
}

/** Tally a categorical outcome across a batch. Empty batch → an empty tally. */
export function categorySpreadOf<T>(
  samples: readonly T[],
  pick: (sample: T) => string,
): CategorySpread {
  const counts: Record<string, number> = {};
  for (const s of samples) {
    const key = pick(s);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  let modal = '';
  let best = 0;
  for (const [key, n] of Object.entries(counts)) {
    if (n > best) {
      best = n;
      modal = key;
    }
  }
  const total = samples.length;
  return {
    counts,
    total,
    modal,
    modalShare: total > 0 ? best / total : 0,
    distinct: Object.keys(counts).length,
  };
}

/**
 * `median [min–max]`, with an optional domain formatter for the three numbers.
 *
 * Range rather than `p5`–`p95` on purpose: floor-index percentiles over a
 * batch of the size a 30-minute arc probe can afford (single digits to low
 * tens) select the first and last elements anyway, so quoting them as
 * percentiles would dress the observed range up as a tail estimate. Read
 * `MetricStats.stddev` for the width; this is the shape of the batch.
 */
export function formatSpread(stats: MetricStats, format: (n: number) => string = String): string {
  return `${format(stats.median)} [${format(stats.min)}–${format(stats.max)}]`;
}

/** `traversal 4 · hp-floor 3 · timer 1`, most frequent first. */
export function formatCategorySpread(spread: CategorySpread): string {
  return Object.entries(spread.counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, n]) => `${key} ${n}`)
    .join(' · ');
}
