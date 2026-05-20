import {
  createBooleanRequirement,
  createPurchasableCategory,
  persistent,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type PurchasableCategory,
} from '@open-loop/engine';
import type {
  BloonInstance,
  DefenderData,
  TowerDef,
  TowerId,
  TowerInstance,
} from '../data/types';
import { getBloons } from './bloons';
import { MapKey } from './map';
import { DefenderTuningRegistryKey } from './tuning';

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

/** Tower shop — `createPurchasableCategory<TowerDef>`. In arc-1 the shop
 *  exists primarily as the *display surface* for buyable tower options; the
 *  actual placement + cost subtraction goes through `placeTower(defId, cell)`
 *  because tower placement is cell-targeted (UI input). The shop's
 *  requirements are a no-op gate in Phase 2 — money lives in the round module
 *  (Phase 3), and gating the shop on a `createCostRequirement` against money
 *  would couple worktrees. Phase 3 wires real cost/money checking. */
export const TowerShopKey: InjectionKey<PurchasableCategory<TowerDef>> = Symbol(
  'defender/tower-shop',
) as InjectionKey<PurchasableCategory<TowerDef>>;

let towers: TowersApi | null = null;

export function getTowers(): TowersApi {
  if (!towers) throw new Error('defender/towers: not installed yet');
  return towers;
}

/**
 * Tower module — shop + per-tower state + targeting + fire.
 *
 * Structural decision (OL-1021 triage): towers do NOT use `createWorker`.
 * Worker's queue-driven Sequencer + TimedProgress + task-lookup shape fights
 * spatial target selection; towers are spatial entities that pick a target
 * in space every cooldown tick. Raw per-instance cooldown countdown + per-
 * tick spatial query + direct fire handler is the production pattern (see
 * tug `lane.ts` for the structurally analogous spatial-entity-with-cooldown
 * shape).
 *
 * BTD1 source-of-truth citations live on the TowerDef constants in
 * `data/towers.ts` (Tower.as:154-231 + BloonsTD.as:802-826). Tunable reader
 * sites below cite the same line ranges; the citation values are not
 * duplicated here.
 *
 * TODO(expansion): bomb/dart projectiles are modeled as instant hitscan —
 * BTD1's actual projectiles travel at `projectileSpeedLaneUnitsPerSec` and
 * can miss fast bloons. Arc-1's 4 bloon types (max yellow at 90 lane-units/s)
 * are slow enough that the difference is cosmetic; a later refinement can add
 * visible-projectile fidelity by spawning persistent projectile entities and
 * ticking their travel + AABB collision. Drop-spot:
 * `open-loop-engine/docs/candidate-primitives.md` if a second consumer needs
 * lobbed projectile semantics.
 */
