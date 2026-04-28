import type { EngineModule } from 'open-loop-engine';
import type { LooperData } from '../data/types';
import { createActionsModule } from './actions';
import { createArcModule } from './arc';
import { createCapabilitiesModule } from './capabilities';
import { createCategoriesModule } from './categories';
import { createLoopModule } from './loop';
import { createManaModule } from './mana';
import { createQueueModule } from './queue';
import { createZonesModule } from './zones';

export {
  InitialManaKey,
  LooperDataKey,
  LooperTuningRegistryKey,
  ManaAddedKey,
  ManaKey,
  ManaModuleKey,
  TimeSystemKey,
  TotalManaBudgetKey,
  type LooperManaModule,
  type LooperTunableKey,
  type LooperTunables,
} from './mana';
export { CapabilitiesKey, type LooperCapabilityState } from './capabilities';
export { ZonesKey } from './zones';
export { ActionsKey, type ActionState, type ActionsModule } from './actions';
export {
  QueueKey,
  QueueVersionKey,
  QueueShouldRestartKey,
  QueueRepeatLastActionKey,
  QueueManaNeededKey,
  QueueModuleKey,
  type QueueItemMeta,
  type QueueManaNeeded,
  type LooperQueueModule,
} from './queue';
export { LoopKey } from './loop';
export { ArcKey, type ArcState } from './arc';

/**
 * Compose the looper modules in dependency order:
 *   mana          (provides resource + mana ops + tunable registry + time)
 *   capabilities  (provides Level + Talent category)
 *   actions       (provides per-action state + tick(id, ticks))
 *   loop          (provides Loop instance — depends on actions for reset scope)
 *   zones         (provides ZoneSystem — UI grouping, no gating)
 *   queue         (provides Sequencer — depends on actions + capabilities + mana + loop)
 *   arc           (provides arc-closure latch — depends on loop + capabilities + zones)
 *   categories    (publishes CategoriesKey for BalanceWorkbench introspection)
 *
 * Each module closes over `data` at construction time. Overrides applied
 * upstream in `boot.ts::createLooperEngine` flow through unchanged.
 */
export function createLooperModules(data: LooperData): EngineModule[] {
  return [
    createManaModule(data),
    createCapabilitiesModule(data),
    createActionsModule(data),
    createLoopModule(data),
    createZonesModule(data),
    createQueueModule(data),
    createArcModule(data),
    createCategoriesModule(),
  ];
}
