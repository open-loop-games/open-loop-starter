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
  FROZEN_BAND,
  LODGE,
  MAP_H,
  MAP_SEED,
  MAP_W,
  TERRAIN,
  WAYFINDER_TILES,
  herdRegrowSeconds,
  speciesById,
  type TrophyId,
} from '../data';
import { ChronicleKey } from './chronicle';
import { LodgeKey } from './lodge';
import { ExplorerTuningRegistryKey } from './tuning';
import { generateMap, tileIndex, type Tile } from './wold-map';

/**
 * Wold module — the map and what is on it: the fogged chart and the notes a trip
 * has not yet banked, the herds and their regrowth, the water, the camps, the
 * looted features, the terrain sighted, the trophies that change the ground,
 * and the Wayfinder ranks charting earns. The huntsman walks it; this module
 * answers what is where, what can be walked, and what each step costs.
 */

export interface WayfinderDef {
  id: string;
  tiles: number;
}

/** What a step is paid in: jerky, or water. */
export type StepCost = 'jerky' | 'water';

export interface WoldApi {
  tiles: readonly Tile[];
  grid: SpatialGrid<Tile>;
  /** bumped whenever the board changes, since grid cells are not Vue-reactive */
  mapVersion: Ref<number>;
  /** tiles on the banked chart */
  chartedCount: Ref<number>;
  /** tiles charted this trip and not yet banked at the lodge or a camp */
  notesCount: Ref<number>;
  /** head left on each herd tile */
  stock: Persistent<number[]>;
  /** tile indices of the waystones a camp stands on */
  camps: Persistent<number[]>;
  /** tile indices of the lookouts and caches already used */
  looted: Persistent<number[]>;
  trophies: Persistent<TrophyId[]>;
  /** terrain sighted so far; gear cards and bestiary rows reveal from it */
  zones: ZoneSystem;
  wayfinder: AchievementCategory<WayfinderDef>;
  /** charting radius around the huntsman */
  sight: ComputedRef<number>;
  /** jerky one tile costs, hounds included */
  stepCost: ComputedRef<number>;
  /** water one tile costs */
  waterPerStep: ComputedRef<number>;
  tileAt(x: number, y: number): Tile;
  isCamp(i: number): boolean;
  isRestock(x: number, y: number): boolean;
  /** water refills here: the lodge well, an unfrozen spring or river, the Fen's meres, a camp's well */
  isWaterSource(x: number, y: number): boolean;
  hasTrophy(id: TrophyId): boolean;
  /** impassable ground: rocks, thickets and crags, and the meres until the coracle */
  isBlocked(t: Tile): boolean;
  hasGearFor(t: Tile): boolean;
  /** open, charted, and the huntsman owns the gear its ground needs */
  walkable(t: Tile, x: number, y: number): boolean;
  /** jerky from every tile to the nearest restock point (the lodge or a built camp) */
  homeField(): Float64Array;
  /** water from every tile to the nearest water source */
  waterField(): Float64Array;
  /** the cost of reaching every tile from `from`, in jerky or in water */
  fieldFrom(from: GridCoord, cost?: StepCost): Float64Array;
  /** chart every tile within `radius` into this trip's notes, and sight any new terrain */
  reveal(x: number, y: number, radius: number): void;
  /** mark a feature used; a lookout used this trip is un-used again if its notes are lost */
  loot(i: number): void;
  /** bank this trip's notes into the chart */
  bankNotes(): void;
  /** lose this trip's notes: the chart falls back to what was banked */
  loseNotes(): void;
  /** tile `i` is on the banked chart, not only in this trip's notes */
  isBanked(i: number): boolean;
  /** raise a camp on tile `i`; the caller has checked the waystone and paid */
  raiseCamp(i: number): void;
  grantTrophy(id: TrophyId): void;
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

      const stock = persistent<number[]>(
        tiles.map((t) => (t.herd ? speciesById.get(t.herd)!.herdSize : 0)),
        { id: 'stock' },
      );
      const camps = persistent<number[]>([], { id: 'camps' });
      const looted = persistent<number[]>([], { id: 'looted' });
      const trophies = persistent<TrophyId[]>([], { id: 'trophies' });
      const hasTrophy = (id: TrophyId): boolean => trophies.value.includes(id);

      const zones = createZoneSystem({
        zones: TERRAIN.map((t) => ({ id: t.id, displayName: t.displayName, order: t.band })),
        initiallyUnlocked: ['meadow'],
      });

      // === THE CHART AND THE NOTES ===
      // The grid's explored mask is everything the huntsman can see on his chart:
      // the banked chart plus this trip's notes. The banked mask is kept beside it,
      // so losing the notes is one copy back.

      const banked = new Uint8Array(tiles.length);
      const charted = persistent<number[]>([], { id: 'charted' });
      const notes = persistent<number[]>([], { id: 'notes' });
      /** lookouts used this trip: their sight is part of the notes */
      const tripLooted = persistent<number[]>([], { id: 'tripLooted' });

      const mapVersion = ref(0);
      const chartedCount = ref(0);
      const notesCount = ref(0);
      const recount = () => {
        let b = 0;
        for (let i = 0; i < banked.length; i++) b += banked[i];
        chartedCount.value = b;
        notesCount.value = grid.exploredCount - b;
        mapVersion.value++;
      };
      grid.on('fovUpdated', recount);
      grid.on('maskChanged', recount);

