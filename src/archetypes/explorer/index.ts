/**
 * Explorer archetype — public API.
 *
 * Games under src/modules/mods/<game>/vars/ import types and defaults from
 * here, or (once codegen lands) receive copies emitted by
 * `pnpm codegen:archetype-vars explorer`.
 */
export type {
  ExplorerArchetypeVars,
  ExplorerThemeVars,
  ExplorerBalanceVars,
  ExplorerVars,
  ExplorerVarsOverride,
  ExplorerBalanceVarsOverride,
  AdjacencyTopology,
  ItemIdentityMode,
  MapStyleHint,
  ZoneUnlockRequirement,
  ActionCost,
  ZoneUnlockThreshold,
  EquipmentRecipe,
} from './types';

export {
  DEFAULT_EXPLORER_ARCHETYPE_VARS,
  DEFAULT_EXPLORER_THEME_VARS,
  DEFAULT_EXPLORER_BALANCE_VARS,
  DEFAULT_EXPLORER_VARS,
} from './vars';

export { loadExplorerVars } from './load';