export function createTowersModule(data: DefenderData): EngineModule {
  return {
    id: 'defender/towers',
    dependencies: ['defender/tuning', 'defender/map'],
    install(ctx) {
      const registry = ctx.inject(DefenderTuningRegistryKey);
      const map = ctx.inject(MapKey);
      // Capture map for the per-fire helpers (targeting / splash) without
      // threading the reference through every call site.
      mapRef = map;

      // ─── Tunable reader sites ──────────────────────────────────────────
      // Per-tower stats exposed to the override registry. Solvers + balance
      // probes perturb via `pushScope` on DefenderTuningRegistryKey. Each
      // reader's default closes over the canonical TowerDef from `data.towers`;
      // citations match the per-constant comments in `data/towers.ts`.
      const stats = new Map<TowerId, TowerStatRefs>();
      for (const def of data.towers) {
        stats.set(def.id, buildStatRefs(registry, def));
      }

      // ─── Persistent state ──────────────────────────────────────────────
      const placedTowers = persistent<TowerInstance[]>([], { name: 'placed-towers' });
      const nextInstanceId = persistent<number>(0, { name: 'next-tower-instance-id' });

      // ─── Shop ──────────────────────────────────────────────────────────
      // The shop is the display + introspection surface for "what towers are
      // buyable". Actual placement runs through `placeTower(defId, cell)` —
      // the cell is UI-input, the shop can't model it. `onPurchase` is
      // intentionally not wired to a placement flow: UI calls `placeTower`
      // directly after the user picks a cell. The shop's `requirements`
      // resolve to an always-true boolean gate in Phase 2; Phase 3 swaps in
      // a real `createCostRequirement` against the round module's money
      // resource once that module's body lands.
      const shop = createPurchasableCategory<TowerDef>({
        id: 'defender/tower-shop',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: describeTower(def) },
          requirements: createBooleanRequirement({ requirement: () => true }),
          limit: Infinity,
        }),
      });
      shop.register(data.towers);

      // ─── Placement / sell ──────────────────────────────────────────────
      function placeTower(defId: TowerId, cell: { x: number; y: number }): boolean {
        const def = data.towers.find((t) => t.id === defId);
        if (!def) return false;

        // Cell must be buildable AND unoccupied. Matches the BTD1
        // placement-validity check at BloonsTD.as:1048-1057 which rejects
        // tower placement overlapping path cells.
        const target = map.cellAt(cell.x, cell.y);
        if (target.type !== 'buildable') return false;
        if (target.towerInstanceId != null) return false;

        // TODO(phase-3): subtract def.baseCost from money via the round
        // module's resource. Phase 2 lands the placement mechanism alone;
        // Phase 3 wires the money flow when the round module's body lands.

        const instanceId = `tower-${nextInstanceId.value++}`;
        target.type = 'blocked';
        target.towerInstanceId = instanceId;

        placedTowers.value = [
          ...placedTowers.value,
          {
            instanceId,
            defId,
            cell: { x: cell.x, y: cell.y },
            // Fresh towers spawn with full cooldown so they don't fire on
            // their first tick — matches BTD1 Tower.as:154 init where
            // `timeSinceLastShot` starts at 0 and must accumulate to
            // `attackRate` before firing.
            cooldownRemaining: stats.get(defId)!.attackCooldownSec.value,
          },
        ];
        return true;
      }

      function sellTower(instanceId: string): void {
        const instance = placedTowers.value.find((t) => t.instanceId === instanceId);
        if (!instance) return;

        // Flip the cell back to buildable. The map module owns the cell
        // grid; we mutate its `type` + clear `towerInstanceId` in place
        // (the shared MapCell records are by-reference, see map.ts).
        const cell = map.cellAt(instance.cell.x, instance.cell.y);
        cell.type = 'buildable';
        cell.towerInstanceId = undefined;

        // TODO(phase-3): refund def.baseCost × economy.sellRate to money.
        // Round module lands the money resource in Phase 3.

        placedTowers.value = placedTowers.value.filter(
          (t) => t.instanceId !== instanceId,
        );
      }

      // ─── Per-tick: cooldown + targeting + fire ─────────────────────────
      ctx.onTick((dt) => {
        const arr = placedTowers.value;
        if (arr.length === 0) return;

        // Resolve in-flight bloons. The bloons module's body lands in
        // worktree C; if it's still a stub in this branch, accessing
        // `inFlight.value` throws — guard so towers tick cleanly until C
        // merges in.
        let bloons: BloonInstance[] | null;
        try {
          bloons = getBloons().inFlight.value;
        } catch {
          bloons = null;
        }

        for (const t of arr) {
          t.cooldownRemaining -= dt;
          if (t.cooldownRemaining > 0) continue;

          const refs = stats.get(t.defId)!;
          const def = data.towers.find((d) => d.id === t.defId)!;

          // Tower world position — cell center on the lane-unit grid.
          const tx = t.cell.x + 0.5;
          const ty = t.cell.y + 0.5;

          // Fire policy branches by tower type. Each policy resets the
          // cooldown to the tunable's current value — perturbations take
          // effect on the next fire, not retroactively.
          if (def.id === 'tack') {
            // Radial volley — no target needed. `volleyCount` projectiles
            // fan out from the tower position; bloons within range pop.
            fireTack(tx, ty, refs, bloons);
          } else if (def.id === 'ice') {
            // Instant AoE freeze — all freezable bloons within range get
            // `freezeDurationSec` added to their `frozenRemainingSec`.
            fireIce(tx, ty, refs, bloons);
          } else if (def.id === 'bomb') {
            // Bomb: target furthest-along-path bloon in range (including
            // frozen — bombs ignore the freeze-skip rule per
            // Tower.as:276-281). Splash AoE on impact.
            const target = pickFurthestInRange(tx, ty, refs, bloons, /*allowFrozen*/ true);
            if (target) fireBomb(target, refs, bloons);
          } else {
            // Dart: single furthest-along-path bloon in range; skip frozen
            // (matches BTD1 Tower.as:276-281 — only bombs hit frozen).
            const target = pickFurthestInRange(tx, ty, refs, bloons, /*allowFrozen*/ false);
            if (target) fireDart(target, refs);
          }

          t.cooldownRemaining = refs.attackCooldownSec.value;
        }
      });

      // ─── API ───────────────────────────────────────────────────────────
      const api: TowersApi = {
        placedTowers,
        placeTower,
        sellTower,
        placedCount: () => placedTowers.value.length,
        placedCountOf: (defId) =>
          placedTowers.value.filter((t) => t.defId === defId).length,
      };

      towers = api;
      ctx.provide(TowersKey, api);
      ctx.provide(TowerShopKey, shop);
    },
  };
}

