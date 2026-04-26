import { computed, type ComputedRef } from 'vue';
import {
  createEmitHandle,
  persistent,
  tunable,
  type DecimalSource,
  type Emittable,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from 'open-loop-engine';
import type { TugData } from '../data/types';
import { SIDES, type Side, TugTuningRegistryKey } from './tuning';

/** Length of the lane in lane-units. Direct-Strike-typical fixed length;
 *  structural, not a tunable. Both sides' units traverse this axis. */
const LANE_LENGTH = 100;

/** Engagement radius — opposing units within this distance trade combat
 *  damage each tick. Structural; if combat dynamics need retuning, that
 *  becomes a `data/balance.ts` field, not a hidden constant. */
const ENGAGE_RADIUS = 2;

/**
 * One unit instance on the lane. Lane mutates `position` and `hp` per tick;
 * `id` is generated at spawn so save/load round-trips identify the same
 * instance. `archetypeId` keys into `data.units` (and the side-local
 * matrix-index map) for damage + counter-matrix lookups.
 */
export interface UnitInstance {
  id: string;
  archetypeId: string;
  /** Lane position in lane-units. Player spawns at 0 and walks +; AI spawns
   *  at `LANE_LENGTH` and walks −. */
  position: number;
  hp: number;
  side: Side;
}

export interface LaneEvents {
  /** A unit reached the opposing fortress. Leaf-4 `match.ts` subscribes and
   *  decrements that side's `fortressHp` by `damage`. */
  'fortress-reached': (payload: { side: Side; archetypeId: string; damage: number }) => void;
  /** A unit's hp dropped to ≤0 in combat. Currently unused by leaf-4 wiring;
   *  exposed so VFX / scoring can hook in without further engine ceremony. */
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
   *  `units.ts` on the sequencer's `'start'` event. */
  spawn(side: Side, archetypeId: string): void;
  /** Subscribe to lane events. Leaf-4 `match.ts` and `ai-opponent.ts` consume. */
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
    dependencies: ['tug/tuning'],
    install(ctx) {
      const registry = ctx.inject(TugTuningRegistryKey);

      // Counter-matrix sharpness scalars. Default 1.0 is identity (no
      // perturbation). Leaf 6's tuner pushes scopes to compress/expand the
      // strong/weak gap against the counter-pivot success-rate beat target.
      const strongCounter = tunable<DecimalSource>(
        registry,
        'counter-matrix/strongCounter',
        () => 1,
      );
      const weakCounter = tunable<DecimalSource>(registry, 'counter-matrix/weakCounter', () => 1);

      // archetypeId → matrix-index. `data.units` order is load-bearing
      // (fixes counter-matrix row/column order; see data/units.ts comment).
      const idxOf = new Map<string, number>();
      for (let i = 0; i < data.units.length; i++) idxOf.set(data.units[i].id, i);

      const units: Record<Side, Persistent<UnitInstance[]>> = {
        player: persistent<UnitInstance[]>([], { name: 'player-units' }),
        ai: persistent<UnitInstance[]>([], { name: 'ai-units' }),
      };

      const frontline: Record<Side, ComputedRef<number>> = {
        player: computed(() => maxPosition(units.player.value)),
        ai: computed(() => minPosition(units.ai.value, LANE_LENGTH)),
      };

      const handle = createEmitHandle<LaneEvents>();

      // Monotonic counter for unit-instance ids. Persistent so save/load
      // never collides freshly-spawned units with re-hydrated ones.
      const nextUnitId = persistent<number>(0, { name: 'next-unit-id' });

      function spawn(side: Side, archetypeId: string): void {
        const def = data.units.find((u) => u.id === archetypeId);
        if (!def) throw new Error(`tug/lane.spawn: unknown archetypeId "${archetypeId}"`);
        const position = side === 'player' ? 0 : LANE_LENGTH;
        const id = `${side}-${archetypeId}-${nextUnitId.value++}`;
        units[side].value = [...units[side].value, { id, archetypeId, position, hp: def.hp, side }];
      }

      ctx.onTick((dt) => {
        const strong = Number(strongCounter.value);
        const weak = Number(weakCounter.value);

        // 1) Walk units. Player toward LANE_LENGTH, AI toward 0.
        for (const side of SIDES) {
          const arr = units[side].value;
          if (arr.length === 0) continue;
          const dir = side === 'player' ? 1 : -1;
          for (const u of arr) {
            const def = data.units.find((d) => d.id === u.archetypeId);
            if (!def) continue;
            u.position += dir * def.walkSpeed * dt;
          }
        }

        // 2) Cross-side combat. Pairs within ENGAGE_RADIUS trade damage in
        //    both directions, scaled by counter-matrix lookup × the strong /
        //    weak / neutral perturbation scalar from the tunable surface.
        const playerArr = units.player.value;
        const aiArr = units.ai.value;
        for (const p of playerArr) {
          if (p.hp <= 0) continue;
          const pIdx = idxOf.get(p.archetypeId);
          if (pIdx === undefined) continue;
          const pDef = data.units.find((d) => d.id === p.archetypeId);
          if (!pDef) continue;
          for (const a of aiArr) {
            if (a.hp <= 0) continue;
            if (Math.abs(p.position - a.position) > ENGAGE_RADIUS) continue;
            const aIdx = idxOf.get(a.archetypeId);
            if (aIdx === undefined) continue;
            const aDef = data.units.find((d) => d.id === a.archetypeId);
            if (!aDef) continue;

            const pCell = adjustCell(data.counterMatrix[pIdx][aIdx], strong, weak);
            const aCell = adjustCell(data.counterMatrix[aIdx][pIdx], strong, weak);
            a.hp -= pDef.damagePerHit * pCell * dt;
            p.hp -= aDef.damagePerHit * aCell * dt;
          }
        }

        // 3) Resolve fortress-reached + unit-killed. Mutate in-place via a
        //    filter pass; emit events as we drop entries. Reassigning the
        //    `.value` array refreshes Vue dependents (frontline computeds,
        //    consumer composables).
        for (const side of SIDES) {
          const arr = units[side].value;
          if (arr.length === 0) continue;
          const survivors: UnitInstance[] = [];
          for (const u of arr) {
            if (u.hp <= 0) {
              handle.emit('unit-killed', { side: u.side, archetypeId: u.archetypeId });
              continue;
            }
            const reachedFortress = side === 'player' ? u.position >= LANE_LENGTH : u.position <= 0;
            if (reachedFortress) {
              const def = data.units.find((d) => d.id === u.archetypeId);
              const damage = def ? def.damagePerHit : 0;
              handle.emit('fortress-reached', {
                side: u.side,
                archetypeId: u.archetypeId,
                damage,
              });
              continue;
            }
            survivors.push(u);
          }
          if (survivors.length !== arr.length) {
            units[side].value = survivors;
          }
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
