/**
 * Hotspot extraction — per-faction resources + depleting reservoir + slow
 * regen (OL-510).
 *
 * Each tick, for every hotspot, we:
 *
 *   1. If owned, compute yield = `baseYield × reservoirFactor × yieldChain.apply(1)`
 *      and deposit into the owner's essence resource, subtracting the same
 *      amount from the hotspot's reservoir.
 *   2. Regenerate {@link HOTSPOT_REGEN_PER_SEC} of capacity, clamped at cap.
 *
 * The per-faction yield {@link ModifierChain} is the extension point: upgrade
 * grants in `upgrades.ts` bind multiplicatively here. Net behaviour: a
 * freshly-owned hotspot pays out at full rate, decays toward a low steady
 * state where extraction = regen (~3% of cap at baseYield=1, regen=10%/min),
 * and refills once ownership lapses — the "claim next" pressure OL-504 wants.
 *
 * Why not {@link createProducerCategory}? The producer surface computes its
 * rate through a `computed()` over the rate chain. SpatialGrid cells aren't
 * reactive refs — a modifier whose `multiplier` reads `cell.owner` or
 * `cell.reservoir` caches its first evaluation and never updates, so
 * auto-deposit would drift from the grid state. A reactive mirror of
 * hotspot state would fix it but introduces a sync step without simplifying
 * the math; a plain manual tick is the clearest shape here. Upgrades still
 * validate the `chain.bind grants` half of OL-504's producer-category
 * bullet — see `upgrades.ts`.
 *
 * Reservoir state rides the existing {@link CellState.reservoir} field and
 * round-trips through the SpatialGrid snapshot (OL-493 hook) — no parallel
 * persistent ref, no schema migration.
 */

import {
  addResource,
  Decimal,
  type DecimalSource,
  type ModifierChain,
  type Resource,
  type SpatialGrid,
} from 'open-loop-engine';
import {
  type CellState,
  type FactionId,
  type HotspotDef,
  type HotspotTier,
} from './content';

export interface HotspotSystem {
  /** Current reservoir level for a hotspot; reads live from the grid. */
  reservoirOf(hotspotId: string): DecimalSource;
  /**
   * Effective per-second yield for `faction` at `hotspotId` right now, as
   * `baseYield × reservoirFactor × yieldChain.apply(1)` when the faction owns
   * the hotspot and the reservoir isn't empty; `0` otherwise. Exposed for
   * BalanceWorkbench / debug UIs, not consumed by the tick itself.
   */
  currentYield(faction: FactionId, hotspotId: string): DecimalSource;
  /** Engine tick handler: depletion + regen. */
  onEngineTick(dt: number): void;
}

export interface HotspotSystemOptions {
  grid: SpatialGrid<CellState>;
  hotspots: readonly HotspotDef[];
  essence: Record<FactionId, Resource<DecimalSource>>;
  yieldChains: Record<FactionId, ModifierChain>;
  /** Fraction of capacity per second; 10% per minute in the default tuning. */
  regenPerSec: number;
  /** Per-tier yield multiplier applied before the yield chain. */
  tierYieldMul: Record<HotspotTier, number>;
}

export function createHotspotSystem(opts: HotspotSystemOptions): HotspotSystem {
  const { grid, hotspots, essence, yieldChains, regenPerSec, tierYieldMul } = opts;

  const hotspotById = new Map<string, HotspotDef>();
  for (const h of hotspots) hotspotById.set(h.id, h);

  function reservoirOf(hotspotId: string): DecimalSource {
    const h = hotspotById.get(hotspotId);
    if (h == null) return 0;
    return grid.at(h.x, h.y).reservoir;
  }

  function yieldFor(
    faction: FactionId,
    h: HotspotDef,
    reservoir: DecimalSource,
  ): DecimalSource {
    const reservoirFactor = Decimal.div(reservoir, h.capacity);
    const tierMul = tierYieldMul[h.tier];
    const base = Decimal.mul(Decimal.mul(h.baseYield, reservoirFactor), tierMul);
    return yieldChains[faction].apply(base);
  }

  function currentYield(faction: FactionId, hotspotId: string): DecimalSource {
    const h = hotspotById.get(hotspotId);
    if (h == null) return 0;
    const cell = grid.at(h.x, h.y);
    if (cell.owner !== faction) return 0;
    return yieldFor(faction, h, cell.reservoir);
  }

  function onEngineTick(dt: number): void {
    if (dt <= 0) return;
    for (const h of hotspots) {
      const cell = grid.at(h.x, h.y);
      let next = new Decimal(cell.reservoir);

      const owner = cell.owner;
      if (owner !== null && next.gt(0)) {
        const rate = yieldFor(owner, h, next);
        const amount = Decimal.mul(rate, dt);
        if (Decimal.gt(amount, 0)) {
          addResource(essence[owner], amount);
          next = Decimal.max(0, Decimal.sub(next, amount));
        }
      }

      const regen = Decimal.mul(h.capacity, regenPerSec * dt);
      next = Decimal.min(h.capacity, Decimal.add(next, regen));

      // Direct field write — reservoir is per-tick state, not a semantic cell
      // mutation, so we bypass `grid.set` (which would emit `cellChanged`
      // every tick). `grid.at` returns the live cell reference.
      cell.reservoir = next;
    }
  }

  return { reservoirOf, currentYield, onEngineTick };
}