// ─── Tunable refs per tower ───────────────────────────────────────────────
// One TowerStatRefs per TowerId, built at install time. The `tunable()`
// reader sites bind each per-stat key to a ComputedRef that re-reads through
// the override registry on every access — perturbations via `pushScope` take
// effect immediately. Citations follow `data/towers.ts` line-for-line.

interface TowerStatRefs {
  baseCost: { value: DecimalSource };
  rangeLaneUnits: { value: number };
  attackCooldownSec: { value: number };
  projectileSpeedLaneUnitsPerSec: { value: number };
  pierceMax: { value: number };
  // Shape-specific tunables. The non-applicable ones return 0/false; only
  // the tower-type-matched fire policy reads its own.
  splashRadiusLaneUnits: { value: number };
  freezeDurationSec: { value: number };
  volleyCount: { value: number };
}

function buildStatRefs(
  registry: Parameters<typeof tunable>[0],
  def: TowerDef,
): TowerStatRefs {
  // Cite Tower.as line ranges by tower for the reader. Per-constant citations
  // already live next to each value in data/towers.ts.
  return {
    // Tower base purchase cost. Citation: BloonsTD.as:802-806 COST_* per id.
    baseCost: tunable<DecimalSource>(
      registry,
      `towers/${def.id}/baseCost`,
      () => def.baseCost,
    ),
    // Targeting radius (lane units). Citation: BloonsTD.as:817-821 RANGE_*.
    rangeLaneUnits: tunable<number>(
      registry,
      `towers/${def.id}/rangeLaneUnits`,
      () => def.rangeLaneUnits,
    ),
    // Seconds between successive shots. Citation: Tower.as:178/185/202/210
    // attackRate (frames @ 30fps).
    attackCooldownSec: tunable<number>(
      registry,
      `towers/${def.id}/attackCooldownSec`,
      () => def.attackCooldownSec,
    ),
    // Projectile travel speed, lane-units/sec. Citation: Tower.as:181/189/203
    // shootPower. Ice is 0 (range-based AoE, no projectile).
    projectileSpeedLaneUnitsPerSec: tunable<number>(
      registry,
      `towers/${def.id}/projectileSpeedLaneUnitsPerSec`,
      () => def.projectileSpeedLaneUnitsPerSec,
    ),
    // Max bloons a single fire pops. Citation: Tower.as:158/207/216 pierceMax.
    pierceMax: tunable<number>(
      registry,
      `towers/${def.id}/pierceMax`,
      () => def.pierceMax,
    ),
    // Bomb splash radius. Citation: Phase-1 stand-in (SWF resource); only
    // 'bomb' reads this. Phase-5 balance pass re-derives. Tunable key
    // `towers/bomb/splashRadiusLaneUnits` registers under the bomb-only id.
    splashRadiusLaneUnits:
      def.id === 'bomb'
        ? tunable<number>(
            registry,
            'towers/bomb/splashRadiusLaneUnits',
            () => def.splashRadiusLaneUnits ?? 0,
          )
        : { value: 0 },
    // Ice freeze duration. Citation: Tower.as:215 freezeLen (50 frames @
    // 30fps). Only 'ice' reads this.
    freezeDurationSec:
      def.id === 'ice'
        ? tunable<number>(
            registry,
            'towers/ice/freezeDurationSec',
            () => def.freezeDurationSec ?? 0,
          )
        : { value: 0 },
    // Tack radial-volley count. Citation: Bloon.as:193 (8 projectiles).
    // Only 'tack' reads this.
    volleyCount:
      def.id === 'tack'
        ? tunable<number>(
            registry,
            'towers/tack/volleyCount',
            () => def.volleyCount ?? 0,
          )
        : { value: 0 },
  };
}

