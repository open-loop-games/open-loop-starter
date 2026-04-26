import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  createEmitHandle,
  createReset,
  createResource,
  persistent,
  subtractResource,
  tunable,
  type DecimalSource,
  type Emittable,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Reset,
  type Resource,
} from 'open-loop-engine';
import type { TugData } from '../data/types';
import { LaneKey } from './lane';
import { SequencerKey } from './units';
import { type Side, TugTuningRegistryKey } from './tuning';

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
 * up via each enumerated entry. `tug/tuning` and `tug/categories` are
 * deliberately excluded — tuning's override registry must survive match
 * resets (otherwise leaf-6 pushed scopes evaporate every match), and
 * categories holds no persistents.
 */
export const TUG_MATCH_SCOPE_MODULES: readonly string[] = [
  'tug/match',
  'tug/match/ai-opponent',
  'tug/match/lane',
  'tug/match/player/income',
  'tug/match/ai/income',
  'tug/match/player/units',
  'tug/match/ai/units',
];

/**
 * Match orchestrator. Owns per-side fortress HP resources, match outcome,
 * counter-pivot tally, time-elapsed clock, units-sent counter, and the
 * match-boundary `Reset`. Subscribes to lane fortress-reached events and to
 * both side sequencers' `'start'` events for cross-side counter-pivot
 * inference + the player units-sent counter.
 */
export function createMatchModule(data: TugData): EngineModule {
  return {
    id: 'tug/match',
    dependencies: ['tug/tuning', 'tug/match/lane', 'tug/match/player/units', 'tug/match/ai/units'],
    install(ctx) {
      const registry = ctx.inject(TugTuningRegistryKey);
      const lane = ctx.inject(LaneKey);
      const playerSequencer = ctx.inject(SequencerKey.player);
      const aiSequencer = ctx.inject(SequencerKey.ai);

      // Tunable wrap for the per-side fortress cap. Default closure reads
      // `data.balance.fortressHp`; leaf 6's tuner pushes scopes against
      // `'balance/fortressHp'` to bisect against match-duration probes.
      // Single tunable shared by both sides — fortresses are symmetric.
      const fortressMax = tunable<DecimalSource>(
        registry,
        'balance/fortressHp',
        () => data.balance.fortressHp,
      );

      // Fortress HP starts at 0 (default). `start()` initializes both sides
      // to `fortressMax.value` so a freshly-reset match runs with the
      // currently-tuned cap. Resource registry registration is automatic via
      // `createResource`.
      const fortressHp: Record<Side, Resource<DecimalSource>> = {
        player: createResource<DecimalSource>(0, {
          id: 'fortress-hp-player',
          displayName: `${data.theme.fortressName} (${data.theme.factionNames[0]})`,
        }),
        ai: createResource<DecimalSource>(0, {
          id: 'fortress-hp-ai',
          displayName: `${data.theme.fortressName} (${data.theme.factionNames[1]})`,
        }),
      };

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
        const cap = fortressMax.value;
        fortressHp.player.value = cap;
        fortressHp.ai.value = cap;
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

      // Fortress damage wiring. Lane emits with the side that REACHED the
      // opposing fortress; we decrement the OPPOSITE side's HP. When a side's
      // HP hits zero, that side loses (`'ai-win'` if player fortress fell,
      // `'player-win'` if AI fortress fell). Subscriptions live for engine
      // lifetime — no per-module cleanup hook needed.
      lane.on('fortress-reached', ({ side, damage }) => {
        if (outcome.value !== null) return;
        const target: Side = side === 'player' ? 'ai' : 'player';
        const ok = subtractResource(fortressHp[target], damage);
        if (!ok) fortressHp[target].value = 0;
        if (Decimal.lte(fortressHp[target].value, 0)) {
          end(target === 'ai' ? 'player-win' : 'ai-win');
        }
      });

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

      // Match-time clock + time-limit watcher.
      ctx.onTick((dt) => {
        if (outcome.value !== null) return;
        if (!inMatch.value) return;
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
