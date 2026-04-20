/**
 * Scripter archetype — public API.
 *
 * Games under src/modules/mods/<game>/vars/ import types and defaults from
 * here, or (once codegen lands) receive copies emitted by
 * `pnpm codegen:archetype-vars scripter`.
 */
export type {
  ScripterArchetypeVars,
  ScripterThemeVars,
  ScripterBalanceVars,
  ScripterVars,
  ScripterVarsOverride,
  ScripterBalanceVarsOverride,
  ScripterTierCeiling,
  ScripterAuthoringSurface,
  ScripterSafetyMode,
  ScripterCommandName,
  ScripterTier2UnlockThreshold,
  ScripterTier3UnlockThreshold,
  ScripterActionTiming,
  Tier2UnlockTrigger,
  Tier3UnlockTrigger,
} from './types';

export {
  DEFAULT_SCRIPTER_ARCHETYPE_VARS,
  DEFAULT_SCRIPTER_THEME_VARS,
  DEFAULT_SCRIPTER_BALANCE_VARS,
  DEFAULT_SCRIPTER_VARS,
} from './vars';

export { loadScripterVars } from './load';
