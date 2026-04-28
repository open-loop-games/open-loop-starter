import type { EngineModule } from 'open-loop-engine';
import type { LooperData } from '../data/types';
import { createActionsModule } from './actions';
import { createArcModule } from './arc';
import { createCapabilitiesModule } from './capabilities';
import { createCategoriesModule } from './categories';
import { createGoldModule } from './gold';
import { createLoopModule } from './loop';
import { createManaModule } from './mana';
import { createProgressVarsModule } from './progress-vars';
import { createQueueModule } from './queue';
import { createRegularVarsModule } from './regular-vars';
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
export { GoldKey, GoldModuleKey, type LooperGoldModule } from './gold';
export { CapabilitiesKey, type LooperCapabilityState } from './capabilities';
export { ProgressVarsKey, type LooperProgressVarState } from './progress-vars';
export {
  RegularVarsKey,
  type CheckOutcome,
  type LooperRegularVarsModule,
  type RegularVarState,
} from './regular-vars';
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
 *   gold          (provides gold resource + per-loop currency ops)
 *   capabilities  (provides Level + Talent category)
 *   regular-vars  (provides per-loop pool state + setRegularTotal API)
 *   progress-vars (provides progressVar skill category + level-up coupling
 *                   onto regularVars.setRegularTotal — installs after
 *                   regular-vars so the level-up callbacks close over an
 *                   already-injected setRegularTotal reference)
 *   actions       (provides per-action state + tick(id, ticks) with
 *                   discriminated dispatch over progress / regular / basic)
 *   loop          (provides Loop instance — depends on actions, capabilities,
 *                   gold, progress-vars, regular-vars for retention scope)
 *   zones         (provides ZoneSystem — UI grouping, no gating)
 *   queue         (provides Sequencer — depends on actions, capabilities,
 *                   mana, gold, progress-vars, loop for the stateView passed
 *                   to canStart predicates)
 *   arc           (provides arc-closure latch — depends on loop + capabilities + zones)
 *   categories    (publishes CategoriesKey for BalanceWorkbench introspection)
 *
 * Each module closes over `data` at construction time. Overrides applied
 * upstream in `boot.ts::createLooperEngine` flow through unchanged.
 */
export function createLooperModules(data: LooperData): EngineModule[] {
  return [
    createManaModule(data),
    createGoldModule(data),
    createCapabilitiesModule(data),
    createRegularVarsModule(data),
    createProgressVarsModule(data),
    createActionsModule(data),
    createLoopModule(data),
    createZonesModule(data),
    createQueueModule(data),
    createArcModule(data),
    createCategoriesModule(),
  ];
}
