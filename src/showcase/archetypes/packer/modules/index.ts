import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createFleetModule } from './fleet';
import { createYardModule } from './yard';
import { createBoardModule } from './board';
import { createLineModule } from './line';

export { PackerTuningRegistryKey, type PackerTunableKey } from './tuning';
export { FleetKey, getFleet, type FleetApi, type SectorCarrier } from './fleet';
export { YARD_CONTEXT, YardKey, getYard, refitBeat, type YardApi } from './yard';
export {
  BOARD_CONTEXT,
  BoardKey,
  FACING_STEP,
  RELATION_OFFSETS,
  getBoard,
  type BoardApi,
  type Placed,
} from './board';
export { LineKey, RAISED_HULL_RATIO, getLine, type Engagement, type LineApi } from './line';
export {
  cellKey,
  compileLattice,
  emptyFit,
  evaluateLayout,
  latticeTotals,
  overlayView,
  previewChange,
  runsCold,
  underConditions,
  PIECE_INDEX,
  type Coord,
  type Lattice,
  type LatticeFit,
  type LayoutParams,
  type LayoutResult,
  type LinkBoosterId,
  type OccupancyView,
  type PieceResult,
  type Preview,
  type Term,
  type WeaponId,
} from './layout';

/**
 * The packer modules in dependency order: the registry, what a recommission keeps, what
 * salvage buys, the board, then the breach line.
 */
export function createPackerModules(): EngineModule[] {
  return [
    createTuningModule(),
    createFleetModule(),
    createYardModule(),
    createBoardModule(),
    createLineModule(),
  ];
}
