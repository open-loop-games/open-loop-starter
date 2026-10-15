import {
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Resource,
} from '@open-loop/engine';
import { persistent } from '@open-loop/engine';
import {
  SkirmishTuningRegistryKey,
  DEFAULT_FACTIONS,
  isHostile,
  type FactionId,
  type Side,
} from './tuning';
import { MatchKey } from './match';
import { EconomyKey } from './economy';
import {
  BASE_HP,
  BASE_RADIUS,
  TROOPER,
  getUnitDef,
  getCounterMultiplier,
  computeBasePositions,
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
 * here, as game code: the engine leaves real-time positioning to the game, and
 * its `SpatialGrid` is discrete-cell, not a float radius-query index.
 * `SpatialInfluenceLayer` for the *AI opponent's* reasoning
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
  /** Horizontal facing direction: 1 for right, -1 for left. */
  facing?: number;
}

export interface TacticalApi {
  factions: readonly FactionId[];
  units: Record<FactionId, Persistent<Unit[]>>;
  baseHp: Record<FactionId, Persistent<number>>;
  /**
   * Spendable supply — owned by `modules/economy.ts` and surfaced here because
   * spawning is what spends it. Read it from either; there is one resource.
   */
  supply: Record<FactionId, Resource<DecimalSource>>;
  basePos: Record<FactionId, { x: number; y: number }>;
  /** Faction-level march target base (the meso-AI's input). */
  targetBase: Record<FactionId, Persistent<FactionId | null>>;
  /** Live unit cost, after any tuning override. Defaults to 'trooper'. */
  unitCost(type?: UnitTypeId): number;
  /** Spawn one unit for `side` if it can afford the cost. Defaults to 'trooper'. */
  spawn(side: Side, type?: UnitTypeId): boolean;
  /** Set designated enemy base to march toward. */
  setTargetBase(faction: FactionId, target: FactionId | null): void;
}

export const TacticalKey: InjectionKey<TacticalApi> = Symbol(
  'skirmish/tactical',
) as InjectionKey<TacticalApi>;

export interface TacticalSimModuleOptions {
  /** Participating faction roster. Defaults to DEFAULT_FACTIONS. */
  factions?: readonly FactionId[];
  /** Radius of regular N-gon placement from center (50, 50). Defaults to BASE_RADIUS (38). */
  baseRadius?: number;
}

/**
 * A unit's position as it stood at the start of the tick, paired with the live
 * unit so damage still lands on the real thing.
 */
interface Frozen {
  unit: Unit;
  x: number;
  y: number;
  hp: number;
  faction: FactionId;
}

