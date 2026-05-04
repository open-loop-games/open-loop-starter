import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  createEmitHandle,
  createReset,
  persistent,
  type DecimalSource,
  type Emittable,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Reset,
  type Resource,
} from 'open-loop-engine';
import type { TugData } from '../data/types';
import { FortressKey } from './fortress';
import { LaneKey } from './lane';
import { SequencerKey } from './units';
import { type Side } from './tuning';

export type MatchOutcome = 'player-win' | 'ai-win' | 'time-limit' | null;

export interface MatchEndedPayload {
  outcome: NonNullable<MatchOutcome>;
  counterPivots: number;
  unitsSent: number;
  elapsedSec: number;
}

export interface MatchEvents {
  /** Fires once per match completion, BEFORE the match-scope reset clears
   *  match state. Subscribers (meta.ts) see the final pre-reset values. */
  matchEnded: (payload: MatchEndedPayload) => void;
}

export interface MatchApi {
  fortressHp: Record<Side, Resource<DecimalSource>>;
  outcome: Persistent<MatchOutcome>;
  matchTimeElapsed: Persistent<number>;
  counterPivotsThisMatch: Persistent<number>;
  unitsSentByPlayer: Persistent<number>;
  /** Live state — true while a match is in progress (outcome === null AND
   *  fortresses initialized). UI / AI policy gate on this. */
  inMatch: ComputedRef<boolean>;
  /** Initialize a fresh match: fortress HP to the tunable max, outcome null. */
  start(): void;
  /** Force-end with a given outcome. Idempotent — second call with outcome
   *  already set is a no-op. Emits `'matchEnded'` then triggers the reset. */
  end(outcome: NonNullable<MatchOutcome>): void;
  /** The match-scope reset itself, exposed so test/debug surfaces can drive
   *  it without the full end() path. Production code calls end(). */
  reset: Reset;
  on: Emittable<MatchEvents>['on'];
}

export const MatchKey: InjectionKey<MatchApi> = Symbol('tug/match') as InjectionKey<MatchApi>;

/**
 * Module ids whose persistent state is reset at match boundary. Engine wraps
 * each module's install in `withPersistentContext(mod.id, ...)` with NO outer
 * parent context, so `getModulePersistentRefs('tug/match')` does NOT walk
 * sibling modules by id-prefix alone — `contextChildren['tug/match']` stays
 * empty. We enumerate each module id explicitly. Sub-contexts created INSIDE
 * each install (sequencer ids, per-def category contexts) DO get parent
 * linkage to that module's id at registration time, so the walk picks them
 * up via each enumerated entry. `tug/tuning` is deliberately excluded — its
 * override registry must survive match resets (otherwise leaf-6 pushed
 * scopes evaporate every match).
 */
export const TUG_MATCH_SCOPE_MODULES: readonly string[] = [
  'tug/match',
  'tug/match/fortress',
  'tug/match/lane',
  'tug/match/player/income',
  'tug/match/ai/income',
  'tug/match/player/income-upgrades',
  'tug/match/ai/income-upgrades',
  'tug/match/player/units',
  'tug/match/ai/units',
  // Per-side opponent bot. Production installs only the `'ai'` instance;
  // `buildTugSimEngine` adds the `'player'` instance for unattended balance
  // harnesses. Enumerating both is safe — `getModulePersistentRefs` returns
  // empty for ids with no installed module.
  'tug/match/player/opponent-bot',
  'tug/match/ai/opponent-bot',
];

/**
 * Match orchestrator. Owns match outcome, counter-pivot tally, time-elapsed
 * clock, units-sent counter, and the match-boundary `Reset`. Reads fortress
 * HP from `FortressKey` (3c topology — fortress module owns the resources)
 * and ends the match when either side's HP falls to 0. Subscribes to both
 * side sequencers' `'start'` events for cross-side counter-pivot inference +
 * the player units-sent counter.
 */
