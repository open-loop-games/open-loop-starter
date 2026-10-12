/**
 * Beat windows and their predicates — imported by the probes, never run alone.
 *
 * A beat is where the run turns. The windows in `../manifest.ts` are RECORDED
 * from probe runs, never authored as targets to tune toward
 * (`src/types.ts` § `BeatRef.recordedFireTimeRange`), so this file owns only the
 * predicates: what it means for each beat to be reached. The probe owns when.
 */

/** The readings a beat predicate is allowed to see. */
export interface ArcReading {
  /** Sim-seconds since the run began. */
  t: number;
  /** Aggregate mass/sec across every continuous class. Excludes the launcher. */
  totalRate: number;
  /** Units owned across every class. */
  fleetSize: number;
  /** Distinct classes with at least one unit. */
  distinctClasses: number;
  /** Units owned of the top class on the ladder. */
  topClassCount: number;
  /** Refinements purchased. */
  refinementsOwned: number;
  /** Revisions earned. */
  revisionsEarned: number;
  /** Highest automation tier reached. */
  automationTier: string;
}

export interface BeatDef {
  n: number;
  label: string;
  reached: (r: ArcReading) => boolean;
}

/**
 * The launcher's ceiling in mass/sec — base yield × the four click refinements
 * (×2 each) at an assumed 2 launches/s. Beat 2 is the moment the ladder passes
 * it, which is the archetype's "you stop clicking" turn.
 *
 * Derived, not authored: it restates `../data/refinements.ts` § Balance in the
 * one place a probe needs it as a number. If those four multipliers move, this
 * moves with them.
 */
export const CLICK_CEILING_PER_SECOND = 1 * 2 * 2 * 2 * 2 * 2;

export const BEATS: BeatDef[] = [
  {
    n: 1,
    label: 'First probe deployed',
    reached: (r) => r.fleetSize >= 1,
  },
  {
    // Measures when the LADDER passes the ceiling, not when the player stops
    // clicking. The probe's driver stops hand-launching the moment dispatch
    // opens, so "stops clicking" is imposed by the runner and only this
    // crossing is measured. Do not read beat 2 as the felt hand-off.
    n: 2,
    label: 'The swarm outpaces the hand — ladder passes the click ceiling',
    reached: (r) => r.totalRate > CLICK_CEILING_PER_SECOND,
  },
  {
    n: 3,
    label: 'First refinement purchased — the stack becomes a stack',
    reached: (r) => r.refinementsOwned >= 1,
  },
  {
    n: 4,
    label: 'First revision earned — the first splice point',
    reached: (r) => r.revisionsEarned >= 1,
  },
  {
    n: 5,
    label: 'Dispatch opens — allocation leaves the player’s hands',
    reached: (r) => r.automationTier !== 'manual',
  },
  {
    n: 6,
    label: 'Managed dispatch — the rule starts weighing the wait',
    reached: (r) => r.automationTier === 'managed',
  },
  {
    n: 7,
    label: 'The frontier — the top class is deployed',
    reached: (r) => r.topClassCount >= 1,
  },
];
