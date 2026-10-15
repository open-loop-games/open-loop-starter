import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createYardModule } from './yard';
import { createBoardModule } from './board';

export { PackerTuningRegistryKey, type PackerTunableKey } from './tuning';
export { YardKey, getYard, type YardApi } from './yard';
export { BoardKey, RELATION_OFFSETS, getBoard, type BoardApi, type Placed } from './board';
export {
  boardTotal,
  cellKey,
  evaluateLayout,
  previewChange,
  type LayoutParams,
  type LayoutResult,
  type OccupancyView,
  type PieceResult,
  type Preview,
  type Term,
} from './layout';

/** The packer modules in dependency order: the registry, what salvage buys, then the board. */
export function createPackerModules(): EngineModule[] {
  return [createTuningModule(), createYardModule(), createBoardModule()];
}
