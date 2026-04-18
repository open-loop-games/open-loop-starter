/**
 * Looper archetype — public API.
 *
 * Games under src/modules/mods/<game>/vars/ import types and defaults from
 * here, or (once codegen lands) receive copies emitted by
 * `pnpm codegen:archetype-vars looper`.
 */
export type {
  LooperArchetypeVars,
  LooperThemeVars,
  LooperBalanceVars,
  LooperVars,
  LooperVarsOverride,
  LoopTriggerMode,
  QueueMode,
  AutomationUnlockTier,
  XpToLevelFormula,
  ZoneUnlockTrigger,
  ZoneUnlockThreshold,
} from './types';

export {
  DEFAULT_LOOPER_ARCHETYPE_VARS,
  DEFAULT_LOOPER_THEME_VARS,
  DEFAULT_LOOPER_BALANCE_VARS,
  DEFAULT_LOOPER_VARS,
} from './defaults';

export { loadLooperVars } from './load';
