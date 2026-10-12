import {
  computed,
  createAchievementCategory,
  createSpatialGrid,
  createZoneSystem,
  persistent,
  ref,
  tunable,
  type AchievementCategory,
  type ComputedRef,
  type EngineModule,
  type GridCoord,
  type InjectionKey,
  type Persistent,
  type Ref,
  type SpatialGrid,
  type ZoneSystem,
} from '@open-loop/engine';
import {
  ANCHORS,
  LODGE,
  MAP_H,
  MAP_SEED,
  MAP_W,
  TERRAIN,
  WAYFINDER_TILES,
  herdRegrowSeconds,
  speciesById,
} from '../data';
import { ChronicleKey } from './chronicle';
import { LodgeKey } from './lodge';
import { ExplorerTuningRegistryKey } from './tuning';
import { generateMap, tileIndex, type Tile } from './wold-map';

/**
 * Wold module — the map and what is on it: the fogged chart, the herds and their
 * regrowth, the camps, the looted features, the terrain sighted, and the
 * Wayfinder ranks charting earns. The huntsman walks it; this module answers
 * what is where, what can be walked, and what each tile costs in jerky.
 */

export interface WayfinderDef {
  id: string;
  tiles: number;
}

export interface WoldApi {
  tiles: readonly Tile[];
  grid: SpatialGrid<Tile>;
  /** bumped whenever the board changes, since grid cells are not Vue-reactive */
  mapVersion: Ref<number>;
  chartedCount: Ref<number>;
  /** head left on each herd tile */
  stock: Persistent<number[]>;
  /** tile indices of the waystones a camp stands on */
  camps: Persistent<number[]>;
  /** tile indices of the lookouts and caches already used */
  looted: Persistent<number[]>;
  /** terrain sighted so far; gear cards and bestiary rows reveal from it */
  zones: ZoneSystem;
  wayfinder: AchievementCategory<WayfinderDef>;
  /** charting radius around the huntsman */
  sight: ComputedRef<number>;
  /** jerky one tile costs, hounds included */
  stepCost: ComputedRef<number>;
  tileAt(x: number, y: number): Tile;
  isCamp(i: number): boolean;
  isRestock(x: number, y: number): boolean;
  hasGearFor(t: Tile): boolean;
  /** open, charted, and the huntsman owns the gear its ground needs */
  walkable(t: Tile, x: number, y: number): boolean;
  /** jerky from every tile to the nearest restock point (the lodge or a built camp) */
  homeField(): Float64Array;
  /** jerky from `from` to every tile */
  fieldFrom(from: GridCoord): Float64Array;
  /** chart every tile within `radius`, and sight any new terrain */
  reveal(x: number, y: number, radius: number): void;
  /** raise a camp on tile `i`; the caller has checked the waystone and paid */
  raiseCamp(i: number): void;
}

export const WoldKey: InjectionKey<WoldApi> = Symbol('explorer/wold') as InjectionKey<WoldApi>;

let api: WoldApi;

export function getWold(): WoldApi {
  return api;
}

