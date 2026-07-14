import {
  Decimal,
  addResource,
  createResource,
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
import { BASE_HP, FIELD, SUPPLY_RATE, TROOPER } from '../data/tactical';

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
  x: number;
  y: number;
  hp: number;
  /** Seconds until the next attack is ready. */
  cooldown: number;
}

export interface TacticalApi {
  units: Record<Side, Persistent<Unit[]>>;
  baseHp: Record<Side, Persistent<number>>;
  supply: Record<Side, Resource<DecimalSource>>;
  basePos: Record<Side, { x: number; y: number }>;
  /** Spawn one unit for `side` if it can afford the cost. Returns whether it did. */
  spawn(side: Side): boolean;
}

export const TacticalKey: InjectionKey<TacticalApi> = Symbol(
  'skirmish/tactical',
) as InjectionKey<TacticalApi>;

const BASE_POS: Record<Side, { x: number; y: number }> = {
  a: { x: 6, y: FIELD.height / 2 },
  b: { x: FIELD.width - 6, y: FIELD.height / 2 },
};

/** Nearest living enemy within `range`, else null. Brute force — the scale seam. */
function nearestEnemy(u: Unit, enemies: Unit[], range: number): Unit | null {
  let best: Unit | null = null;
  let bestD2 = range * range;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - u.x;
    const dy = e.y - u.y;
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
    dependencies: ['skirmish/tuning', 'skirmish/match'],
    install(ctx) {
      const registry = ctx.inject(SkirmishTuningRegistryKey);
      const match = ctx.inject(MatchKey);

      const units = {} as Record<Side, Persistent<Unit[]>>;
      const baseHp = {} as Record<Side, Persistent<number>>;
      const supply = {} as Record<Side, Resource<DecimalSource>>;
      for (const side of SIDES) {
        units[side] = persistent<Unit[]>([], { name: `units-${side}` });
        baseHp[side] = persistent<number>(BASE_HP, { name: `baseHp-${side}` });
        supply[side] = createResource<DecimalSource>(0, {
          id: `skirmish/match/tactical/${side}/supply`,
          displayName: 'supply',
          precision: 0,
        });
      }
      const nextId = persistent<number>(0, { name: 'nextId' });

      const supplyRate = tunable<DecimalSource>(registry, 'tactical/supplyRate', () => SUPPLY_RATE);

      // Re-init on match open — `createReset` restores `persistent()` refs but
      // NOT `createResource`, and we want a single authoritative reset path, so
      // the sim clears its own field each match.
      match.on('matchStarted', () => {
        for (const side of SIDES) {
          units[side].value = [];
          baseHp[side].value = BASE_HP;
          addResource(supply[side], Decimal.mul(supply[side].value, -1));
        }
        nextId.value = 0;
      });

      function spawn(side: Side): boolean {
        if (!match.inMatch.value) return false;
        if (Decimal.lt(supply[side].value, TROOPER.cost)) return false;
        addResource(supply[side], -TROOPER.cost);
        const bp = BASE_POS[side];
        // Deterministic y-spread so a burst doesn't stack on one point.
        const jitter = ((nextId.value % 5) - 2) * 3;
        units[side].value.push({
          id: nextId.value,
          x: bp.x,
          y: bp.y + jitter,
          hp: TROOPER.hp,
          cooldown: 0,
        });
        units[side].value = [...units[side].value]; // reassign → reactivity
        nextId.value += 1;
        return true;
      }

      ctx.onTick((dt) => {
        if (!match.inMatch.value) return;

        for (const side of SIDES) {
          addResource(supply[side], Decimal.mul(supplyRate.value, dt));
        }

        // Move + attack. Sides processed in order; `a` resolves its attacks
        // before `b` this tick — a fixed, deterministic bias, negligible.
        for (const side of SIDES) {
          const foe = opponentOf(side);
          const enemies = units[foe].value;
          const foeBase = BASE_POS[foe];
          for (const u of units[side].value) {
            const target = nearestEnemy(u, enemies, TROOPER.aggroRange);
            const tx = target ? target.x : foeBase.x;
            const ty = target ? target.y : foeBase.y;
            const dx = tx - u.x;
            const dy = ty - u.y;
            const dist = Math.hypot(dx, dy);

            u.cooldown = Math.max(0, u.cooldown - dt);
            if (dist <= TROOPER.attackRange) {
              if (u.cooldown <= 0) {
                if (target) target.hp -= TROOPER.damage;
                else baseHp[foe].value -= TROOPER.damage;
                u.cooldown = TROOPER.attackCooldownSec;
              }
            } else if (dist > 0) {
              const stepLen = Math.min(TROOPER.speed * dt, dist);
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

      ctx.provide(TacticalKey, { units, baseHp, supply, basePos: BASE_POS, spawn });
    },
  };
}
