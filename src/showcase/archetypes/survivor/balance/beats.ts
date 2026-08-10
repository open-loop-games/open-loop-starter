/**
 * Survivor beat spec — where the run turns, and how those turns are read.
 *
 * Not runnable on its own (`_`-less by canon exception: this is the beats file
 * `.claude/rules/archetype-authoring.md` § Canonical `balance/` filenames names,
 * imported by the probes). `./spread-probe.ts` prints the windows; `../manifest.ts`
 * carries the recorded result.
 *
 * **Extractors over a finished arc, not tick predicates.** Tug and skirmish use
 * the engine's `BeatProbe` because their beats are single events a `runUntil`
 * bisection can stop on. Survivor's are phases of a stochastic thirty-minute arc
 * whose windows only mean something across a seed batch, and `./_arc.ts` already
 * samples every quantity they need per minute. A tick-level predicate here would
 * need a second run path measuring the same thing, and the two would drift.
 *
 * `null` means the beat never landed in that run, which is a reading rather than
 * a gap — a seat that is never touched has no `first contact`, and that is the
 * Kineticist's whole thesis. Runs where a beat never lands are excluded from its
 * window rather than counted as zero.
 */

import type { ArcResult, ArcSample } from './_arc';
import { HP_MILESTONES } from '../modules/sim/types';

/**
 * One phase boundary of the arc, and how to find it in a finished run.
 *
 * `label` is what `../manifest.ts` carries — written for someone reading the
 * gallery, so it names the player-visible turn rather than the counter that
 * detects it.
 */
export interface SurvivorBeat {
  n: number;
  label: string;
  /** Sim-seconds the beat landed at, or `null` if this run never reached it. */
  at: (run: ArcResult) => number | null;
}

/** Sim-seconds at the END of minute `m` (1-indexed), which is where samples sit. */
const atMinute = (m: number): number => m * 60;

/**
 * First sampled minute satisfying `pred`, as sim-seconds.
 *
 * Minute resolution is the honest one for the population beats: `../data/arena.ts`
 * `localDensity` is a residency model over a spawn rate, so the live count
 * crossing a threshold is a trend rather than an instant, and reporting it to
 * the second would invent precision the sampling does not have.
 */
function firstMinute(run: ArcResult, pred: (s: ArcSample) => boolean): number | null {
  const hit = run.series.find(pred);
  return hit ? atMinute(hit.minute) : null;
}

/** Index of the 50% mark in `HP_MILESTONES`; the halfway beat reads it. */
const HALF_HP = HP_MILESTONES.indexOf(0.5);

/**
 * The six turns of an arc, ordered by where they were OBSERVED to land.
 *
 * They are deliberately not the draft beats. The ladder lands ~33 drafts over
 * thirty minutes (`./survivor-projection.ts`) and a map of thirty-three
 * indistinguishable pauses says nothing about where the run changes character.
 * What changes character is the floor: how crowded it is, whether the loadout
 * has committed, and whether the operator is still whole.
 *
 * The order was authored wrong and the recording corrected it, which is the
 * argument for recording. `first contact` was written third, after the loadout
 * commits, on the reasonable assumption that a run gets going before it gets
 * hurt. Measured, it lands at ~0:20 against ~2:00 — the floor gets a hand on you
 * before you have chosen what the run is about. That is worth knowing about this
 * archetype and no authored map would have said it.
 */
export const SURVIVOR_BEATS: SurvivorBeat[] = [
  {
    n: 1,
    label: 'Opening — the apparatus fires into an empty floor; the first draft commits nothing',
    at: () => 0,
  },
  {
    n: 2,
    label: 'First contact — the floor gets a hand on you before the loadout is a loadout',
    at: (run) => run.firstDamageAt,
  },
  {
    n: 3,
    label: 'The loadout commits — a device is deep enough to be the one the run is about',
    // Six levels of `levelGain` is where depth has beaten breadth decisively
    // (`../BALANCING.md` § Known thin: seven levels is ~10.5x against a 2-4x
    // spread across shapes), so this is the beat where "which device" stops
    // being a live question. Summed levels, because the draft can spread them.
    at: (run) => firstMinute(run, (s) => s.deviceLevels >= 6),
  },
  {
    n: 4,
    label: 'Halfway down — attrition has taken half the bar and disengaging starts to look right',
    at: (run) => (HALF_HP >= 0 ? (run.hpMilestoneAt[HALF_HP] ?? null) : null),
  },
  {
    n: 5,
    label: 'The floor fills — bodies outpace the kill radius and collection starts costing',
    // 100 live bodies is where waste turns over: measured 2-4% under 50 and
    // 41-90% past 200, monotone on every seat (`../BALANCING.md` § Known thin,
    // the density reading). It is the arc's real difficulty transition and
    // nothing in the schedule announces it.
    //
    // Sits AFTER the halfway mark by a minute of median, which the two windows
    // overlap far too widely to call an order — read them as simultaneous. What
    // the pair does say is that attrition is not downstream of density here: the
    // bar is half gone by the time the floor is crowded.
    at: (run) => firstMinute(run, (s) => s.liveSpecimens >= 100),
  },
  {
    n: 6,
    label: 'The floor closes — the run ends and the notes bank',
    at: (run) => run.elapsed,
  },
];
