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
import { SkirmishTuningRegistryKey, DEFAULT_FACTIONS, type FactionId } from './tuning';
/**
 * Match spine — bone #1: a domain-free two-sided match lifecycle. Base HP, lane
 * composition and counter-pivot inference stay out of it:
 *
 *   - `start()` opens a match; `end(outcome)` closes it, idempotent.
 *   - `end()` emits `matchEnded` **before** running the match-scope reset — so
 *     subscribers (UI latch, probe outcome-capture) read final pre-reset state.
 *   - a game-time `timeLimitSec` cap ends the match on its own.
 *   - **who wins is reported from outside.** The tactical-sim / base module
 *     calls `end({ winner })` when a side's base falls; this module never reads
 *     the field. That injection seam is exactly what makes it extractable.
 *
 * RECIPE CANDIDATE (starter recipe surface — NOT the engine track): this is a
 * engine composition (a two-sided match lifecycle), not a
 * primitive gap, so it is indexed in `candidate-recipes.md`
 * for deliberate cross-archetype evaluation — deliberately not dropped in engine
 * `candidate-engine-api.md`. Skirmish is its one instance (N=1). A converged shape may later graduate
 * to a shared starter standard module or an engine consumer-guide recipe — by
 * judgment on the recipe batch, not an N=2 trigger. See that index.
 */

export interface FactionElimination {
  faction: FactionId;
  eliminatedAtSec: number;
  remainingFactions: FactionId[];
}

export type MatchOutcome =
  | { winner: FactionId; reason: 'last-standing' | 'defeat' }
  | { winner: null; reason: 'time-limit' | 'draw' };

export interface MatchEndedPayload {
  outcome: MatchOutcome;
  elapsedSec: number;
  eliminations: FactionElimination[];
}

export interface MatchEvents {
  /**
   * Fires when a match opens (synchronously inside `start()`). Battlefield /
   * tactical-sim modules subscribe to (re)initialize their own state — the
   * decoupled alternative to match reaching into them.
   */
  matchStarted: () => void;
  /** Fires when a faction's base falls, removing it from active contention. */
  factionEliminated: (payload: { faction: FactionId; elapsedSec: number }) => void;
  /** Fires once per completion, BEFORE the match-scope reset clears state. */
  matchEnded: (payload: MatchEndedPayload) => void;
}

export interface MatchApi {
  outcome: Persistent<MatchOutcome | null>;
  matchTimeElapsed: Persistent<number>;
  /** Factions currently still contending in the live match. */
  activeFactions: Persistent<FactionId[]>;
  /** Ordered history of faction eliminations. */
  eliminations: Persistent<FactionElimination[]>;
  /** True while a match is live (started AND no outcome). UI / AI check this. */
  inMatch: ComputedRef<boolean>;
  /** Open a fresh match. */
  start(): void;
  /** Eliminate a faction. If <= 1 faction remains, resolves the match. */
  eliminate(faction: FactionId): void;
  /** Close the match. Idempotent. Emits `matchEnded` then runs the reset. */
  end(outcome: MatchOutcome): void;
  /** The match-scope reset, exposed for test/debug drive-through. */
  reset: Reset;
  on: Emittable<MatchEvents>['on'];
}

export const MatchKey: InjectionKey<MatchApi> = Symbol('skirmish/match') as InjectionKey<MatchApi>;

/**
 * Persistent context ids, one per battlefield module, whose state clears at the
 * match boundary — the tactical-sim, per-side economy, and automation modules
 * are added here as they are built. Enumerated explicitly: the engine wraps each install in
 * `withPersistentContext(mod.id)` with no outer parent, so id-prefix walking
 * does NOT pick up sibling modules — each id must be listed. Ids with no
 * installed module reset nothing; the engine warns once, on the first reset.
 *
 * Deliberately NOT self-referential — `skirmish/match` is absent, and so is
 * `skirmish/tuning` (its scoped overrides must survive resets). Match
 * bookkeeping (`started`/`outcome`/`matchTimeElapsed`) is owned by
 * `start()`/`end()`, not the reset. A match module that listed itself would null
 * `outcome` at `end()`, leaving its idempotency guard dead and the latch to
 * recover the result. Keeping match out of its own scope makes `end()` genuinely
 * idempotent and `outcome` directly readable between matches; the reset scope
 * means only "clear the battlefield," never "forget who won."
 */
