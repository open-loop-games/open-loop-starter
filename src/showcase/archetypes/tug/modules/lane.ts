import { computed, type ComputedRef } from 'vue';
import {
  createEmitHandle,
  persistent,
  tunable,
  type Emittable,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import type { TugData, UnitArchetypeTag } from '../data/types';
import { getFortress } from './fortress';
import { LANE_LENGTH, SIDES, type Side, TugTuningRegistryKey } from './tuning';

/** Engagement radius — opposing units within this distance acquire each
 *  other as engagement targets and trade combat damage each tick.
 *  Structural; if combat dynamics need retuning, this graduates to a
 *  tunable surface in the registry. */
const ENGAGE_RADIUS = 2;

/** archetypeId sentinel for fortress UnitInstances. The fortress unit's
 *  archetypeId is `'fortress'` rather than a `data.units` id, so combat
 *  branches off this string to apply fortress damage / resistance lookup
 *  instead of counter-matrix indexing. */
const FORTRESS_ARCHETYPE = 'fortress';

/**
 * One unit instance on the lane. Lane mutates `position`, `hp`, and
 * `engagedWith` per tick; `id` is generated at spawn so save/load
 * round-trips identify the same instance. `archetypeId` keys into
 * `data.units` (and the side-local matrix-index map) for damage +
 * counter-matrix lookups.
 *
 * `engagedWith` carries the id of the opposing unit this unit is locked
 * onto. While set, the unit stops walking (front-line semantics: stop and
 * fight). Targets are sticky — re-acquisition only happens after the
 * current target dies or leaves range.
 */
export interface UnitInstance {
  id: string;
  archetypeId: string;
  /** Lane position in lane-units. Player spawns at 0 and walks +; AI spawns
   *  at `LANE_LENGTH` and walks −. */
  position: number;
  hp: number;
  side: Side;
  /** Id of the opposing unit this one is engaged with. Walk movement is
   *  blocked while set. */
  engagedWith?: string;
}

export interface LaneEvents {
  /** A unit was spawned into the lane. Mirrors `'unit-killed'`. Fortress
   *  units don't pass through `lane.spawn()` (they live in the fortress module)
   *  so this fires only for unit-archetype spawns. */
  'unit-spawned': (payload: { side: Side; archetypeId: string }) => void;
  /** A unit's hp dropped to ≤0 in combat. Currently unused by leaf-4 wiring;
   *  exposed so VFX / scoring can subscribe without further engine ceremony.
   *  Fortress units (`archetypeId === 'fortress'`) do not emit this — match
   *  end-of-match detection watches the fortress hp resource directly. */
  'unit-killed': (payload: { side: Side; archetypeId: string }) => void;
}

export interface LaneApi {
  /** Per-side unit arrays. Persistent so positions + hp survive save/load
   *  mid-match. */
  units: Record<Side, Persistent<UnitInstance[]>>;
  /** Frontmost position per side. 0 when the side has no units; for AI side
   *  this means the closest-to-AI-fortress unit (lowest position). */
  frontline: Record<Side, ComputedRef<number>>;
  /** Total lane length in lane-units. Exposed so UI can normalize positions
   *  to 0..1. */
  laneLength: number;
  /** Spawn a unit. Player spawns at 0, AI at `laneLength`. Called by
   *  `units.ts` on the sequencer's `'started'` event. */
  spawn(side: Side, archetypeId: string): void;
  /** Subscribe to lane events. Leaf-4 `match.ts` and `opponent-bot.ts` consume. */
  on: Emittable<LaneEvents>['on'];
}

export const LaneKey: InjectionKey<LaneApi> = Symbol('tug/match/lane') as InjectionKey<LaneApi>;

/**
 * Lane is a single shared module — both sides' unit arrays + cross-side
 * combat live here. Per-side mirrored-instance pattern (`units.ts`,
 * `income.ts`) doesn't fit lane.ts: combat needs both arrays simultaneously,
 * and a per-side factory plus a separate cross-side combat module would
 * either cycle through dependencies or add an extra module without earning
 * it. The lane *is* one shared spatial substrate; units come from each side,
 * but the axis itself is one thing.
 *
 * The `TODO(expansion)` mirrored-instance marker lives in `units.ts` (which
 * remains per-side) — accurate for the engine
 * `candidate-primitives.md::createSymmetricModuleSet` graduation trigger.
 */
export function createLaneModule(data: TugData): EngineModule {
  return {
    id: 'tug/match/lane',
    dependencies: ['tug/tuning', 'tug/match/fortress'],
    install(ctx) {
      const registry = ctx.inject(TugTuningRegistryKey);
      const fortress = getFortress();

      // Counter-matrix sharpness scalars. Default 1.0 is identity (no
      // perturbation). Leaf 6's tuner pushes scopes to compress/expand the
      // strong/weak gap against the counter-pivot success-rate beat target.
      const strongCounter = tunable(registry, 'counter-matrix/strongCounter', () => 1);
      const weakCounter = tunable(registry, 'counter-matrix/weakCounter', () => 1);

      // archetypeId → matrix-index. `data.units` order is load-bearing
      // (fixes counter-matrix row/column order; see data/units.ts comment).
      const idxOf = new Map<string, number>();
      for (let i = 0; i < data.units.length; i++) idxOf.set(data.units[i].id, i);

      // archetypeId → archetypeTag, for fortress-resistance lookup when
      // the defender is a fortress (skips counter-matrix entirely).
      const tagOf = new Map<string, UnitArchetypeTag>();
      for (const u of data.units) tagOf.set(u.id, u.archetypeTag);

      const units: Record<Side, Persistent<UnitInstance[]>> = {
        player: persistent<UnitInstance[]>([], { id: 'player-units' }),
        ai: persistent<UnitInstance[]>([], { id: 'ai-units' }),
      };

      const frontline: Record<Side, ComputedRef<number>> = {
        player: computed(() => maxPosition(units.player.value)),
        ai: computed(() => minPosition(units.ai.value, LANE_LENGTH)),
      };

      const handle = createEmitHandle<LaneEvents>();

      // Monotonic counter for unit-instance ids. Persistent so save/load
      // never collides freshly-spawned units with re-hydrated ones.
      const nextUnitId = persistent<number>(0, { id: 'next-unit-id' });

      function spawn(side: Side, archetypeId: string): void {
        const def = data.units.find((u) => u.id === archetypeId);
        if (!def) throw new Error(`tug/lane.spawn: unknown archetypeId "${archetypeId}"`);
        const position = side === 'player' ? 0 : LANE_LENGTH;
        const id = `${side}-${archetypeId}-${nextUnitId.value++}`;
        units[side].value = [...units[side].value, { id, archetypeId, position, hp: def.hp, side }];
        handle.emit('unit-spawned', { side, archetypeId });
      }

      ctx.onTick((dt) => {
        const strong = Number(strongCounter.value);
        const weak = Number(weakCounter.value);
        const fortressDmg = Number(data.fortress.damagePerHit);

        const playerArr = units.player.value;
        const aiArr = units.ai.value;

        // Opposing-target views — regular units plus the opposing
        // fortress. Engagement and combat loops iterate these uniformly so
        // a fortress is just-another opposing unit (stop-on-engage works,
        // all-pairs damage applies). Per-tick array allocs are negligible
        // at typical lane unit counts.
        const playerTargets: UnitInstance[] = [...playerArr, fortress.unit.player];
        const aiTargets: UnitInstance[] = [...aiArr, fortress.unit.ai];

        // 1) Validate prior engagements. Clear `engagedWith` if the target
        //    is dead, removed, or out of range. Fortress engagement clears
        //    when fortress hp ≤ 0, which is what triggers the
        //    end-of-match cleanup walk in step 3.
        for (const side of SIDES) {
          const arr = units[side].value;
          if (arr.length === 0) continue;
          const opp = side === 'player' ? aiTargets : playerTargets;
          for (const u of arr) {
            if (u.engagedWith == null) continue;
            const target = opp.find((t) => t.id === u.engagedWith);
            if (
              !target ||
              target.hp <= 0 ||
              Math.abs(u.position - target.position) > ENGAGE_RADIUS
            ) {
              u.engagedWith = undefined;
            }
          }
        }

        // 2) Acquire engagements. Any un-engaged living unit picks the first
        //    opposing target found in range — including the opposing
        //    fortress — as its sticky engagement. Acquisition is symmetric:
        //    if the target has no engagement yet, it locks back onto this
        //    unit. Fortresses receive the back-link too (harmless; they
        //    don't move and don't act on engagedWith). We iterate
        //    `units[side]` rather than `*Targets` since fortresses don't
        //    initiate engagement — they only get engaged.
        for (const p of playerArr) {
          if (p.hp <= 0 || p.engagedWith != null) continue;
          for (const a of aiTargets) {
            if (a.hp <= 0) continue;
            if (Math.abs(p.position - a.position) > ENGAGE_RADIUS) continue;
            p.engagedWith = a.id;
            if (a.engagedWith == null) a.engagedWith = p.id;
            break;
          }
        }
        for (const a of aiArr) {
          if (a.hp <= 0 || a.engagedWith != null) continue;
          for (const p of playerTargets) {
            if (p.hp <= 0) continue;
            if (Math.abs(p.position - a.position) > ENGAGE_RADIUS) continue;
            a.engagedWith = p.id;
            if (p.engagedWith == null) p.engagedWith = a.id;
            break;
          }
        }

        // 3) Walk un-engaged units. Engaged units stop and fight — that's
        //    what turns the front line into a real thing the simulation
        //    tracks. Position clamps at lane bounds so a unit walking past
        //    a destroyed fortress (engagement cleared, no enemy in front)
        //    doesn't fly off the lane edge before match-scope reset wipes
        //    it.
        for (const side of SIDES) {
          const arr = units[side].value;
          if (arr.length === 0) continue;
          const dir = side === 'player' ? 1 : -1;
          for (const u of arr) {
            if (u.hp <= 0) continue;
            if (u.engagedWith != null) continue;
            const def = data.units.find((d) => d.id === u.archetypeId);
            if (!def) continue;
            u.position += dir * def.walkSpeed * dt;
            if (u.position < 0) u.position = 0;
            else if (u.position > LANE_LENGTH) u.position = LANE_LENGTH;
          }
        }

        // 4) Cross-side combat. Damage applies to all opposing pairs in
        //    range — not just the sticky engagement target — so a tank
        //    surrounded by three marines takes damage from all three.
        //    Damage formula branches by attacker/defender shape:
        //
        //    - unit → unit:     attDef.damagePerHit × matrix[att][def] × dt
        //    - unit → fortress: attDef.damagePerHit × resistance[attTag] × dt
        //    - fortress → unit: data.fortress.damagePerHit × dt (no matrix)
        //    - fortress → fortress: impossible (positions are 0 vs LANE_LENGTH)
        for (const p of playerTargets) {
          if (p.hp <= 0) continue;
          for (const a of aiTargets) {
            if (a.hp <= 0) continue;
            if (Math.abs(p.position - a.position) > ENGAGE_RADIUS) continue;
            a.hp -= damageFrom(p, a, dt);
            p.hp -= damageFrom(a, p, dt);
          }
        }

        // 5) Resolve unit-killed. Filter dead entries out of each side's
        //    units array; emit events as we drop them. Fortresses live in
        //    a separate slot (the fortress module) and are NOT removed — when a
        //    fortress hp hits 0, match.ts watches the resource and ends
        //    the match, then the match-scope reset wipes everything.
        //    Reassigning the `.value` array refreshes Vue dependents
        //    (frontline computeds, consumer composables).
        for (const side of SIDES) {
          const arr = units[side].value;
          if (arr.length === 0) continue;
          const survivors: UnitInstance[] = [];
          for (const u of arr) {
            if (u.hp <= 0) {
              handle.emit('unit-killed', { side: u.side, archetypeId: u.archetypeId });
              continue;
            }
            survivors.push(u);
          }
          if (survivors.length !== arr.length) {
            units[side].value = survivors;
          }
        }

        // Damage helper — closes over the current tick's strong/weak
        // perturbation scalars + fortressDmg; defined inside the tick to
        // capture them without a per-call lookup.
        function damageFrom(attacker: UnitInstance, defender: UnitInstance, dt: number): number {
          if (attacker.archetypeId === FORTRESS_ARCHETYPE) {
            // Fortress return-fire is flat; no matrix, no per-target
            // resistance (the defender is a unit, not a fortress).
            return fortressDmg * dt;
          }
          const attDef = data.units.find((d) => d.id === attacker.archetypeId);
          if (!attDef) return 0;
          if (defender.archetypeId === FORTRESS_ARCHETYPE) {
            const tag = tagOf.get(attacker.archetypeId);
            const resist = tag != null ? (data.fortress.resistance[tag] ?? 1) : 1;
            return attDef.damagePerHit * resist * dt;
          }
          const attIdx = idxOf.get(attacker.archetypeId);
          const defIdx = idxOf.get(defender.archetypeId);
          if (attIdx === undefined || defIdx === undefined) return 0;
          const cell = adjustCell(data.counterMatrix[attIdx][defIdx], strong, weak);
          return attDef.damagePerHit * cell * dt;
        }
      });

      const api: LaneApi = {
        units,
        frontline,
        laneLength: LANE_LENGTH,
        spawn,
        on: handle.on,
      };
      ctx.provide(LaneKey, api);
    },
  };
}

function adjustCell(cell: number, strong: number, weak: number): number {
  if (cell > 1) return cell * strong;
  if (cell < 1) return cell * weak;
  return cell;
}

function maxPosition(arr: ReadonlyArray<UnitInstance>): number {
  if (arr.length === 0) return 0;
  let max = arr[0].position;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].position > max) max = arr[i].position;
  }
  return max;
}

function minPosition(arr: ReadonlyArray<UnitInstance>, fallback: number): number {
  if (arr.length === 0) return fallback;
  let min = arr[0].position;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].position < min) min = arr[i].position;
  }
  return min;
}