// ─── Targeting ────────────────────────────────────────────────────────────
// "Furthest along path" — picks the in-range bloon with the highest
// `distanceAlongPath`. Matches BTD1 Tower.as:257-296 GetTarget. `allowFrozen`
// is true for bombs (Tower.as:276-281 carves out the exception); all other
// tower types skip frozen bloons.

function pickFurthestInRange(
  tx: number,
  ty: number,
  refs: TowerStatRefs,
  bloons: BloonInstance[] | null,
  allowFrozen: boolean,
): BloonInstance | null {
  if (!bloons || bloons.length === 0) return null;
  const range = refs.rangeLaneUnits.value;
  const rangeSq = range * range;

  let best: BloonInstance | null = null;
  let bestDist = -1;
  for (const b of bloons) {
    if (!allowFrozen && b.frozenRemainingSec > 0) continue;
    const { x: bx, y: by } = positionOf(b);
    const dx = bx - tx;
    const dy = by - ty;
    if (dx * dx + dy * dy > rangeSq) continue;
    if (b.distanceAlongPath > bestDist) {
      best = b;
      bestDist = b.distanceAlongPath;
    }
  }
  return best;
}

/** Resolve a bloon's world position via the map module's
 *  `positionAtDistance`. Memoized per fire would help if the bloon roster
 *  is huge; arc-1 caps at ~30 in-flight per round so per-call is fine. */
function positionOf(bloon: BloonInstance): { x: number; y: number } {
  // Map module is captured by closure at install time; we re-inject lazily
  // here so the helper stays a pure function. Cheaper alternative: pass the
  // map reference in. Hoisting helps readability without measurable cost
  // at expected bloon counts.
  return mapRef!.positionAtDistance(bloon.distanceAlongPath);
}

// Local ref to the MapApi captured by install(). Helper functions read this
// rather than re-injecting per call — install() sets it once.
let mapRef: import('./map').MapApi | null = null;

// ─── Fire policies ────────────────────────────────────────────────────────

function fireDart(target: BloonInstance, _refs: TowerStatRefs): void {
  // Hitscan single-target pop. TODO(phase-3): once worktree C exposes a
  // `popBloon(instanceId, byTowerInstanceId)` method on BloonsApi, route the
  // pop through it so `onBloonPopped` fires and the round module's money +
  // shedding handler runs. For Phase 2 the fire mechanism exists but the
  // pop-routing is deferred; the bloon stays on the field until C's body
  // lands and provides a real pop entry point.
  void target;
}