export function createWoldModule(): EngineModule {
  return {
    id: 'explorer/wold',
    dependencies: ['explorer/tuning', 'explorer/chronicle', 'explorer/lodge'],
    install(ctx) {
      const registry = ctx.inject(ExplorerTuningRegistryKey);
      const chronicle = ctx.inject(ChronicleKey);
      const lodge = ctx.inject(LodgeKey);

      const tiles = generateMap(MAP_SEED);
      const grid = createSpatialGrid<Tile>({
        width: MAP_W,
        height: MAP_H,
        initializer: (x, y) => tiles[tileIndex(x, y)],
      });
      tiles.forEach((t, i) => (grid.passable[i] = t.blocked ? 0 : 1));
      grid.markMaskChanged('passable');

      const mapVersion = ref(0);
      const chartedCount = ref(0);
      const onBoardChange = () => {
        chartedCount.value = grid.exploredCount;
        mapVersion.value++;
      };
      grid.on('fovUpdated', onBoardChange);
      grid.on('maskChanged', onBoardChange);

      const charted = persistent<number[]>([], { id: 'charted' });
      const stock = persistent<number[]>(
        tiles.map((t) => (t.herd ? speciesById.get(t.herd)!.herdSize : 0)),
        { id: 'stock' },
      );
      const camps = persistent<number[]>([], { id: 'camps' });
      const looted = persistent<number[]>([], { id: 'looted' });

      const zones = createZoneSystem({
        zones: TERRAIN.map((t) => ({ id: t.id, displayName: t.displayName, order: t.band })),
        initiallyUnlocked: ['meadow'],
      });

      // === WAYFINDING ===

      const wayfinder = createAchievementCategory<WayfinderDef>({
        id: 'wayfinder',
        mapAchievement: (def) => ({
          display: {
            title: `Wayfinder ${def.id}`,
            description: `Chart ${def.tiles} tiles.`,
            effectDescription: 'Sight +1',
          },
          goal: () => chartedCount.value >= def.tiles,
          onComplete: () =>
            chronicle.say('Wayfinder: your eye for country widens. Sight +1.', 'good'),
        }),
      });
      wayfinder.register(WAYFINDER_TILES.map((n, i) => ({ id: String(i + 1), tiles: n })));
      const sight = computed(
        () => 1 + wayfinder.getAll().filter((e) => e.achievement.earned.value).length,
      );

      // === GROUND ===

      const supplyPerStep = tunable(registry, 'trip/supplyPerStep', () => ANCHORS.supplyPerStep);
      const stepCost = computed(
        () => supplyPerStep.value * (1 + lodge.houndSupplyPerStep.value * lodge.hounds.value),
      );
      const tileAt = (x: number, y: number): Tile => tiles[tileIndex(x, y)];
      const isCamp = (i: number): boolean => camps.value.includes(i);
      const isRestock = (x: number, y: number): boolean =>
        (x === LODGE.x && y === LODGE.y) || isCamp(tileIndex(x, y));
      const hasGearFor = (t: Tile): boolean => {
        const needs = TERRAIN[t.band].needs;
        return needs == null || lodge.gearLevel(needs) > 0;
      };
      const walkable = (t: Tile, x: number, y: number): boolean =>
        !t.blocked && grid.explored[tileIndex(x, y)] === 1 && hasGearFor(t);
      const stepField = (t: Tile, x: number, y: number): number =>
        walkable(t, x, y) ? stepCost.value : Infinity;

      function reveal(x: number, y: number, radius: number): void {
        const fov = grid.beginFovUpdate();
        for (const c of grid.inRange(x, y, radius)) fov.markVisible(c.x, c.y);
        fov.commit();
        for (const c of grid.inRange(x, y, radius)) {
          const t = tileAt(c.x, c.y);
          if (!t.blocked && !zones.isUnlocked(t.terrain)) {
            zones.unlock(t.terrain);
            chronicle.say(`New country sighted: the ${TERRAIN[t.band].displayName}.`, 'find');
            chronicle.beat(`sight band ${t.band}`);
          }
        }
      }

      // === HERDS ===
      // A depleted herd regrows one head per its band's regrowth period.

      const regrowSeconds = [0, 1, 2, 3, 4].map((k) =>
        tunable(registry, `herds/${k}/regrowSeconds`, () => herdRegrowSeconds(k)),
      );
      const regrow = new Float64Array(tiles.length);
      ctx.onTick((dt) => {
        if (chronicle.won.value) return;
        const counts = stock.value;
        for (let i = 0; i < tiles.length; i++) {
          const h = tiles[i].herd;
          if (!h || h === 'hart') continue;
          const sp = speciesById.get(h)!;
          if (counts[i] >= sp.herdSize) continue;
          regrow[i] += dt;
          if (regrow[i] >= regrowSeconds[sp.band].value) {
            regrow[i] = 0;
            counts[i] += 1;
          }
        }
      });

      // === SAVE / LOAD ===
      // The explored mask is a typed array on the grid; it is copied into a
      // persistent array on save and back on load.

      ctx.onSave(() => {
        charted.value = Array.from(grid.explored);
      });
      ctx.onLoad(() => {
        if (charted.value.length === tiles.length) {
          grid.explored.set(charted.value);
          grid.markMaskChanged('explored');
        }
      });

      api = {
        tiles,
        grid,
        mapVersion,
        chartedCount,
        stock,
        camps,
        looted,
        zones,
        wayfinder,
        sight,
        stepCost,
        tileAt,
        isCamp,
        isRestock,
        hasGearFor,
        walkable,
        homeField() {
          const sources: GridCoord[] = [
            LODGE,
            ...camps.value.map((i) => ({ x: i % MAP_W, y: Math.floor(i / MAP_W) })),
          ];
          return grid.distanceField(sources, stepField);
        },
        fieldFrom(from) {
          return grid.distanceField([from], stepField);
        },
        reveal,
        raiseCamp(i) {
          camps.value = [...camps.value, i];
          mapVersion.value++;
        },
      };
      ctx.provide(WoldKey, api);
    },
  };
}
