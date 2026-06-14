import type { ComputedRef } from 'vue';
import {
  createResource,
  tunable,
  type DecimalSource,
  type EngineModule,
  type Resource,
} from '@open-loop/engine';
import type { TugData } from '../data/types';
import type { UnitInstance } from './lane';
import { LANE_LENGTH, type Side, TugTuningRegistryKey } from './tuning';

export interface FortressApi {
  /** Per-side fortress HP. Match.ts watches this for end-of-match
   *  detection; lane.ts decrements via the unit's `hp` accessor when
   *  opposing units damage it in the combat loop. */
  hp: Record<Side, Resource<DecimalSource>>;
  /** Per-side fortress unit. Satisfies the lane's `UnitInstance` shape so
   *  the engagement + combat loops can iterate over it uniformly with
   *  regular units. The `hp` field is a getter/setter accessor against
   *  the corresponding `hp` Resource — combat's `u.hp -= dmg` reads/writes
   *  the resource without lane needing to special-case fortresses for
   *  damage routing. */
  unit: Record<Side, UnitInstance>;
  /** Tunable hp max. UI reads for bar scale; `start()` reads for initial
   *  hp on each match boundary. */
  max: ComputedRef<DecimalSource>;
  /** Initialize both fortresses' hp to `max.value`. Called from
   *  `match.start()` after the match-scope reset clears match state. */
  start(): void;
}

let fortress: FortressApi;

export function getFortress(): FortressApi {
  return fortress;
}

/**
 * Fortress module. Per the fortress-as-unit engagement model, each side's
 * fortress is an immobile `UnitInstance` at the lane endpoint that
 * opposing units engage and damage like any other opposing unit. This
 * module owns the per-side hp Resource and constructs the unit objects;
 * lane.ts and match.ts read via `getFortress()` for engagement + combat
 * and end-of-match detection respectively.
 *
 * 3c topology — sits between `tuning` (deps) and `lane` / `match`
 * (consumers). No cycle: lane and match both read fortress; fortress
 * reads only tuning. Match-scope reset enumerates this module so hp
 * resets to 0 between matches; `start()` re-initializes to `max.value`.
 */
export function createFortressModule(data: TugData): EngineModule {
  return {
    id: 'tug/match/fortress',
    dependencies: ['tug/tuning'],
    install(ctx) {
      const registry = ctx.inject(TugTuningRegistryKey);

      // Tunable wrap for the per-side fortress cap. Default closure reads
      // `data.fortress.hp`; leaf 6's tuner pushes scopes against
      // `'fortress/hp'` to bisect against match-duration probes. Single
      // tunable shared by both sides — fortresses are symmetric.
      const max = tunable<DecimalSource>(registry, 'fortress/hp', () => data.fortress.hp);

      const hp: Record<Side, Resource<DecimalSource>> = {
        player: createResource<DecimalSource>(0, {
          id: 'fortress-hp-player',
          displayName: 'Nexus (Terran)',
        }),
        ai: createResource<DecimalSource>(0, {
          id: 'fortress-hp-ai',
          displayName: 'Nexus (Protoss)',
        }),
      };

      const unit: Record<Side, UnitInstance> = {
        player: createFortressUnit('player', hp.player),
        ai: createFortressUnit('ai', hp.ai),
      };

      function start(): void {
        hp.player.value = max.value;
        hp.ai.value = max.value;
        // Clear lingering engagement on the unit objects. They're not
        // persistent; this only matters within a session if a previous
        // match left a stale engagedWith pointer.
        unit.player.engagedWith = undefined;
        unit.ai.engagedWith = undefined;
      }

      fortress = { hp, unit, max, start };
    },
  };
}

/**
 * Build a fortress UnitInstance whose `hp` field accessor delegates to
 * the corresponding hp Resource. Lane combat does `u.hp -= dmg` uniformly
 * across regular units and fortresses — for a fortress, that read-modify-
 * write routes through the resource's reactive setter (clamped at 0).
 */
function createFortressUnit(side: Side, hpRes: Resource<DecimalSource>): UnitInstance {
  const position = side === 'player' ? 0 : LANE_LENGTH;
  return {
    id: `fortress-${side}`,
    archetypeId: 'fortress',
    position,
    side,
    get hp(): number {
      return Number(hpRes.value);
    },
    set hp(v: number) {
      hpRes.value = Math.max(0, v);
    },
  };
}
