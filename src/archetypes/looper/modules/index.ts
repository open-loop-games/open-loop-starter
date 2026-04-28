import type { EngineModule } from 'open-loop-engine';
import type { LooperData } from '../data/types';
import { createActionsModule } from './actions';
import { createArcModule } from './arc';
import { createCategoriesModule } from './categories';
import { createLoopModule } from './loop';
import { createManaModule } from './mana';
import { createQueueModule } from './queue';
import { createSkillsModule } from './skills';
import { createZonesModule } from './zones';

export {
  LooperDataKey,
  LooperTuningRegistryKey,
  ManaKey,
  ManaPoolMaxKey,
  TimeSystemKey,
  type LooperTunableKey,
  type LooperTunables,
} from './mana';
export { SkillsKey, type LooperSkillState } from './skills';
export { ZonesKey } from './zones';
export { ActionsKey, type ActionState, type ActionsModule } from './actions';
export { QueueKey, QueueVersionKey, type QueueItemMeta } from './queue';
export { LoopKey } from './loop';
export { ArcKey, type ArcState } from './arc';

/**
 * Compose the looper modules in dependency order:
 *   mana       (provides resource + tunable registry + time)
 *   skills     (provides skill category + retention helpers)
 *   actions    (provides per-action state + tick(id, dt))
 *   loop       (provides Loop instance — depends on actions for reset scope)
 *   zones      (provides ZoneSystem + watch-bridge — depends on actions + loop)
 *   queue      (provides Sequencer — depends on actions + zones + mana)
 *   arc        (provides arc-closure latch — depends on loop + skills + zones)
 *   categories (publishes CategoriesKey for BalanceWorkbench introspection)
 *
 * Each module closes over `data` at construction time. Overrides applied
 * upstream in `boot.ts::createLooperEngine` flow through unchanged.
 */
export function createLooperModules(data: LooperData): EngineModule[] {
  return [
    createManaModule(data),
    createSkillsModule(data),
    createActionsModule(data),
    createLoopModule(data),
    createZonesModule(data),
    createQueueModule(data),
    createArcModule(data),
    createCategoriesModule(),
  ];
}
