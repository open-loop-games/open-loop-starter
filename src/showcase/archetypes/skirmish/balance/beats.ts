/**
 * Beat windows and predicates — the six phases in `../IDENTITY.md` § The arc,
 * expressed as things a probe can watch on a live engine.
 *
 * Not runnable on its own; `arc-probe.ts` imports it. Windows are **measured,
 * not authored**: when a beat will not fire inside its window, the response is
 * to move the window or reshape content, never to contort a constant until it
 * lands. The receipts for the current windows are in `../BALANCING.md`
 * § Running a pass.
 */

import { type Engine } from '@open-loop/engine';
import { EconomyKey, MatchKey, TacticalKey, type Side } from '../modules';
import { ECONOMY_BALANCE } from '../data/economy';

export interface BeatContext {
  engine: Engine;
  /** The seat the beat is read from — beats are per-faction experiences. */
  side: Side;
}

export interface BeatDef {
  id: string;
  /** Inclusive window in game-seconds, `[from, to]`. */
  window: [number, number];
  /** True once the beat has occurred. Must be monotonic — beats do not un-fire. */
  predicate: (ctx: BeatContext) => boolean;
  /** What this beat means for the player, one line. */
  intent: string;
}

function economy(engine: Engine) {
  return engine.tryInject(EconomyKey)!;
}
function tactical(engine: Engine) {
  return engine.tryInject(TacticalKey)!;
}
function match(engine: Engine) {
  return engine.tryInject(MatchKey)!;
}

/**
 * Beat 5 needs a peak to compare against, and peaks are not recoverable from a
 * snapshot — so the arc probe tracks them as it steps and hands them back in.
 */
export interface ArcTrace {
  peakUnits: Record<Side, number>;
  /** Peak held at the moment this seat's army first broke, or null if it hasn't. */
  peakAtBreak: Record<Side, number | null>;
  contactSeen: boolean;
}

export function createArcTrace(): ArcTrace {
  return {
    peakUnits: { a: 0, b: 0 },
    peakAtBreak: { a: null, b: null },
    contactSeen: false,
  };
}

/**
 * Advance the trace one observation. Call every probe step, before the
 * predicates — beat 4 and 5 read state the tick itself destroys.
 */
/**
 * Smallest peak that counts as an engagement. Below this, "half the army died"
 * is two units trading, and the break/recovery beats fire on noise seconds
 * after the first contact — which reads as a beat landing early when it is
 * really the threshold being meaningless at that scale.
 */
const MIN_ENGAGEMENT_PEAK = 6;

export function observe(engine: Engine, trace: ArcTrace): void {
  const t = tactical(engine);
  for (const side of ['a', 'b'] as Side[]) {
    const live = t.units[side].value.length;
    trace.peakUnits[side] = Math.max(trace.peakUnits[side], live);
    if (
      trace.peakAtBreak[side] === null &&
      trace.peakUnits[side] >= MIN_ENGAGEMENT_PEAK &&
      live * 2 <= trace.peakUnits[side] &&
      trace.contactSeen
    ) {
      trace.peakAtBreak[side] = trace.peakUnits[side];
    }
  }
  if (t.units.a.value.length > 0 && t.units.b.value.length > 0) {
    // Both armies on the field at once — the necessary condition for contact.
    // Proximity is checked in the beat predicate; this only latches presence.
    trace.contactSeen = true;
  }
}

/** Closest approach between the two armies, in field units. `Infinity` if either is empty. */
export function armySeparation(engine: Engine): number {
  const t = tactical(engine);
  let best = Infinity;
  for (const ua of t.units.a.value) {
    for (const ub of t.units.b.value) {
      best = Math.min(best, Math.hypot(ua.x - ub.x, ua.y - ub.y));
    }
  }
  return best;
}

/**
 * The six beats. Windows are sized against a match that resolves in minutes
 * (`match/timeLimitSec` defaults to 30m, which is a backstop rather than the
 * expected length) and against the economic crossovers
 * `skirmish-projection.ts` prints — beat 5 is deliberately placed around
 * where a compounding seat overtakes a rushing one.
 */
export function skirmishBeats(trace: ArcTrace): BeatDef[] {
  return [
    {
      id: 'first-income-decision',
      window: [0, 30],
      intent: 'The split becomes real — income can purchase economy or army, not both.',
      predicate: ({ engine, side }) =>
        economy(engine).cumulativeIncome[side].value >= ECONOMY_BALANCE.workerCost,
    },
    {
      id: 'first-army-committed',
      window: [0, 45],
      intent: 'The opening ends; units leave the base.',
      predicate: ({ side }) => trace.peakUnits[side] > 0,
    },
    {
      id: 'first-contact',
      window: [5, 60],
      intent: 'Armies meet — the first read on whether the split was right.',
      predicate: ({ engine }) => armySeparation(engine) <= 12, // TROOPER.aggroRange
    },
    {
      id: 'first-engagement-decided',
      window: [10, 90],
      intent: 'One army breaks; attrition asymmetry becomes legible.',
      predicate: ({ side }) => trace.peakAtBreak[side] !== null,
    },
    {
      id: 'recovery-or-collapse',
      window: [20, 240],
      intent: 'The broken faction rebuilds to the strength it lost, or cannot.',
      // Deliberately about REPLACING LOSSES, not about investing. An earlier
      // version fired on `workers > startingWorkers`, which a φ = 0 seat can
      // never satisfy by construction — it read as a missing beat when it was
      // measuring the wrong thing.
      //
      // **Never-firing is a real outcome here, not a gap**: a seat whose army
      // broke and never returned to that strength collapsed, which is the other
      // half of this beat's name. Read it against `base-broken`.
      predicate: ({ engine, side }) => {
        const peak = trace.peakAtBreak[side];
        if (peak === null) return false;
        return tactical(engine).units[side].value.length >= peak;
      },
    },
    {
      id: 'base-broken',
      window: [20, 300],
      intent: 'The match resolves.',
      predicate: ({ engine }) => match(engine).outcome.value !== null,
    },
  ];
}
