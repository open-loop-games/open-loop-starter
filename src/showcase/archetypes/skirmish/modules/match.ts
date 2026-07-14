import { computed, type ComputedRef } from 'vue';
import {
  createEmitHandle,
  createReset,
  persistent,
  tunable,
  type Emittable,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Reset,
} from '@open-loop/engine';
import { SkirmishTuningRegistryKey, type Side } from './tuning';

/**
 * Match spine — bone #1, stripped from tug's `match.ts` to the reusable core.
 *
 * Everything domain-specific in tug (fortress HP, lane composition, sequencer
 * counter-pivot inference, `player-win`/`ai-win`) was *coupling*. What remains
 * is a domain-free two-sided match lifecycle:
 *
 *   - `start()` opens a match; `end(outcome)` closes it, idempotent.
 *   - `end()` emits `matchEnded` **before** running the match-scope reset — so
 *     subscribers (UI latch, sim outcome-capture) read final pre-reset state.
 *   - a wall-clock `timeLimitSec` cap ends the match on its own.
 *   - **who wins is reported from outside.** The tactical-sim / base module
 *     calls `end({ winner })` when a side's base falls; this module never reads
 *     the field. That injection seam is exactly what makes it extractable.
 *
 * RECIPE CANDIDATE (starter recipe surface — NOT the engine track): this is a
 * composition of engine primitives (a two-sided match lifecycle), not a
 * primitive gap, so it is indexed in `src/showcase/recipes/candidate-recipes.md`
 * for deliberate cross-archetype evaluation — deliberately not dropped in engine
 * `candidate-primitives.md`. tug carries a coupled copy; skirmish is the first
 * stripped, parameterized instance (N=2). A converged shape may later graduate
 * to a shared starter standard module or an engine consumer-guide recipe — by
 * judgment on the recipe batch, not an N=2 trigger. See that index.
 */

export type MatchOutcome =
  | { winner: Side; reason: 'defeat' }
  | { winner: null; reason: 'time-limit' };

export interface MatchEndedPayload {
  outcome: MatchOutcome;
  elapsedSec: number;
}

export interface MatchEvents {
  /**
   * Fires when a match opens (synchronously inside `start()`). Battlefield /
   * tactical-sim modules subscribe to (re)initialize their own state — the
   * decoupled alternative to match reaching into them. Load-bearing because
   * `createReset` restores `persistent()` refs but NOT `createResource`
   * resources, so resource-holding modules must re-init themselves here.
   */
  matchStarted: () => void;
  /** Fires once per completion, BEFORE the match-scope reset clears state. */
  matchEnded: (payload: MatchEndedPayload) => void;
}

export interface MatchApi {
  outcome: Persistent<MatchOutcome | null>;
  matchTimeElapsed: Persistent<number>;
  /** True while a match is live (started AND no outcome). UI / AI gate on this. */
  inMatch: ComputedRef<boolean>;
  /** Open a fresh match. */
  start(): void;
  /** Close the match. Idempotent. Emits `matchEnded` then runs the reset. */
  end(outcome: MatchOutcome): void;
  /** The match-scope reset, exposed for test/debug drive-through. */
  reset: Reset;
  on: Emittable<MatchEvents>['on'];
}

export const MatchKey: InjectionKey<MatchApi> = Symbol('skirmish/match') as InjectionKey<MatchApi>;

/**
 * Battlefield module ids whose persistent state clears at match boundary — the
 * tactical-sim, per-side economy, and automation modules join here as they
 * land. Enumerated explicitly: the engine wraps each install in
 * `withPersistentContext(mod.id)` with no outer parent, so id-prefix walking
 * does NOT pick up sibling modules — each id must be listed. Ids with no
 * installed module are harmless (`getModulePersistentRefs` returns empty).
 *
 * Deliberately NOT self-referential — `skirmish/match` is absent, and so is
 * `skirmish/tuning` (its override scopes must survive resets). Match
 * bookkeeping (`started`/`outcome`/`matchTimeElapsed`) is owned by
 * `start()`/`end()`, not the reset. This is the one intentional divergence
 * from tug, which lists its own match module and thereby nulls `outcome` at
 * `end()` — that makes tug's idempotency guard dead and forces the latch to
 * recover the result. Keeping match out of its own scope makes `end()` genuinely
 * idempotent and `outcome` directly readable between matches; the reset scope
 * means only "clear the battlefield," never "forget who won."
 */
export const SKIRMISH_MATCH_SCOPE_MODULES: readonly string[] = [];

export interface MatchModuleOptions {
  /** Wall-clock cap; match ends `time-limit` when reached. Default 30 min. */
  timeLimitSec?: number;
  /** Match-scope module ids to clear on boundary. Default: this module only. */
  resetModules?: readonly string[];
}

export function createMatchModule(options: MatchModuleOptions = {}): EngineModule {
  const resetModules = options.resetModules ?? SKIRMISH_MATCH_SCOPE_MODULES;
  const defaultTimeLimit = options.timeLimitSec ?? 30 * 60;

  return {
    id: 'skirmish/match',
    dependencies: ['skirmish/tuning'],
    install(ctx) {
      const registry = ctx.inject(SkirmishTuningRegistryKey);

      // Persistents are auto-scoped to this module id by the engine's install
      // wrapper, so the match-boundary reset clears exactly these.
      const started = persistent<boolean>(false, { name: 'started' });
      const outcome = persistent<MatchOutcome | null>(null, { name: 'outcome' });
      const matchTimeElapsed = persistent<number>(0, { name: 'matchTimeElapsed' });

      const inMatch = computed(() => started.value && outcome.value === null);

      const handle = createEmitHandle<MatchEvents>();
      const reset = createReset({ resetModules: [...resetModules] });

      const timeLimitSec = tunable(registry, 'match/timeLimitSec', () => defaultTimeLimit);

      function start(): void {
        // Authoritative match-bookkeeping init — this owns these fields, not
        // the reset. `outcome` carried the prior result until now.
        started.value = true;
        outcome.value = null;
        matchTimeElapsed.value = 0;
        // Announce the open so resource-holding modules re-init themselves.
        handle.emit('matchStarted');
      }

      function end(o: MatchOutcome): void {
        if (outcome.value !== null) return; // genuinely idempotent — outcome persists
        outcome.value = o;
        // Emit BEFORE reset so subscribers read pre-reset battlefield state
        // (unit positions, kill tallies) that the reset is about to clear.
        handle.emit('matchEnded', { outcome: o, elapsedSec: matchTimeElapsed.value });
        reset.reset();
      }

      // Match clock + time-limit. Win-by-defeat is reported externally via
      // end({ winner }); this module owns only the clock-driven ending.
      ctx.onTick((dt) => {
        if (!inMatch.value) return;
        matchTimeElapsed.value += dt;
        if (matchTimeElapsed.value >= timeLimitSec.value) {
          end({ winner: null, reason: 'time-limit' });
        }
      });

      ctx.provide(MatchKey, {
        outcome,
        matchTimeElapsed,
        inMatch,
        start,
        end,
        reset,
        on: handle.on,
      });
    },
  };
}
