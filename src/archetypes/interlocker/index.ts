/**
 * Interlocker archetype — public API.
 *
 * Games under src/modules/mods/<game>/vars/ import types and defaults from
 * here, or (once codegen lands) receive copies emitted by
 * `pnpm codegen:archetype-vars interlocker`.
 */
export type {
  InterlockerArchetypeVars,
  InterlockerThemeVars,
  InterlockerBalanceVars,
  InterlockerVars,
  InterlockerVarsOverride,
  InterlockerBalanceVarsOverride,
  GraphCompletenessPolicy,
  SynergyEffect,
  Recipe,
  Synergy,
  TechCost,
} from './types';

export {
  DEFAULT_INTERLOCKER_ARCHETYPE_VARS,
  DEFAULT_INTERLOCKER_THEME_VARS,
  DEFAULT_INTERLOCKER_BALANCE_VARS,
  DEFAULT_INTERLOCKER_VARS,
} from './defaults';

export { loadInterlockerVars } from './load';