export const SKIRMISH_MATCH_RESET_CONTEXTS: readonly string[] = [];

export interface MatchModuleOptions {
  /** Game-time cap; match ends `time-limit` when reached. Default 30 min. */
  timeLimitSec?: number;
  /** Persistent context ids to clear at the match boundary. Default: none. */
  resetPersistentContexts?: readonly string[];
  /** Faction roster contending in the match. Defaults to DEFAULT_FACTIONS. */
  factions?: readonly FactionId[];
}

export function createMatchModule(options: MatchModuleOptions = {}): EngineModule {
  const resetPersistentContexts = options.resetPersistentContexts ?? SKIRMISH_MATCH_RESET_CONTEXTS;
  const defaultTimeLimit = options.timeLimitSec ?? 30 * 60;
  const configuredFactions = options.factions ?? DEFAULT_FACTIONS;

  return {
    id: 'skirmish/match',
    dependencies: ['skirmish/tuning'],
    install(ctx) {
      const registry = ctx.inject(SkirmishTuningRegistryKey);

      // The engine's install wrapper opens this module's persistent context, so
      // these refs are in it; the match-boundary reset never names it.
      const started = persistent<boolean>(false, { id: 'started' });
      const outcome = persistent<MatchOutcome | null>(null, { id: 'outcome' });
      const matchTimeElapsed = persistent<number>(0, { id: 'matchTimeElapsed' });
      const activeFactions = persistent<FactionId[]>([...configuredFactions], {
        id: 'activeFactions',
      });
      const eliminations = persistent<FactionElimination[]>([], { id: 'eliminations' });

      const inMatch = computed(() => started.value && outcome.value === null);

      const handle = createEmitHandle<MatchEvents>();
      const reset = createReset({ resetPersistentContexts: [...resetPersistentContexts] });

      const timeLimitSec = tunable(registry, 'match/timeLimitSec', () => defaultTimeLimit);

      function start(): void {
        // Authoritative match-bookkeeping init — this owns these fields, not
        // the reset. `outcome` carried the prior result until now.
        started.value = true;
        outcome.value = null;
        matchTimeElapsed.value = 0;
        activeFactions.value = [...configuredFactions];
        eliminations.value = [];
        // Announce the open so resource-holding modules re-init themselves.
        handle.emit('matchStarted');
      }

      function end(o: MatchOutcome): void {
        if (outcome.value !== null) return; // genuinely idempotent — outcome stays set
        outcome.value = o;
        // Emit BEFORE reset so subscribers read pre-reset battlefield state
        // (unit positions, kill tallies) that the reset is about to clear.
        handle.emit('matchEnded', {
          outcome: o,
          elapsedSec: matchTimeElapsed.value,
          eliminations: [...eliminations.value],
        });
        reset.reset();
      }

      function eliminate(faction: FactionId): void {
        if (!inMatch.value) return;
        const idx = activeFactions.value.indexOf(faction);
        if (idx === -1) return;
        const remaining = activeFactions.value.filter((f) => f !== faction);
        activeFactions.value = remaining;
        const record: FactionElimination = {
          faction,
          eliminatedAtSec: matchTimeElapsed.value,
          remainingFactions: [...remaining],
        };
        eliminations.value = [...eliminations.value, record];
        handle.emit('factionEliminated', { faction, elapsedSec: matchTimeElapsed.value });

        if (remaining.length === 1) {
          end({
            winner: remaining[0],
            reason: configuredFactions.length === 2 ? 'defeat' : 'last-standing',
          });
        } else if (remaining.length === 0) {
          end({ winner: null, reason: 'draw' });
        }
      }

      // Match clock + time-limit. Win-by-defeat is reported externally via
      // end({ winner }) or eliminate(faction); this module owns the clock-driven ending.
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
        activeFactions,
        eliminations,
        inMatch,
        start,
        eliminate,
        end,
        reset,
        on: handle.on,
      });
    },
  };
}
