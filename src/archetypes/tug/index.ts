/**
 * Tug archetype — public API.
 *
 * Games under src/modules/mods/<game>/vars/ import types and defaults from
 * here, or (once codegen lands) receive copies emitted by
 * `pnpm codegen:archetype-vars tug`.
 */
export type {
  TugArchetypeVars,
  TugThemeVars,
  TugBalanceVars,
  TugVars,
  TugVarsOverride,
} from './types';

export {
  DEFAULT_TUG_ARCHETYPE_VARS,
  DEFAULT_TUG_THEME_VARS,
  DEFAULT_TUG_BALANCE_VARS,
  DEFAULT_TUG_VARS,
} from './defaults';

export { loadTugVars } from './load';
