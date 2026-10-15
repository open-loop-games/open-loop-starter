import {
  computed,
  createProducerCategory,
  createSpatialGrid,
  Decimal,
  ORTHOGONAL_OFFSETS,
  persistent,
  toNumber,
  tunable,
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
  HULL_H,
  HULL_W,
  LINK_BOOST,
  PIECE_BY_ID,
  PIECES,
  PULSE_DPS,
  RAIL_DPS,
  SALVAGE_PER_DAMAGE,
  sectionAt,
  type PieceDef,
  type PieceId,
  type RelationId,
} from '../data';
import {
  evaluateLayout,
  previewChange,
  type LayoutParams,
  type LayoutResult,
  type OccupancyView,
  type Preview,
} from './layout';
import { PackerTuningRegistryKey } from './tuning';
import { YardKey } from './yard';

/**
 * Board module — the fitted lattice: where each module sits, what the layout fires, and
 * the weapons that turn firepower into salvage.
 *
 * Fabricating and fitting are two decisions. The fabricator raises a type's count, and a
 * module produces nothing until it is fitted into an open hull cell. `placed` is the saved
 * board; the SpatialGrid is an occupancy index rebuilt from it on load and kept in step by
 * `place` and `remove`. Mutate the board only through those two.
 */

export interface Placed {
  id: string;
  type: PieceId;
  x: number;
  y: number;
}

interface Cell {
  /** section that plates this cell: 0 is the core, -1 is void */
  section: number;
  occupant: string | null;
}

export interface BoardApi {
  placed: { readonly value: readonly Placed[] };
  layout: ComputedRef<LayoutResult>;
  /** board firepower after the firepower chain, in dps */
  firepower: ComputedRef<number>;
  /** salvage a second, read from the weapon producers */
  salvageRate: ComputedRef<number>;
  params: ComputedRef<LayoutParams>;
  /** one producer per weapon type, paying salvage on its fitted firepower */
  weapons: ProducerCategory<PieceDef>;
  isOpen(x: number, y: number): boolean;
  occupantAt(x: number, y: number): Placed | null;
  openCells: ComputedRef<number>;
  /** copies of a type in the bay: fabricated and not fitted */
  stock(type: PieceId): number;
  canPlace(type: PieceId, x: number, y: number): boolean;
  /** fit a module from the bay; false when the cell is closed or taken, or the bay is empty */
  place(type: PieceId, x: number, y: number): boolean;
  /** lift a fitted module back into the bay */
  remove(id: string): void;
  /** the board's change if `type`, or nothing, sat at (x, y) instead */
  preview(type: PieceId | null, x: number, y: number): Preview;
  /** the board's change if two fitted modules traded cells */
  previewSwap(a: Placed, b: Placed): Preview;
  /** in-bounds cells a module of `type` at (x, y) would reach */
  reach(type: PieceId, x: number, y: number): { x: number; y: number }[];
}

export const BoardKey: InjectionKey<BoardApi> = Symbol('packer/board') as InjectionKey<BoardApi>;

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
/** The cells each relation reaches, as offsets from the module's own cell. */
export const RELATION_OFFSETS: Record<RelationId, readonly GridOffset[]> = {
  none: [],
  orthogonal: ORTHOGONAL_OFFSETS,
  corners: CORNER_OFFSETS,
  knight: KNIGHT_OFFSETS,
};

