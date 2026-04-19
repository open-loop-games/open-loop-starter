/**
 * Round lifecycle + meta-currency + reset composition (OL-511).
 *
 * Two-tier currency model:
 *   - Per-faction **essence** (OL-510, `creep-warfare-essence`) is the
 *     in-round currency. Reset on every round end.
 *   - **Meta-currency** (`creep-warfare-meta`) is awarded at round end,
 *     proportional to `cells * {@link META_CURRENCY_PER_CELL} +
 *     hotspots * {@link META_CURRENCY_PER_HOTSPOT}` for the player
 *     faction. Survives round reset; spent on meta-upgrades (meta.ts).
 *
 * Round phases:
 *   - `active`: sim runs, ticks consume dt, elapsed increases.
 *   - `ended`: sim frozen (gated in index.ts), 30s countdown panel runs,
 *     player may purchase meta-upgrades or click "Start Next Round".
 *
 * Termination: ≤1 surviving faction OR elapsed ≥ {@link ROUND_LENGTH_S}.
 * Triggered automatically from `onEngineTick`; the player can also call
 * {@link RoundSystem.endRound} manually from a UI button at any time.
 *
 * Reset scope:
 *   - `creep-warfare-essence` (per-faction essence)
 *   - `creep-warfare-upgrades-{faction}` for each faction (essence-tier tree)
 *   - `slot:goals-{faction}` for each faction (selected goals)
 *
 * Not in scope (persist across rounds): meta-currency, meta-upgrade amounts,
 * goal capacity, round seed. The grid snapshot is handled outside `createReset`
 * — {@link createCreepGrid.regenerate} wipes and reseeds it with a fresh
 * (possibly shuffled) factionOrder, making the reset-policy scope concern
 * itself only with business state.
 */

import {
  Decimal,
  addResource,
  createReset,
  createResource,
  persistent,
  seedRNG,
  shuffle,
  withPersistentContext,
  type DecimalSource,
  type Persistent,
  type Reset,
  type Resource,
  type SpatialGrid,
} from 'open-loop-engine';
import { computed, ref, type Ref } from 'vue';
import type { DirectorFactionId } from '@/archetypes/director';
import {
  FACTION_IDS,
  type CellState,
  type FactionId,
  type HotspotDef,
} from './content';
import type { CreepGrid } from './grid';

export interface RoundStats {
  territory: number;
  hotspotsHeld: number;
  survivingFactions: number;
  /** Seconds elapsed when the round ended. Zero while active or on a fresh round. */
  elapsed: number;
}

export interface RoundSystem {
  /** `active` during play, `ended` during the post-round panel. */
  readonly phase: Ref<'active' | 'ended'>;
  /** Seconds elapsed in the current round. Transient. */
  readonly elapsed: Ref<number>;
  /** Seconds remaining on the end-of-round panel. Transient; counts down while `phase === 'ended'`. */
  readonly countdown: Ref<number>;
  /** Round counter (increments each `startNextRound`). Persistent. */
  readonly seed: Persistent<number>;
  /** Permanent currency awarded at round end. */
  readonly metaCurrency: Resource<DecimalSource>;
  /**
   * Forward-looking preview of the award the player would get if the round
   * ended right now. Reactive on grid state. Frozen at snapshot once the
   * round ends, via {@link stats}.
   */
  readonly previewReward: Ref<DecimalSource>;
  /** Stats frozen at the moment the round ended. Resets to zero on `startNextRound`. */
  readonly stats: Ref<RoundStats>;
  /** End-of-round reward actually awarded on `endRound`. Zero during `active`. */
  readonly awardedReward: Ref<DecimalSource>;
  /** True iff automatic termination conditions are met (wipe-out or timeout). */
  isTerminated(): boolean;
  /** Transition to `ended`: award currency, freeze stats, start countdown. Idempotent. */
  endRound(): void;
  /** Transition to `active`: reset scope, advance seed, regenerate map. */
  startNextRound(): void;
  /** Engine tick handler — advances timer and auto-triggers termination. */
  onEngineTick(dt: number): void;
}

export interface RoundSystemOptions {
  grid: SpatialGrid<CellState>;
  creepGrid: CreepGrid;
  hotspots: readonly HotspotDef[];
  /**
   * Extra resettable objects (typically {@link PurchasableCategory}s via the
   * Resettable protocol) swept by `createReset`'s `thingsToReset`. Needed
   * because the engine's per-def context ids produced by `createCategoryBase`
   * do not link as children of the outer category context — so listing
   * `creep-warfare-upgrades-{faction}` in `resetModules` alone finds no refs.
   * Passing the category object directly lets the reset system recurse via
   * its [Resettable] implementation.
   */
  extraResettables?: readonly unknown[];
  roundLengthSec: number;
  endOfRoundCountdownSec: number;
  metaCurrencyPerCell: number;
  metaCurrencyPerHotspot: number;
  metaCurrencyName: string;
  playerFaction: DirectorFactionId;
}

function countTerritoryAndHotspots(
  grid: SpatialGrid<CellState>,
  hotspots: readonly HotspotDef[],
  faction: FactionId,
): { territory: number; hotspotsHeld: number } {
  let territory = 0;
  const w = grid.width;
  const h = grid.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid.at(x, y).owner === faction) territory++;
    }
  }
  let hotspotsHeld = 0;
  for (const hs of hotspots) {
    if (grid.at(hs.x, hs.y).owner === faction) hotspotsHeld++;
  }
  return { territory, hotspotsHeld };
}

