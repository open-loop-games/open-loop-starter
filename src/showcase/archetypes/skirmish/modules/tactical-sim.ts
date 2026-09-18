import {
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Resource,
} from '@open-loop/engine';
import { persistent } from '@open-loop/engine';
import { SkirmishTuningRegistryKey, SIDES, opponentOf, type Side } from './tuning';
import { MatchKey } from './match';
import { EconomyKey } from './economy';
import {
  BASE_HP,
  FIELD,
  TROOPER,
  getUnitDef,
  getCounterMultiplier,
  type UnitTypeId,
} from '../data/tactical';

/**
 * Tactical sim — the continuous-tactical core (bone #3). Free-moving 2D unit
 * entities with per-unit HP, brute-force nearest-enemy targeting, unit-vs-unit
 * and unit-vs-base combat on a cooldown, death removal, and per-side spawning.
 * Each side has a base at a fixed position; when a base falls this fires
 * `match.end({ winner })` — the defeat seam the abstract battlefield stub
 * opened, now driven by units actually reaching and destroying a base.
 *
 * SCALE SEAM (the real growth port): targeting is O(units²) brute force — right
 * at skirmish scale (tens of units), a wall past that. When counts demand it,
 * a uniform-grid / spatial-hash broad-phase over continuous positions goes
 * here; that broad-phase is an engine-primitive candidate (the engine's
 * `SpatialGrid` is discrete-cell, not a float radius-query index) — first
 * instance, so no drop yet. `SpatialInfluenceLayer` for the *bot's* reasoning
 * (threat/frontier maps) is the other growth port: grid-for-thinking,
 * floats-for-being.
 *
 * Positions live HERE at the consumer layer, never in the engine (engine core
 * stays plain-data). Render reads this as a pure read-only projection.
 */

export interface Unit {
  id: number;
  type: UnitTypeId;
  x: number;
  y: number;
  hp: number;
  /** Seconds until the next attack is ready. */
  cooldown: number;
}

export interface TacticalApi {
  units: Record<Side, Persistent<Unit[]>>;
  baseHp: Record<Side, Persistent<number>>;
  /**
   * Spendable supply — owned by `modules/economy.ts` and surfaced here because
   * spawning is what spends it. Read it from either; there is one resource.
   */
  supply: Record<Side, Resource<DecimalSource>>;
  basePos: Record<Side, { x: number; y: number }>;
  /** Live unit price, after any tuning override. Defaults to 'trooper'. */
  unitCost(type?: UnitTypeId): number;
  /** Spawn one unit for `side` if it can afford the cost. Defaults to 'trooper'. */
  spawn(side: Side, type?: UnitTypeId): boolean;
}

export const TacticalKey: InjectionKey<TacticalApi> = Symbol(
  'skirmish/tactical',
) as InjectionKey<TacticalApi>;

const BASE_POS: Record<Side, { x: number; y: number }> = {
  a: { x: 6, y: FIELD.height / 2 },
  b: { x: FIELD.width - 6, y: FIELD.height / 2 },
};

/**
 * A unit's position as it stood at the start of the tick, paired with the live
 * unit so damage still lands on the real thing.
 */
interface Frozen {
  unit: Unit;
  x: number;
  y: number;
}

/** Nearest living enemy within `range`, else null. Brute force — the scale seam. */
function nearestEnemy(self: Frozen, enemies: Frozen[], range: number): Frozen | null {
  let best: Frozen | null = null;
  let bestD2 = range * range;
  for (const e of enemies) {
    if (e.unit.hp <= 0) continue;
    const dx = e.x - self.x;
    const dy = e.y - self.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) {
      bestD2 = d2;
      best = e;
    }
  }
  return best;
}

