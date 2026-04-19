/**
 * Ambient archetype — public API.
 *
 * Games under src/modules/mods/<game>/vars/ import types and defaults from
 * here, or (once codegen lands) receive copies emitted by
 * `pnpm codegen:archetype-vars ambient`.
 */
export type {
  AmbientArchetypeVars,
  AmbientThemeVars,
  AmbientBalanceVars,
  AmbientVars,
  AmbientVarsOverride,
} from './types';

export {
  DEFAULT_AMBIENT_ARCHETYPE_VARS,
  DEFAULT_AMBIENT_THEME_VARS,
  DEFAULT_AMBIENT_BALANCE_VARS,
  DEFAULT_AMBIENT_VARS,
} from './defaults';

export { loadAmbientVars } from './load';
