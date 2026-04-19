/**
 * Director archetype — public API.
 *
 * Games under src/modules/mods/<game>/vars/ import types and defaults from
 * here, or (once codegen lands) receive copies emitted by
 * `pnpm codegen:archetype-vars director`.
 */
export type {
  DirectorArchetypeVars,
  DirectorThemeVars,
  DirectorBalanceVars,
  DirectorVars,
  DirectorVarsOverride,
  DirectorFactionId,
  DirectorAiPersonality,
  DirectorTerrainKind,
  DirectorSymmetry,
} from './types';

export {
  DEFAULT_DIRECTOR_ARCHETYPE_VARS,
  DEFAULT_DIRECTOR_THEME_VARS,
  DEFAULT_DIRECTOR_BALANCE_VARS,
  DEFAULT_DIRECTOR_VARS,
} from './defaults';

export { loadDirectorVars } from './load';