export function createTacticalSimModule(): EngineModule {
  return {
    id: 'skirmish/match/tactical',
    dependencies: ['skirmish/tuning', 'skirmish/match', 'skirmish/match/economy'],
    install(ctx) {
      const registry = ctx.inject(SkirmishTuningRegistryKey);
      const match = ctx.inject(MatchKey);
      const economy = ctx.inject(EconomyKey);

      const units = {} as Record<Side, Persistent<Unit[]>>;
      const baseHp = {} as Record<Side, Persistent<number>>;
      for (const side of SIDES) {
        units[side] = persistent<Unit[]>([], { name: `units-${side}` });
        baseHp[side] = persistent<number>(BASE_HP, { name: `baseHp-${side}` });
      }
      const nextId = persistent<number>(0, { name: 'nextId' });
      // Per-side spawn index, used ONLY for the formation offset. It cannot be
      // `nextId`: that counter is shared, so interleaved spawns hand each side a
      // different slice of the offset cycle and two seats running identical
      // policies field differently-shaped armies. That asymmetry decides mirror
      // matches, which makes it a balance result that is really a bug.
      const spawnIndex = {} as Record<Side, Persistent<number>>;
      for (const side of SIDES) {
        spawnIndex[side] = persistent<number>(0, { name: `spawnIndex-${side}` });
      }

      const unitCost = tunable<DecimalSource>(registry, 'tactical/unitCost', () => TROOPER.cost);

      // Re-init on match open — `createReset` restores `persistent()` refs but
      // NOT `createResource`, and we want a single authoritative reset path, so
      // the sim clears its own field each match.
      match.on('matchStarted', () => {
        for (const side of SIDES) {
          units[side].value = [];
          baseHp[side].value = BASE_HP;
        }
        nextId.value = 0;
        for (const side of SIDES) spawnIndex[side].value = 0;
      });

      function spawn(side: Side, type: UnitTypeId = 'trooper'): boolean {
        if (!match.inMatch.value) return false;
        const def = getUnitDef(type);
        const cost = type === 'trooper' ? Number(unitCost.value) : def.cost;
        if (!economy.spendOnArmy(side, cost)) return false;
        const bp = BASE_POS[side];
        // Deterministic y-spread so a burst doesn't stack on one point.
        const jitter = ((spawnIndex[side].value % 5) - 2) * 3;
        units[side].value.push({
          id: nextId.value,
          type,
          x: bp.x,
          y: bp.y + jitter,
          hp: def.hp,
          cooldown: 0,
        });
        units[side].value = [...units[side].value]; // reassign → reactivity
        nextId.value += 1;
        spawnIndex[side].value += 1;
        return true;
      }

      ctx.onTick((dt) => {
        if (!match.inMatch.value) return;

        // Simultaneous resolution. Every unit reads the world as it stood at the
        // START of this tick, so both sides act on the same information.
        //
        // Resolving sides in sequence against live positions is not a small
        // bias: the side processed second targets and range-checks against the
        // first side's ALREADY-MOVED positions, so it closes more accurately and
        // enters attack range sooner. It decides mirror matches on its own,
        // which reads as a balance result while actually being an update-order
        // artifact. Damage still applies to the live units — only the geometry
        // is snapshotted.
        const frozen = {} as Record<Side, Frozen[]>;
        for (const side of SIDES) {
          frozen[side] = units[side].value.map((u) => ({ unit: u, x: u.x, y: u.y }));
        }

        for (const side of SIDES) {
          const foe = opponentOf(side);
          const enemies = frozen[foe];
          const foeBase = BASE_POS[foe];
          for (const self of frozen[side]) {
            const u = self.unit;
            const def = getUnitDef(u.type);
            const target = nearestEnemy(self, enemies, def.aggroRange);
            const tx = target ? target.x : foeBase.x;
            const ty = target ? target.y : foeBase.y;
            // Distances read from the snapshot on both ends.
            const dx = tx - self.x;
            const dy = ty - self.y;
            const dist = Math.hypot(dx, dy);

            u.cooldown = Math.max(0, u.cooldown - dt);
            if (dist <= def.attackRange) {
              if (u.cooldown <= 0) {
                if (target) {
                  const mult = getCounterMultiplier(u.type, target.unit.type);
                  target.unit.hp -= def.damage * mult;
                } else {
                  baseHp[foe].value -= def.damage;
                }
                u.cooldown = def.attackCooldownSec;
              }
            } else if (dist > 0) {
              const stepLen = Math.min(def.speed * dt, dist);
              u.x += (dx / dist) * stepLen;
              u.y += (dy / dist) * stepLen;
            }
          }
        }

        // Remove the dead; reassign each tick so movement is reactive too.
        for (const side of SIDES) {
          units[side].value = units[side].value.filter((u) => u.hp > 0);
        }

        // Defeat: a fallen base loses. `a` checked first — simultaneous falls
        // resolve deterministically; `end()` is idempotent.
        for (const side of SIDES) {
          if (baseHp[side].value <= 0) {
            match.end({ winner: opponentOf(side), reason: 'defeat' });
            return;
          }
        }
      });

      ctx.provide(TacticalKey, {
        units,
        baseHp,
        supply: economy.supply,
        basePos: BASE_POS,
        unitCost: (type: UnitTypeId = 'trooper') =>
          type === 'trooper' ? Number(unitCost.value) : getUnitDef(type).cost,
        spawn,
      });
    },
  };
}
