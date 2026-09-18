/**
 * Sim-engine fixture for the skirmish balance probes. Underscore-prefixed
 * because it is not runnable on its own — the probes import it.
 *
 * It holds **no policy**. Skirmish's policy is shipping game code
 * (`modules/automation.ts`), and what lives here is the engine build, the
 * per-seat persona wiring the probes vary, and outcome capture. A probe that
 * re-implemented the spawn decision would be measuring itself.
 *
 * `sim/harness.ts` is a different thing — it boots the module list on memory
 * storage for tick-by-tick behavioral specs.
 */

import { seedRNG, type Analyzer, type Engine } from '@open-loop/engine';
import { createGameEngine } from '../boot';
import { MatchKey, type AutomationOptions, type Side, PERSONAS, type PersonaKey } from '../modules';

let engineCounter = 0;

/**
 * The two shipping personas. They differ **only** on `φ`, deliberately: that
 * makes the default matchup a point on the surface `split-probe.ts` sweeps,
 * rather than a separate configuration whose result cannot be located on it.
 * Tempo dials are a second axis and are held equal until one is swept.
 */
export const RUSH: AutomationOptions = { ...PERSONAS.rush, cadenceJitter: 0 };
export const INVESTOR: AutomationOptions = { ...PERSONAS.investor, cadenceJitter: 0 };

export interface SkirmishSimOptions {
  /** Seat `a` policy. Default: the rush persona. */
  a?: AutomationOptions;
  /** Seat `b` policy. Default: the investor persona. */
  b?: AutomationOptions;
  /**
   * Raise the loop's `maxDeltaTime` cap — headless probes advance in coarse
   * steps that the default cap would otherwise clamp, silently stretching
   * every measured time.
   */
  maxDeltaTime?: number;
  /** Initial RNG seed for believability jitter. */
  seed?: number;
}

/**
 * Build a started, bot-driven engine with the match already open.
 *
 * Each build takes a unique `persistenceNamespace`: matrix sweeps run many
 * engines in one process, and a collision aliases persistent-ref contexts in a
 * way that reads as a balance result rather than as a bug.
 *
 * `start()` then `stop()` hands the clock to the caller — probes advance via
 * `engine.tickDriver.simulateTick(dt)` through the harness runners, so the
 * real-time loop must not also be firing.
 */
export function buildSkirmishSimEngine(options?: SkirmishSimOptions): Engine {
  if (options?.seed !== undefined) {
    seedRNG(options.seed);
  }
  const { engine } = createGameEngine({
    persistenceNamespace: `skirmish-balance-${++engineCounter}`,
    maxDeltaTime: options?.maxDeltaTime,
    seats: {
      a: options?.a ?? RUSH,
      b: options?.b ?? INVESTOR,
    },
  });
  engine.selectMod('skirmish');
  engine.start();
  engine.stop();
  engine.tryInject(MatchKey)!.start();
  return engine;
}

/** A seat pairing on the split axis, for the sweep probes. */
export function seatsAtShare(shareA: number, shareB: number): SkirmishSimOptions {
  return {
    a: { ...RUSH, economyShare: shareA },
    b: { ...RUSH, economyShare: shareB },
  };
}

/** A seat pairing for named personas, optionally overriding cadence jitter. */
export function seatsForPersonas(
  personaA: PersonaKey,
  personaB: PersonaKey,
  jitter?: number,
): SkirmishSimOptions {
  const a = { ...PERSONAS[personaA] };
  const b = { ...PERSONAS[personaB] };
  if (jitter !== undefined) {
    a.cadenceJitter = jitter;
    b.cadenceJitter = jitter;
  }
  return { a, b };
}

// ─── Outcome capture ─────────────────────────────────────────────────────────

export interface OutcomeCapture {
  /** Winner of the match, once decided. */
  winner: Side | null;
  /** Why it ended — `'defeat'` when a base fell, `'time-limit'` otherwise. */
  reason: string | null;
  /** Match clock at resolution, in game-seconds. */
  durationSec: number;
}

/**
 * Subscribe to `matchEnded` on a freshly-built engine.
 *
 * `match.end()` emits BEFORE it runs its synchronous reset (`modules/match.ts`,
 * `end`), and the reset clears `outcome` back to null — so reading the outcome
 * off the engine after a run always yields nothing. Capturing on the event is
 * the only way to see it, which is why every probe here goes through this
 * rather than inspecting engine state at the end.
 */
export function createOutcomeCapture(engine: Engine): OutcomeCapture {
  const capture: OutcomeCapture = { winner: null, reason: null, durationSec: 0 };
  const match = engine.tryInject(MatchKey)!;
  match.on('matchEnded', (payload) => {
    if (capture.reason !== null) return; // first match only
    capture.winner = payload.outcome.winner;
    capture.reason = payload.outcome.reason;
    capture.durationSec = payload.elapsedSec;
  });
  return capture;
}

/** Surface an {@link OutcomeCapture} as harness metrics for matrix runs. */
export function createOutcomeAnalyzer(capture: OutcomeCapture): Analyzer {
  return {
    name: 'skirmish-outcome',
    summarize: () => ({
      name: 'skirmish-outcome',
      metrics: {
        aWon: capture.winner === 'a' ? 1 : 0,
        bWon: capture.winner === 'b' ? 1 : 0,
        decided: capture.reason === 'defeat' ? 1 : 0,
        durationSec: capture.durationSec,
      },
      issues: [],
    }),
  };
}
