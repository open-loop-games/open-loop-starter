import {
  computed,
  createProducerCategory,
  createSpatialGrid,
  Decimal,
  ORTHOGONAL_OFFSETS,
  persistent,
  toNumber,
  tunable,
  watch,
  type ComputedRef,
  type EngineModule,
  type GridOffset,
  type InjectionKey,
  type ProducerCategory,
  type SpatialGrid,
} from '@open-loop/engine';
import {
  BEACON_GAIN,
  COOLANT_GAIN,
  DIRECTOR_BOOST,
  DIRECTOR_REACH,
  HULL_H,
  HULL_W,
  LANCE_DPS,
  LINK_BOOST,
  PIECE_BY_ID,
  PIECES,
  PULSE_DPS,
  RAIL_DPS,
  SALVAGE_PER_DAMAGE,
  TRACTOR_GAIN,
  sectionAt,
  tagsAt,
  type PieceDef,
  type PieceId,
  type RelationId,
} from '../data';
import { FleetKey } from './fleet';
import {
  evaluateLayout,
  previewChange,
  underConditions,
  type LayoutParams,
  type LayoutResult,
  type OccupancyView,
  type Preview,
  type WeaponId,
} from './layout';
import { PackerTuningRegistryKey } from './tuning';
import { YardKey } from './yard';

/**
 * Board module — the fitted lattice of the ship in service: where each module sits and
 * faces, what the layout fires and recovers under the sector's conditions, and the weapons
 * that turn it into salvage.
 *
 * Fabricating and fitting are two decisions. The fabricator raises a type's count, and a
 * module produces nothing until it is fitted into an open hull cell that takes it. `placed`
 * is the saved board; the SpatialGrid is an occupancy index rebuilt from it on load and kept
 * in step by `place` and `remove`. Mutate the board only through those two and `turn`. Its
 * persistent context is what a recommission clears.
 */

export interface Placed {
  id: string;
  type: PieceId;
  x: number;
  y: number;
  /** 0 bow, 1 starboard, 2 stern, 3 port; read only by a turning module */
  facing: number;
}

export interface BoardApi {
  placed: { readonly value: readonly Placed[] };
  layout: ComputedRef<LayoutResult>;
  /** board firepower after the firepower chain, in dps: what a carrier is tested against */
  firepower: ComputedRef<number>;
  /** salvage a second, read from the weapon producers */
  salvageRate: ComputedRef<number>;
  /** the strengths the layout reads, under the sector's conditions */
  params: ComputedRef<LayoutParams>;
  /** the strengths before the sector's conditions rewrite them */
  baseParams: ComputedRef<LayoutParams>;
  /** one producer per weapon type, paying salvage on its fitted output */
  weapons: ProducerCategory<PieceDef>;
  /** whether a cell of the ship in service is plated */
  isOpen(x: number, y: number): boolean;
  /** whether a module may be fitted to a cell: open, and tagged as its mount needs */
  takes(type: PieceId, x: number, y: number): boolean;
  occupantAt(x: number, y: number): Placed | null;
  openCells: ComputedRef<number>;
  /** copies of a type in the bay: fabricated and not fitted */
  stock(type: PieceId): number;
  canPlace(type: PieceId, x: number, y: number): boolean;
  /** fit a module from the bay; false when the cell is closed, taken or wrong for it, or the bay is empty */
  place(type: PieceId, x: number, y: number, facing?: number): boolean;
  /** lift a fitted module back into the bay */
  remove(id: string): void;
  /** turn a fitted module a quarter clockwise */
  turn(id: string): void;
  /** the board's change if `type` (or nothing) sat at (x, y), facing `facing`, instead */
  preview(type: PieceId | null, x: number, y: number, facing?: number): Preview;
  /** the board's change if two fitted modules traded cells */
  previewSwap(a: Placed, b: Placed): Preview;
  /** hull cells a module of `type` at (x, y) would reach */
  reach(type: PieceId, x: number, y: number, facing?: number): { x: number; y: number }[];
  /** the occupancy view the layout is evaluated over: an overlay of it evaluates a hypothetical */
  view: OccupancyView;
}

export const BoardKey: InjectionKey<BoardApi> = Symbol('packer/board') as InjectionKey<BoardApi>;

/** The board's persistent context: what a recommission clears. */
export const BOARD_CONTEXT = 'packer/board';

let api: BoardApi;