// Brute force by choice: the engine leaves real-time positioning to the game, and the scan is
// cheap at the unit counts a player sees. A broad-phase would visit only nearby cells.
/** Nearest living enemy within `range`, else null. Brute force — the scale seam. */
function nearestEnemy(self: Frozen, enemies: Frozen[], range: number): Frozen | null {
  let best: Frozen | null = null;
  let bestD2 = range * range;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
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

export function createTacticalSimModule(options: TacticalSimModuleOptions = {}): EngineModule {
  const factions = options.factions ?? DEFAULT_FACTIONS;
  const baseRadius = options.baseRadius ?? BASE_RADIUS;
  const baseGeometries = computeBasePositions(factions, baseRadius);
  const basePos: Record<FactionId, { x: number; y: number }> = {};
  for (const f of factions) {
    basePos[f] = { x: baseGeometries[f].x, y: baseGeometries[f].y };
  }

  return {
    id: 'skirmish/match/tactical',
    dependencies: ['skirmish/tuning', 'skirmish/match', 'skirmish/match/economy'],
    install(ctx) {
      const registry = ctx.inject(SkirmishTuningRegistryKey);
      const match = ctx.inject(MatchKey);
      const economy = ctx.inject(EconomyKey);

      const units = {} as Record<FactionId, Persistent<Unit[]>>;
      const baseHp = {} as Record<FactionId, Persistent<number>>;
      const spawnIndex = {} as Record<FactionId, Persistent<number>>;
      const targetBase = {} as Record<FactionId, Persistent<FactionId | null>>;

      for (const f of factions) {
        units[f] = persistent<Unit[]>([], { id: `units-${f}` });
        baseHp[f] = persistent<number>(BASE_HP, { id: `baseHp-${f}` });
        spawnIndex[f] = persistent<number>(0, { id: `spawnIndex-${f}` });
        targetBase[f] = persistent<FactionId | null>(null, { id: `targetBase-${f}` });
      }
      const nextId = persistent<number>(0, { id: 'nextId' });

      const unitCost = tunable(registry, 'tactical/unitCost', () => TROOPER.cost);

      // Re-init on match open — the match-scope reset runs at `end()`, not
      // `start()`, so a match opened over a live one would inherit its field.
      // The sim clears its own field on every open.
      match.on('matchStarted', () => {
        for (const f of factions) {
          units[f].value = [];
          baseHp[f].value = BASE_HP;
          spawnIndex[f].value = 0;
          targetBase[f].value = null;
        }
        nextId.value = 0;
      });

      function spawn(faction: FactionId, type: UnitTypeId = 'trooper'): boolean {
        if (!match.inMatch.value) return false;
        if (!match.activeFactions.value.includes(faction)) return false;
        const def = getUnitDef(type);
        const cost = type === 'trooper' ? Number(unitCost.value) : def.cost;
        if (!economy.spendOnArmy(faction, cost)) return false;

        const bg = baseGeometries[faction];
        // Deterministic tangent spread so a burst doesn't stack on one point.
        const offset = ((spawnIndex[faction].value % 5) - 2) * 3;
        const spawnX = bg.x + offset * bg.tangentX;
        const spawnY = bg.y + offset * bg.tangentY;

        units[faction].value.push({
          id: nextId.value,
          type,
          x: spawnX,
          y: spawnY,
          hp: def.hp,
          cooldown: 0,
          facing: bg.x <= 50 ? 1 : -1,
        });
        units[faction].value = [...units[faction].value]; // reassign -> reactivity
        nextId.value += 1;
        spawnIndex[faction].value += 1;
        return true;
      }

      function setTargetBase(faction: FactionId, target: FactionId | null): void {
        if (targetBase[faction]) {
          targetBase[faction].value = target;
        }
      }

      ctx.onTick((dt) => {
        if (!match.inMatch.value) return;
        const active = match.activeFactions.value;

        // Simultaneous resolution: snapshot all living units across active factions
        const frozen = {} as Record<FactionId, Frozen[]>;
        for (const f of factions) {
          frozen[f] = units[f].value.map((u) => ({
            unit: u,
            x: u.x,
            y: u.y,
            hp: u.hp,
            faction: f,
          }));
        }

        for (const selfFaction of active) {
          // Collect units from all hostile active factions using snapshot hp
          const hostileEnemies: Frozen[] = [];
          for (const otherFaction of active) {
            if (isHostile(selfFaction, otherFaction)) {
              for (const e of frozen[otherFaction]) {
                if (e.hp > 0) hostileEnemies.push(e);
              }
            }
          }

          for (const self of frozen[selfFaction]) {
            const u = self.unit;
            const def = getUnitDef(u.type);
            const targetUnit = nearestEnemy(self, hostileEnemies, def.aggroRange);

            let tx: number;
            let ty: number;
            let targetEnemyBaseFaction: FactionId | null = null;

            if (targetUnit) {
              tx = targetUnit.x;
              ty = targetUnit.y;
            } else {
              // March toward hostile enemy base
              const designated = targetBase[selfFaction]?.value;
              if (designated && active.includes(designated) && isHostile(selfFaction, designated)) {
                targetEnemyBaseFaction = designated;
              } else {
                // Nearest living hostile base
                let bestBaseDist2 = Infinity;
                let bestBaseFaction: FactionId | null = null;
                for (const other of active) {
                  if (isHostile(selfFaction, other)) {
                    const bp = basePos[other];
                    const d2 = (bp.x - self.x) ** 2 + (bp.y - self.y) ** 2;
                    if (d2 < bestBaseDist2) {
                      bestBaseDist2 = d2;
                      bestBaseFaction = other;
                    }
                  }
                }
                targetEnemyBaseFaction = bestBaseFaction;
              }

              if (targetEnemyBaseFaction) {
                tx = basePos[targetEnemyBaseFaction].x;
                ty = basePos[targetEnemyBaseFaction].y;
              } else {
                tx = self.x;
                ty = self.y;
              }
            }

            const dx = tx - self.x;
            const dy = ty - self.y;
            const dist = Math.hypot(dx, dy);

            u.cooldown = Math.max(0, u.cooldown - dt);
            if (dist <= def.attackRange) {
              if (u.cooldown <= 0) {
                if (targetUnit) {
                  const mult = getCounterMultiplier(u.type, targetUnit.unit.type);
                  targetUnit.unit.hp -= def.damage * mult;
                } else if (targetEnemyBaseFaction) {
                  baseHp[targetEnemyBaseFaction].value -= def.damage;
                }
                u.cooldown = def.attackCooldownSec;
              }
            } else if (dist > 0) {
              const stepLen = Math.min(def.speed * dt, dist);
              const vx = (dx / dist) * stepLen;
              const vy = (dy / dist) * stepLen;
              u.x += vx;
              u.y += vy;
              if (Math.abs(vx) > 0.001) {
                u.facing = vx > 0 ? 1 : -1;
              }
            }
          }
        }

        // Remove the dead
        for (const f of factions) {
          units[f].value = units[f].value.filter((u) => u.hp > 0);
        }

        // Elimination lifecycle: a fallen base loses.
        // Surviving units of an eliminated faction are immediately disbanded.
        for (const f of active) {
          if (baseHp[f].value <= 0) {
            units[f].value = [];
            match.eliminate(f);
          }
        }
      });

      ctx.provide(TacticalKey, {
        factions,
        units,
        baseHp,
        supply: economy.supply,
        basePos,
        targetBase,
        unitCost: (type: UnitTypeId = 'trooper') =>
          type === 'trooper' ? Number(unitCost.value) : getUnitDef(type).cost,
        spawn,
        setTargetBase,
      });
    },
  };
}