export function createBoardModule(): EngineModule {
  return {
    id: 'packer/board',
    dependencies: ['packer/yard'],
    install(ctx) {
      const registry = ctx.inject(PackerTuningRegistryKey);
      const yard = ctx.inject(YardKey);

      const placed = persistent<Placed[]>([], { id: 'placed' });
      const nextId = persistent<number>(1, { id: 'nextId' });

      const grid: SpatialGrid<Cell> = createSpatialGrid<Cell>({
        width: HULL_W,
        height: HULL_H,
        initializer: (x, y) => ({ section: sectionAt(x, y), occupant: null }),
      });
      const byId = new Map<string, Placed>();
      function rebuildGrid() {
        byId.clear();
        for (const p of placed.value) byId.set(p.id, p);
        grid.fill((_x, _y, cell) => ({ ...cell, occupant: null }));
        for (const p of placed.value) grid.set(p.x, p.y, { ...grid.at(p.x, p.y), occupant: p.id });
      }
      ctx.onLoad(rebuildGrid);

      const isOpen = (x: number, y: number) =>
        grid.inBounds(x, y) && yard.plated(grid.at(x, y).section);
      const openCells = computed(() => {
        let n = 0;
        for (let y = 0; y < HULL_H; y++) for (let x = 0; x < HULL_W; x++) if (isOpen(x, y)) n++;
        return n;
      });
      const occupantAt = (x: number, y: number) => {
        const id = grid.tryAt(x, y)?.occupant;
        return id ? (byId.get(id) ?? null) : null;
      };

      const view: OccupancyView = {
        occupantAt,
        *reach(x, y, relation) {
          if (relation !== 'none') yield* grid.neighbors(x, y, RELATION_OFFSETS[relation]);
        },
        *occupied() {
          yield* byId.values();
        },
      };

      const pulseDps = tunable(registry, 'pieces/pulse/dps', () => PULSE_DPS);
      const railDps = tunable(registry, 'pieces/rail/dps', () => RAIL_DPS);
      const capBoost = tunable(registry, 'pieces/capacitor/boost', () => LINK_BOOST);
      const tgtBoost = tunable(registry, 'pieces/targeting/boost', () => LINK_BOOST);
      const beaconGain = tunable(registry, 'pieces/beacon/gain', () => BEACON_GAIN);
      const coolantGain = tunable(registry, 'pieces/coolant/gain', () => COOLANT_GAIN);
      const params = computed<LayoutParams>(() => ({
        dps: { pulse: pulseDps.value, rail: railDps.value },
        boost: { capacitor: capBoost.value, targeting: tgtBoost.value },
        beaconGain: beaconGain.value,
        coolantGain: coolantGain.value,
      }));

      // Reading `placed` makes the board a dependency; the grid itself is not reactive.
      const layout = computed(() => {
        void placed.value;
        return evaluateLayout(view, params.value);
      });

      // One producer per weapon type, with no purchase: its count is 1, and its rate is the
      // firepower fitted, so the refits reach salvage through its rate chain.
      const weapons = createProducerCategory<PieceDef>({
        id: 'weapons',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: yard.salvage,
          baseRate: () =>
            SALVAGE_PER_DAMAGE * layout.value.firepowerByType[def.id as 'pulse' | 'rail'],
          trigger: 'continuous',
        }),
        mapState: (_def, producer) => {
          producer.rateChain.bind({ modifier: yard.firepowerChain, text: 'Refit stack' });
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
        stock(type) > 0 && isOpen(x, y) && occupantAt(x, y) === null;

      function place(type: PieceId, x: number, y: number): boolean {
        if (!canPlace(type, x, y)) return false;
        const p: Placed = { id: `m${nextId.value++}`, type, x, y };
        byId.set(p.id, p);
        grid.set(x, y, { ...grid.at(x, y), occupant: p.id });
        placed.value = [...placed.value, p];
        return true;
      }
      function remove(id: string) {
        const p = byId.get(id);
        if (!p) return;
        byId.delete(id);
        grid.set(p.x, p.y, { ...grid.at(p.x, p.y), occupant: null });
        placed.value = placed.value.filter((q) => q.id !== id);
      }

      api = {
        placed,
        layout,
        firepower,
        salvageRate,
        params,
        weapons,
        isOpen,
        occupantAt,
        openCells,
        stock,
        canPlace,
        place,
        remove,
        preview: (type, x, y) =>
          previewChange(view, params.value, [
            { at: { x, y }, occupant: type ? { id: '~preview', type } : null },
          ]),
        previewSwap: (a, b) =>
          previewChange(view, params.value, [
            { at: a, occupant: { id: b.id, type: b.type } },
            { at: b, occupant: { id: a.id, type: a.type } },
          ]),
        reach: (type, x, y) => [...view.reach(x, y, PIECE_BY_ID[type].relation)],
      };
      ctx.provide(BoardKey, api);
    },
  };
}