      // === WAYFINDING ===
      // Wayfinder ranks count the banked chart: notes are not yet knowledge.

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
      const waterPerStep = tunable(registry, 'water/perStep', () => ANCHORS.waterPerStep);
      const tileAt = (x: number, y: number): Tile => tiles[tileIndex(x, y)];
      const isCamp = (i: number): boolean => camps.value.includes(i);
      const isLodge = (x: number, y: number): boolean => x === LODGE.x && y === LODGE.y;
      const isRestock = (x: number, y: number): boolean => isLodge(x, y) || isCamp(tileIndex(x, y));
      const isMere = (t: Tile): boolean => t.blocked && t.terrain === 'marsh';
      const isBlocked = (t: Tile): boolean => t.blocked && !(isMere(t) && hasTrophy('coracle'));
      const hasGearFor = (t: Tile): boolean => {
        const needs = TERRAIN[t.band].needs;
        return needs == null || lodge.gearLevel(needs) > 0;
      };
      const walkable = (t: Tile, x: number, y: number): boolean =>
        !isBlocked(t) && grid.explored[tileIndex(x, y)] === 1 && hasGearFor(t);
      const stepField = (t: Tile, x: number, y: number): number =>
        walkable(t, x, y) ? stepCost.value : Infinity;
      const waterStepField = (t: Tile, x: number, y: number): number =>
        walkable(t, x, y) ? waterPerStep.value : Infinity;

      /** A Fen tile beside a mere drinks from it; with the coracle, so does the mere. */
      const besideMere = (x: number, y: number): boolean => {
        for (const c of grid.neighbors(x, y)) if (isMere(tileAt(c.x, c.y))) return true;
        return false;
      };
      function isWaterSource(x: number, y: number): boolean {
        if (isLodge(x, y)) return true;
        const t = tileAt(x, y);
        if (t.water != null && t.band !== FROZEN_BAND) return true;
        if (t.terrain === 'marsh' && (isMere(t) || besideMere(x, y))) return true;
        return hasTrophy('mattock') && isCamp(tileIndex(x, y));
      }

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

      function bankNotes(): void {
        if (notesCount.value === 0 && tripLooted.value.length === 0) return;
        banked.set(grid.explored);
        tripLooted.value = [];
        recount();
      }

      function loseNotes(): void {
        grid.explored.set(banked);
        grid.markMaskChanged('explored');
        if (tripLooted.value.length) {
          const lost = new Set(tripLooted.value);
          looted.value = looted.value.filter((i) => !lost.has(i));
          tripLooted.value = [];
        }
      }

      // === HERDS ===
      // A depleted herd regrows one head per its band's regrowth period. A den
      // beast and the Hart are one of a kind and never regrow.

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
          if (sp.trophy || counts[i] >= sp.herdSize) continue;
          regrow[i] += dt;
          if (regrow[i] >= regrowSeconds[sp.band].value) {
            regrow[i] = 0;
            counts[i] += 1;
          }
        }
      });

      // === SAVE / LOAD ===
      // The masks are typed arrays; the banked chart and the notes are copied into
      // persistent arrays on save and back on load.

      ctx.onSave(() => {
        charted.value = Array.from(banked);
        const pending: number[] = [];
        for (let i = 0; i < banked.length; i++)
          if (grid.explored[i] === 1 && banked[i] === 0) pending.push(i);
        notes.value = pending;
      });
      ctx.onLoad(() => {
        if (charted.value.length !== tiles.length) return;
        banked.set(charted.value);
        grid.explored.set(charted.value);
        for (const i of notes.value) grid.explored[i] = 1;
        grid.markMaskChanged('explored');
      });

      api = {
        tiles,
        grid,
        mapVersion,
        chartedCount,
        notesCount,
        stock,
        camps,
        looted,
        trophies,
        zones,
        wayfinder,
        sight,
        stepCost,
        waterPerStep,
        tileAt,
        isCamp,
        isRestock,
        isWaterSource,
        hasTrophy,
        isBlocked,
        hasGearFor,
        walkable,
        homeField() {
          const sources: GridCoord[] = [
            LODGE,
            ...camps.value.map((i) => ({ x: i % MAP_W, y: Math.floor(i / MAP_W) })),
          ];
          return grid.distanceField(sources, stepField);
        },
        waterField() {
          const sources: GridCoord[] = [];
          for (let i = 0; i < tiles.length; i++) {
            const x = i % MAP_W;
            const y = Math.floor(i / MAP_W);
            if (grid.explored[i] === 1 && isWaterSource(x, y)) sources.push({ x, y });
          }
          return grid.distanceField(sources, waterStepField);
        },
        fieldFrom(from, cost = 'jerky') {
          return grid.distanceField([from], cost === 'water' ? waterStepField : stepField);
        },
        reveal,
        loot(i) {
          looted.value = [...looted.value, i];
          if (tiles[i].feature === 'lookout') tripLooted.value = [...tripLooted.value, i];
        },
        bankNotes,
        loseNotes,
        isBanked: (i) => banked[i] === 1,
        raiseCamp(i) {
          camps.value = [...camps.value, i];
          mapVersion.value++;
        },
        grantTrophy(id) {
          if (hasTrophy(id)) return;
          trophies.value = [...trophies.value, id];
          mapVersion.value++;
        },
      };
      ctx.provide(WoldKey, api);
    },
  };
}