export function getBoard(): BoardApi {
  return api;
}

/** Corner-only adjacency: the four diagonals without the orthogonals. */
const CORNER_OFFSETS: readonly GridOffset[] = [
  { dx: 1, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: -1 },
];
/** The knight's-move template, the Arc Beacon's stamp. */
const KNIGHT_OFFSETS: readonly GridOffset[] = [
  { dx: 1, dy: 2 },
  { dx: 2, dy: 1 },
  { dx: 2, dy: -1 },
  { dx: 1, dy: -2 },
  { dx: -1, dy: -2 },
  { dx: -2, dy: -1 },
  { dx: -2, dy: 1 },
  { dx: -1, dy: 2 },
];
/** The cells each fixed relation reaches, as offsets from the module's own cell. A ray walks its facing. */
export const RELATION_OFFSETS: Record<Exclude<RelationId, 'ray'>, readonly GridOffset[]> = {
  none: [],
  orthogonal: ORTHOGONAL_OFFSETS,
  corners: CORNER_OFFSETS,
  knight: KNIGHT_OFFSETS,
};
/** One step along each facing: bow, starboard, stern, port. */
export const FACING_STEP: readonly GridOffset[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

export function createBoardModule(): EngineModule {
  return {
    id: BOARD_CONTEXT,
    dependencies: ['packer/yard'],
    install(ctx) {
      const registry = ctx.inject(PackerTuningRegistryKey);
      const yard = ctx.inject(YardKey);
      const fleet = ctx.inject(FleetKey);

      const placed = persistent<Placed[]>([], { id: 'placed' });
      const nextId = persistent<number>(1, { id: 'nextId' });

      const grid: SpatialGrid<string | null> = createSpatialGrid<string | null>({
        width: HULL_W,
        height: HULL_H,
        initializer: () => null,
      });
      const byId = new Map<string, Placed>();
      function rebuildGrid() {
        byId.clear();
        for (const p of placed.value) byId.set(p.id, p);
        grid.fill(() => null);
        for (const p of placed.value) grid.set(p.x, p.y, p.id);
      }
      ctx.onLoad(rebuildGrid);
      // A recommission clears `placed`; the index follows it.
      watch(
        () => placed.value,
        (now) => {
          if (now.length !== byId.size) rebuildGrid();
        },
        { flush: 'sync' },
      );

      const inHull = (x: number, y: number) => sectionAt(fleet.ship.value, x, y) >= 0;
      const isOpen = (x: number, y: number) =>
        yard.plated(sectionAt(fleet.ship.value, x, y)) && inHull(x, y);
      const takes = (type: PieceId, x: number, y: number) => {
        const mount = PIECE_BY_ID[type].mount;
        return isOpen(x, y) && (!mount || tagsAt(fleet.ship.value, x, y).includes(mount));
      };
      const openCells = computed(() => {
        let n = 0;
        for (let y = 0; y < HULL_H; y++) for (let x = 0; x < HULL_W; x++) if (isOpen(x, y)) n++;
        return n;
      });
      const occupantAt = (x: number, y: number) => {
        const id = grid.tryAt(x, y);
        return id ? (byId.get(id) ?? null) : null;
      };

      // TODO(expansion): a directional ray to the hull's edge — `neighbors` takes fixed offsets,
      // so a facing-dependent reach that stops at void is walked by hand.
      const view: OccupancyView = {
        occupantAt,
        *reach(x, y, relation, facing = 0) {
          if (relation === 'ray') {
            const { dx, dy } = FACING_STEP[facing]!;
            for (let cx = x + dx, cy = y + dy; inHull(cx, cy); cx += dx, cy += dy)
              yield { x: cx, y: cy };
            return;
          }
          if (relation !== 'none') yield* grid.neighbors(x, y, RELATION_OFFSETS[relation]);
        },
        *occupied() {
          yield* byId.values();
        },
        isOpen,
      };

      const pulseDps = tunable(registry, 'pieces/pulse/dps', () => PULSE_DPS);
      const railDps = tunable(registry, 'pieces/rail/dps', () => RAIL_DPS);
      const lanceDps = tunable(registry, 'pieces/lance/dps', () => LANCE_DPS);
      const capBoost = tunable(registry, 'pieces/capacitor/boost', () => LINK_BOOST);
      const tgtBoost = tunable(registry, 'pieces/targeting/boost', () => LINK_BOOST);
      const dirBoost = tunable(registry, 'pieces/director/boost', () => DIRECTOR_BOOST);
      const dirReach = tunable(registry, 'pieces/director/reach', () => DIRECTOR_REACH);
      const beaconGain = tunable(registry, 'pieces/beacon/gain', () => BEACON_GAIN);
      const coolantGain = tunable(registry, 'pieces/coolant/gain', () => COOLANT_GAIN);
      const tractorGain = tunable(registry, 'pieces/tractor/gain', () => TRACTOR_GAIN);
      const baseParams = computed<LayoutParams>(() => ({
        dps: { pulse: pulseDps.value, rail: railDps.value, lance: lanceDps.value },
        boost: { capacitor: capBoost.value, targeting: tgtBoost.value, director: dirBoost.value },
        beaconGain: beaconGain.value,
        coolantGain: coolantGain.value,
        tractorGain: tractorGain.value,
        rayRange: dirReach.value,
        closeQuarters: false,
      }));
      const params = computed(() => underConditions(baseParams.value, fleet.conditions.value));

      // Reading `placed` and the plated hull makes them dependencies; the grid itself is not reactive.
      const layout = computed(() => {
        void placed.value;
        void openCells.value;
        return evaluateLayout(view, params.value);
      });

      // One producer per weapon type, with no purchase: its count is 1, and its rate is the
      // salvage fitted, so the refits and honours reach salvage through its rate chain.
      const weapons = createProducerCategory<PieceDef>({
        id: 'weapons',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: yard.salvage,
          baseRate: () => SALVAGE_PER_DAMAGE * layout.value.salvageByType[def.id as WeaponId],
          trigger: 'continuous',
        }),
        mapState: (_def, producer) => {
          producer.rateChain.bind({ modifier: yard.firepowerChain, text: 'Refits and honours' });
        },
      });
      weapons.register(PIECES.filter((p) => p.role === 'weapon'));

      const salvageRate = computed(() =>
        toNumber(Decimal.fromValue(weapons.getTotalRate(yard.salvage))),
      );
      const firepower = computed(() => layout.value.total * yard.globalMult.value);

      // TODO(expansion): acquire-then-site stock — a purchasable's count minus the pieces sited
      // on the board. Nothing in the engine ties a count to placements, so the bay is derived
      // here (consumer-guide-recipes § Placement and occupancy).
      const stock = (type: PieceId) =>
        yard.owned(type) - placed.value.filter((p) => p.type === type).length;
      const canPlace = (type: PieceId, x: number, y: number) =>
        stock(type) > 0 && takes(type, x, y) && occupantAt(x, y) === null;

      function place(type: PieceId, x: number, y: number, facing = 0): boolean {
        if (!canPlace(type, x, y)) return false;
        const p: Placed = { id: `m${nextId.value++}`, type, x, y, facing };
        byId.set(p.id, p);
        grid.set(x, y, p.id);
        placed.value = [...placed.value, p];
        return true;
      }
      function remove(id: string) {
        const p = byId.get(id);
        if (!p) return;
        byId.delete(id);
        grid.set(p.x, p.y, null);
        placed.value = placed.value.filter((q) => q.id !== id);
      }
      function turn(id: string) {
        const p = byId.get(id);
        if (!p || !PIECE_BY_ID[p.type].turns) return;
        const turned = { ...p, facing: (p.facing + 1) % 4 };
        byId.set(id, turned);
        placed.value = placed.value.map((q) => (q.id === id ? turned : q));
      }

      api = {
        placed,
        layout,
        firepower,
        salvageRate,
        params,
        baseParams,
        weapons,
        isOpen,
        takes,
        occupantAt,
        openCells,
        stock,
        canPlace,
        place,
        remove,
        turn,
        preview: (type, x, y, facing = 0) =>
          previewChange(view, params.value, [
            { at: { x, y }, occupant: type ? { id: '~preview', type, facing } : null },
          ]),
        previewSwap: (a, b) =>
          previewChange(view, params.value, [
            { at: a, occupant: { id: b.id, type: b.type, facing: b.facing } },
            { at: b, occupant: { id: a.id, type: a.type, facing: a.facing } },
          ]),
        reach: (type, x, y, facing = 0) => [
          ...view.reach(x, y, PIECE_BY_ID[type].relation, facing),
        ],
        view,
      };
      ctx.provide(BoardKey, api);
    },
  };
}