export function createMatchModule(data: TugData): EngineModule {
  return {
    id: 'tug/match',
    dependencies: [
      'tug/tuning',
      'tug/match/fortress',
      'tug/match/lane',
      'tug/match/player/units',
      'tug/match/ai/units',
    ],
    install(ctx) {
      const lane = ctx.inject(LaneKey);
      const fortress = ctx.inject(FortressKey);
      const playerSequencer = ctx.inject(SequencerKey.player);
      const aiSequencer = ctx.inject(SequencerKey.ai);

      // Fortress HP and the tunable hp max live in the fortress module
      // (3c topology) — match injects via `FortressKey` so both lane (for
      // engagement + damage) and match (for end-of-match detection) read
      // the same per-side resources. Match-scope reset clears these via
      // `TUG_MATCH_SCOPE_MODULES`; `start()` re-initializes through
      // `fortress.start()`.
      const fortressHp = fortress.hp;

      const outcome = persistent<MatchOutcome>(null, { name: 'outcome' });
      const matchTimeElapsed = persistent<number>(0, { name: 'matchTimeElapsed' });
      const counterPivotsThisMatch = persistent<number>(0, { name: 'counterPivotsThisMatch' });
      const unitsSentByPlayer = persistent<number>(0, { name: 'unitsSentByPlayer' });

      const inMatch = computed(
        () =>
          outcome.value === null &&
          (Decimal.gt(fortressHp.player.value, 0) || Decimal.gt(fortressHp.ai.value, 0)),
      );

      const handle = createEmitHandle<MatchEvents>();

      // Match-boundary reset. Listed module ids are enumerated explicitly
      // because the engine doesn't establish parent-child linkage between
      // sibling modules at install time — see TUG_MATCH_SCOPE_MODULES comment.
      const reset = createReset({
        resetModules: [...TUG_MATCH_SCOPE_MODULES],
      });

      function start(): void {
        // Fortress hp init lives in the fortress module — keeps the
        // resource owner authoritative for its own initialization.
        fortress.start();
        // outcome / matchTimeElapsed / counters all sit at default after the
        // most-recent reset; explicit zero-set is redundant but harmless on
        // an initial-boot start() before any match has run.
        outcome.value = null;
        matchTimeElapsed.value = 0;
        counterPivotsThisMatch.value = 0;
        unitsSentByPlayer.value = 0;
      }

      function end(o: NonNullable<MatchOutcome>): void {
        if (outcome.value !== null) return; // idempotent
        outcome.value = o;
        // Emit BEFORE reset so meta.ts reads pre-reset counterPivotsThisMatch.
        handle.emit('matchEnded', {
          outcome: o,
          counterPivots: counterPivotsThisMatch.value,
          unitsSent: unitsSentByPlayer.value,
          elapsedSec: matchTimeElapsed.value,
        });
        reset.reset();
      }

      // End-of-match detection. With fortress-as-unit, lane mutates
      // `fortress.hp[side]` directly via the fortress unit's hp accessor
      // when opposing units damage it in combat. Match doesn't subscribe
      // to a `fortress-reached` event anymore — instead, the per-tick
      // watcher below polls hp ≤ 0 and triggers `end()`. Polling beats a
      // Vue `watch()` here since we already have an onTick hook for
      // match-time elapsed; one effect chain instead of two.

      // Counter-pivot inference. Detection is intentionally placeholder —
      // simple "buy strong-counters AI's current dominant archetype"
      // instantaneous check, no time window. Window + dominance threshold
      // are leaf-6 tunables; revisit when the Tier-C bisect surfaces a real
      // shape. unitsSentByPlayer also accumulates here so the meta-off arc
      // predicate has a consistent counter source.
      const idxOf = new Map<string, number>();
      for (let i = 0; i < data.units.length; i++) idxOf.set(data.units[i].id, i);

      function dominantArchetype(s: Side): string | null {
        const arr = lane.units[s].value;
        if (arr.length === 0) return null;
        const counts = new Map<string, number>();
        for (const u of arr) counts.set(u.archetypeId, (counts.get(u.archetypeId) ?? 0) + 1);
        let bestId: string | null = null;
        let bestCount = 0;
        for (const [id, c] of counts) {
          if (c > bestCount) {
            bestId = id;
            bestCount = c;
          }
        }
        // Require ≥2 to count as dominance — a single unit is noise.
        return bestCount >= 2 ? bestId : null;
      }

      playerSequencer.on('start', (item) => {
        if (outcome.value !== null) return;
        unitsSentByPlayer.value += 1;
        const dom = dominantArchetype('ai');
        if (!dom) return;
        const pIdx = idxOf.get(item.metadata.archetypeId);
        const dIdx = idxOf.get(dom);
        if (pIdx === undefined || dIdx === undefined) return;
        // Strong-counter cell defined as > 1.0 (default-data strong is 1.75,
        // weak is 0.6, neutral is 1.0). Threshold sits in the data layer
        // implicitly via the matrix shape.
        if (data.counterMatrix[pIdx][dIdx] > 1) counterPivotsThisMatch.value += 1;
      });

      // AI sequencer subscription is a placeholder hook — leaf 6's tuner may
      // want to detect AI-side counter-pivots for symmetric difficulty
      // measurement. No-op for now; subscribed so the wiring is in place.
      aiSequencer.on('start', () => {});

      // Match-time clock + fortress-fall + time-limit watcher.
      ctx.onTick((dt) => {
        if (outcome.value !== null) return;
        if (!inMatch.value) return;
        // Fortress fell? The side whose fortress hits 0 loses. Lane
        // damages the resources directly each tick via the fortress
        // unit's hp accessor; we just observe.
        if (Decimal.lte(fortressHp.player.value, 0)) {
          end('ai-win');
          return;
        }
        if (Decimal.lte(fortressHp.ai.value, 0)) {
          end('player-win');
          return;
        }
        matchTimeElapsed.value += dt;
        const limitMin = data.balance.matchTimeLimitMinutes;
        if (limitMin > 0 && matchTimeElapsed.value >= limitMin * 60) {
          end('time-limit');
        }
      });

      const api: MatchApi = {
        fortressHp,
        outcome,
        matchTimeElapsed,
        counterPivotsThisMatch,
        unitsSentByPlayer,
        inMatch,
        start,
        end,
        reset,
        on: handle.on,
      };
      ctx.provide(MatchKey, api);
    },
  };
}
