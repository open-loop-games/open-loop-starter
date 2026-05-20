import type {
  EngineModule,
  InjectionKey,
  Persistent,
  PurchasableCategory,
} from '@open-loop/engine';
import type { DefenderData, TowerDef, TowerId, TowerInstance } from '../data/types';

export interface TowersApi {
  /** Live array of placed tower instances. Each entry carries a per-tower
   *  cooldown countdown ticked by the towers module's per-tick handler. */
  placedTowers: Persistent<TowerInstance[]>;
  /** Place a tower of `defId` at the given grid cell. Returns true on
   *  success (cell is buildable, player has cash); false on rejection.
   *  Subtracts purchase cost via the shop category's `purchase()` flow. */
  placeTower(defId: TowerId, cell: { x: number; y: number }): boolean;
  /** Sell the placed tower at `instanceId`. Refunds `cost × economy.sellRate`. */
  sellTower(instanceId: string): void;
  /** Count of placed towers, useful for UI badges + balance probes. */
  placedCount(): number;
  /** Count of placed towers of a specific type. */
  placedCountOf(defId: TowerId): number;
}

export const TowersKey: InjectionKey<TowersApi> = Symbol(
  'defender/towers',
) as InjectionKey<TowersApi>;

/** Tower shop — `createPurchasableCategory<TowerDef>`. `purchase()` flow
 *  spawns a `TowerInstance` and decrements money via the cost requirement. */
export const TowerShopKey: InjectionKey<PurchasableCategory<TowerDef>> = Symbol(
  'defender/tower-shop',
) as InjectionKey<PurchasableCategory<TowerDef>>;

let towers: TowersApi | null = null;

export function getTowers(): TowersApi {
  if (!towers) throw new Error('defender/towers: not installed yet');
  return towers;
}

/**
 * Tower module — shop + per-tower state + targeting + fire. Phase 1 STUB
 * — body lands in Phase 2 worktree B.
 *
 * Phase 2 implementation will (per OL-1021 structural decisions):
 *   1. Build the shop via `createPurchasableCategory<TowerDef>` reading
 *      `data.towers`; each tower's `baseCost` registers as a `tunable()`
 *      against `towers/<id>/baseCost`.
 *   2. Maintain `placedTowers: Persistent<TowerInstance[]>` for the
 *      placed-instance roster.
 *   3. Per-tick handler:
 *      a. Decrement each tower's `cooldownRemaining` by dt.
 *      b. When cooldownRemaining ≤ 0: query in-range bloons via the map's
 *         spatial grid + tower's range, pick target by "furthest along path"
 *         policy (matches BTD1 Tower.as:257-296 GetTarget), spawn projectile
 *         (or apply spread / AoE / freeze per tower type), reset cooldown.
 *   4. Subscribe to towers' onPurchase to compose-place via UI; sell-tower
 *      refunds at `economy.sellRate`.
 *
 * NOT using `createWorker` — the worker primitive's queue-driven shape
 * fights spatial target selection; raw `TimedProgress` cooldown + per-tick
 * spatial query is the production pattern (see tug `lane.ts` for the
 * structurally analogous spatial-entity-with-cooldown shape).
 */
export function createTowersModule(_data: DefenderData): EngineModule {
  return {
    id: 'defender/towers',
    dependencies: ['defender/tuning', 'defender/map'],
    install(ctx) {
      towers = makeStubTowers();
      ctx.provide(TowersKey, towers);
    },
  };
}

function makeStubTowers(): TowersApi {
  const notImplemented = (method: string): never => {
    throw new Error(`defender/towers: ${method} not implemented in Phase 1`);
  };
  return {
    get placedTowers(): Persistent<TowerInstance[]> {
      return notImplemented('placedTowers');
    },
    placeTower: () => notImplemented('placeTower'),
    sellTower: () => notImplemented('sellTower'),
    placedCount: () => notImplemented('placedCount'),
    placedCountOf: () => notImplemented('placedCountOf'),
  };
}