function countSurvivingFactions(grid: SpatialGrid<CellState>): number {
  const live = new Set<FactionId>();
  const w = grid.width;
  const h = grid.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = grid.at(x, y).owner;
      if (o !== null) {
        live.add(o);
        if (live.size === FACTION_IDS.length) return live.size;
      }
    }
  }
  return live.size;
}

export function createRoundSystem(opts: RoundSystemOptions): RoundSystem {
  const {
    grid,
    creepGrid,
    hotspots,
    extraResettables,
    roundLengthSec,
    endOfRoundCountdownSec,
    metaCurrencyPerCell,
    metaCurrencyPerHotspot,
    metaCurrencyName,
    playerFaction,
  } = opts;

  function computeReward(territory: number, hotspotsHeld: number): DecimalSource {
    const raw = Decimal.add(
      Decimal.mul(territory, metaCurrencyPerCell),
      Decimal.mul(hotspotsHeld, metaCurrencyPerHotspot),
    );
    return Decimal.floor(raw);
  }

  const phase = ref<'active' | 'ended'>('active');
  const elapsed = ref(0);
  const countdown = ref(0);

  const seed = withPersistentContext('creep-warfare-round-seed', () => persistent<number>(1));

  const metaCurrency = withPersistentContext('creep-warfare-meta', () =>
    createResource<DecimalSource>(0, { displayName: metaCurrencyName }),
  );

  const stats = ref<RoundStats>({
    territory: 0,
    hotspotsHeld: 0,
    survivingFactions: 0,
    elapsed: 0,
  });
  const awardedReward = ref<DecimalSource>(0);

  // Reactive preview driven by the spatial grid's cellChanged emit cadence
  // (combat/spread resolution writes go through grid.set). Reads count all
  // cells every evaluation — at 3600 cells this is cheap enough for an
  // end-of-round UI preview; no caching layer needed.
  const previewReward = computed<DecimalSource>(() => {
    const { territory, hotspotsHeld } = countTerritoryAndHotspots(
      grid,
      hotspots,
      playerFaction,
    );
    return computeReward(territory, hotspotsHeld);
  });

  // Reset scope — every per-faction slot + the shared essence context.
  // Essence-tier upgrade categories ride in via `extraResettables` because
  // their per-def contexts are not linked as children of the outer category
  // id (see `extraResettables` doc). `creep-warfare-map` is intentionally
  // omitted; `creepGrid.regenerate` rewrites the snapshot ref directly with
  // a fresh (seeded, shuffled) blueprint after the reset call returns.
  const resetModules: string[] = ['creep-warfare-essence'];
  for (const f of FACTION_IDS) {
    resetModules.push(`slot:goals-${f}`);
  }
  const roundReset: Reset = createReset({
    resetModules,
    thingsToReset: extraResettables ? [...extraResettables] : undefined,
  });

  function isTerminated(): boolean {
    if (phase.value !== 'active') return false;
    if (elapsed.value >= roundLengthSec) return true;
    return countSurvivingFactions(grid) <= 1;
  }

  function endRound(): void {
    if (phase.value !== 'active') return;

    const { territory, hotspotsHeld } = countTerritoryAndHotspots(
      grid,
      hotspots,
      playerFaction,
    );
    const surviving = countSurvivingFactions(grid);
    const reward = computeReward(territory, hotspotsHeld);

    stats.value = {
      territory,
      hotspotsHeld,
      survivingFactions: surviving,
      elapsed: elapsed.value,
    };
    awardedReward.value = reward;
    if (Decimal.gt(reward, 0)) {
      addResource(metaCurrency, reward);
    }

    phase.value = 'ended';
    countdown.value = endOfRoundCountdownSec;
  }

  function startNextRound(): void {
    if (phase.value !== 'ended') return;

    roundReset.reset();
    seed.value = seed.value + 1;

    // Seeded faction→corner shuffle. Using the engine's global RNG is fine in
    // this isolated demo — no other consumer of `seedRNG`/`shuffle` runs
    // alongside this module. Rebuilds the spatial grid + snapshot in one shot.
    seedRNG(seed.value);
    const order = shuffle(FACTION_IDS) as FactionId[];
    creepGrid.regenerate(order);

    elapsed.value = 0;
    countdown.value = 0;
    awardedReward.value = 0;
    stats.value = { territory: 0, hotspotsHeld: 0, survivingFactions: 0, elapsed: 0 };
    phase.value = 'active';
  }

  function onEngineTick(dt: number): void {
    if (dt <= 0) return;
    if (phase.value === 'active') {
      elapsed.value += dt;
      if (isTerminated()) {
        endRound();
      }
      return;
    }
    // phase === 'ended' — countdown drives the auto-advance.
    countdown.value = Math.max(0, countdown.value - dt);
    if (countdown.value === 0) {
      startNextRound();
    }
  }

  return {
    phase,
    elapsed,
    countdown,
    seed,
    metaCurrency,
    previewReward,
    stats,
    awardedReward,
    isTerminated,
    endRound,
    startNextRound,
    onEngineTick,
  };
}