function fireBomb(
  impact: BloonInstance,
  refs: TowerStatRefs,
  bloons: BloonInstance[] | null,
): void {
  // AoE splash centered on the impact bloon. Pops up to `pierceMax`
  // (Tower.as:207 = 20) bloons within `splashRadiusLaneUnits`.
  if (!bloons || bloons.length === 0) return;
  const radius = refs.splashRadiusLaneUnits.value;
  const radiusSq = radius * radius;
  const pierceLimit = refs.pierceMax.value;

  const { x: ix, y: iy } = positionOf(impact);
  let popped = 0;
  for (const b of bloons) {
    if (popped >= pierceLimit) break;
    const { x: bx, y: by } = positionOf(b);
    const dx = bx - ix;
    const dy = by - iy;
    if (dx * dx + dy * dy > radiusSq) continue;
    popped++;
    // TODO(phase-3): route through BloonsApi.popBloon — see fireDart note.
  }
}

function fireTack(
  tx: number,
  ty: number,
  refs: TowerStatRefs,
  bloons: BloonInstance[] | null,
): void {
  // Radial volley — `volleyCount` projectiles in a circle. Modeled as
  // hitscan: any bloon within range gets popped, up to `pierceMax × volleyCount`
  // total pops (each projectile pierces up to pierceMax). Per BTD1's
  // gameplay this rarely matters in arc-1 since pierceMax=1 and only the
  // closest bloon per projectile angle would normally pop; modeling as
  // "all bloons in range up to volleyCount" captures the practical effect.
  if (!bloons || bloons.length === 0) return;
  const range = refs.rangeLaneUnits.value;
  const rangeSq = range * range;
  const cap = refs.volleyCount.value * refs.pierceMax.value;

  let popped = 0;
  for (const b of bloons) {
    if (popped >= cap) break;
    if (b.frozenRemainingSec > 0) continue;
    const { x: bx, y: by } = positionOf(b);
    const dx = bx - tx;
    const dy = by - ty;
    if (dx * dx + dy * dy > rangeSq) continue;
    popped++;
    // TODO(phase-3): route through BloonsApi.popBloon — see fireDart note.
  }
}

function fireIce(
  tx: number,
  ty: number,
  refs: TowerStatRefs,
  bloons: BloonInstance[] | null,
): void {
  // Instant-AoE freeze — every freezable bloon within range gets frozen
  // for `freezeDurationSec` seconds. Direct mutation of `frozenRemainingSec`
  // is the freeze application; the bloons module's per-tick walk handler
  // reads the field and gates movement on it.
  if (!bloons || bloons.length === 0) return;
  const range = refs.rangeLaneUnits.value;
  const rangeSq = range * range;
  const duration = refs.freezeDurationSec.value;
  const pierceLimit = refs.pierceMax.value;

  let frozen = 0;
  for (const b of bloons) {
    if (frozen >= pierceLimit) break;
    const { x: bx, y: by } = positionOf(b);
    const dx = bx - tx;
    const dy = by - ty;
    if (dx * dx + dy * dy > rangeSq) continue;
    // Phase-2 freeze: write directly to the bloon's frozen countdown. The
    // freezable check (data.bloons[*].freezable) is not enforced here —
    // arc-1 bloons are all freezable per BloonsTD.as:rank-1-to-5; later
    // arcs that introduce non-freezable bloons (rank 6+) would extend the
    // bloons module to expose a freezable lookup or to gate this write
    // internally.
    b.frozenRemainingSec = Math.max(b.frozenRemainingSec, duration);
    frozen++;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function describeTower(def: TowerDef): string {
  // Short shop-card description. Kept here (not in data/) because data/ is
  // skeleton + numbers only; user-facing copy is module-side.
  switch (def.id) {
    case 'dart':
      return 'Single-target dart. Cheap baseline pop.';
    case 'tack':
      return 'Radial tack volley. Short range, wide coverage.';
    case 'bomb':
      return 'Lobbed bomb with splash. Pops frozen bloons.';
    case 'ice':
      return 'Range AoE freeze. Locks bloons in place; no damage.';
  }
}

// Note on `mapRef`: assigned during install() (above) so the targeting/fire
// helpers can resolve bloon world positions without re-injecting per call.
// HMR re-installs overwrite it cleanly; single-engine-per-process means no
// cross-instance leakage in arc-1.

