/**
 * Scratch-engine fixture for the skirmish balance probes. Underscore-prefixed
 * because it is not runnable on its own — the probes import it.
 *
 * It holds **no policy**. Skirmish's policy is shipping game code
 * (`modules/automation.ts`), and what is here is the engine build, the
 * per-seat persona wiring the probes vary, and outcome capture. A probe that
 * re-implemented the spawn decision would be measuring itself.
 *
 * `sim/harness.ts`, the test harness, is a different thing — it boots the module list on memory
 * storage for tick-by-tick behavioral specs.
 */

import { seedRNG, type Analyzer, type Engine } from '@open-loop/engine';
import { createGameEngine } from '../boot';
import {
  MatchKey,
  type AutomationOptions,
  type FactionId,
  PERSONAS,
  type PersonaKey,
  type FactionElimination,
} from '../modules';
import { DEFAULT_TRIAD_FACTIONS } from '../data/tactical';
let engineCounter = 0;

/**
 * The two shipping personas. They differ **only** on `φ`, deliberately: that
 * makes the default matchup a point on the surface `split-probe.ts` sweeps,
 * rather than a separate configuration whose result cannot be located on it.
 * Tempo parameters are a second axis and are held equal until one is swept.
 */
export const RUSH: AutomationOptions = { ...PERSONAS.rush, cadenceJitter: 0 };
export const INVESTOR: AutomationOptions = { ...PERSONAS.investor, cadenceJitter: 0 };

export interface SkirmishScratchEngineOptions {
  /** Participating factions roster. Defaults to ['a', 'b'] or derived from seats/personas. */
  factions?: readonly FactionId[];
  /** Per-seat policy options for arbitrary factions. */
  seats?: Partial<Record<FactionId, AutomationOptions>>;
  /** Per-seat named personas. */
  personas?: Partial<Record<FactionId, PersonaKey>>;
  /** Seat `a` policy (legacy 2-player convenience). */
  a?: AutomationOptions;
  /** Seat `b` policy (legacy 2-player convenience). */
  b?: AutomationOptions;
  /** Base placement radius. */
  baseRadius?: number;
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
 * Build a started scratch engine, driven by AI opponents, with the match already open.
 *
 * Each build takes a unique `persistenceNamespace`: matrix sweeps run many
 * engines in one process, and a collision aliases persistent contexts in a
 * way that looks like a balance result rather than a bug.
 *
 * `start()` then `stop()` hands the clock to the caller — probes advance via
 * `engine.tickDriver.advanceTime(dt)` through the balance harness runners, so the
 * real-time loop must not also be firing.
 */
export function buildSkirmishScratchEngine(options?: SkirmishScratchEngineOptions): Engine {
  if (options?.seed !== undefined) {
    seedRNG(options.seed);
  }
  let factions = options?.factions;
  const seats: Partial<Record<FactionId, AutomationOptions>> = { ...options?.seats };
  if (options?.a && !seats.a) seats.a = options.a;
  if (options?.b && !seats.b) seats.b = options.b;

  if (!factions) {
    if (options?.personas && Object.keys(options.personas).length > 0) {
      factions = Object.keys(options.personas);
    } else if (Object.keys(seats).length > 0) {
      factions = Object.keys(seats);
    } else {
      factions = ['a', 'b'];
    }
  }

  if (factions.length === 2 && factions[0] === 'a' && factions[1] === 'b') {
    if (!seats.a) seats.a = RUSH;
    if (!seats.b) seats.b = INVESTOR;
  }

  const { engine } = createGameEngine({
    persistenceNamespace: `skirmish-balance-${++engineCounter}`,
    maxDeltaTime: options?.maxDeltaTime,
    autoSaveInterval: 0,
    factions,
    seats,
    personas: options?.personas,
    baseRadius: options?.baseRadius,
  });
  engine.selectMod('skirmish');
  engine.start();
  engine.stop();
  engine.tryInject(MatchKey)!.start();
  return engine;
}

/** Build seat configuration for an N-faction persona matchup, optionally with jitter. */
export function seatsForTriad(
  personas: readonly [PersonaKey, PersonaKey, PersonaKey],
  factions: readonly FactionId[] = DEFAULT_TRIAD_FACTIONS,
  jitter?: number,
): SkirmishScratchEngineOptions {
  const seats: Record<FactionId, AutomationOptions> = {};
  for (let i = 0; i < factions.length; i++) {
    const f = factions[i];
    const pKey = personas[i];
    const opts = { ...PERSONAS[pKey] };
    if (jitter !== undefined) opts.cadenceJitter = jitter;
    seats[f] = opts;
  }
  return { factions, seats };
}

/** A seat pairing on the split axis, for the sweep probes. */
export function seatsAtShare(shareA: number, shareB: number): SkirmishScratchEngineOptions {
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
): SkirmishScratchEngineOptions {
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
  winner: FactionId | null;
  /** Why it ended — `'defeat'` / `'last-standing'` when a base fell, `'time-limit'` otherwise. */
  reason: string | null;
  /** Match clock at resolution, in game-seconds. */
  durationSec: number;
  /** Elimination history in chronological order. */
  eliminations: FactionElimination[];
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
  const capture: OutcomeCapture = {
    winner: null,
    reason: null,
    durationSec: 0,
    eliminations: [],
  };
  const match = engine.tryInject(MatchKey)!;
  match.on('matchEnded', (payload) => {
    if (capture.reason !== null) return; // first match only
    capture.winner = payload.outcome.winner;
    capture.reason = payload.outcome.reason;
    capture.durationSec = payload.elapsedSec;
    capture.eliminations = payload.eliminations ?? [];
  });
  return capture;
}

/** Report an {@link OutcomeCapture} as balance harness metrics for matrix runs. */
export function createOutcomeAnalyzer(capture: OutcomeCapture): Analyzer {
  return {
    id: 'skirmish-outcome',
    summarize: () => ({
      id: 'skirmish-outcome',
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
