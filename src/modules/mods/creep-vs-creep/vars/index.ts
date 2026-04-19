/**
 * Creep-vs-Creep — vars loader.
 *
 * Resolves the mod's layered vars against the Director archetype defaults.
 * Mod code calls `loadCreepVsCreepVars()` at module install time; tests pass
 * extra overrides to `loadCreepVsCreepVars(testOverride)` to perturb balance.
 *
 * Load order is archetype → theme → balance per
 * `open-loop-starter/archetypes/director.md` § 5; this loader is a thin wrapper
 * over `loadDirectorVars` that prepends this mod's three override bundles.
 */
import {
  loadDirectorVars,
  type DirectorVars,
  type DirectorVarsOverride,
} from '@/archetypes/director';
import { creepVsCreepArchetype } from './archetype';
import { creepVsCreepBalance } from './balance';
import { creepVsCreepTheme } from './theme';

const MOD_OVERRIDE: DirectorVarsOverride = {
  archetype: creepVsCreepArchetype,
  theme: creepVsCreepTheme,
  balance: creepVsCreepBalance,
};

export function loadCreepVsCreepVars(
  ...extraOverrides: DirectorVarsOverride[]
): DirectorVars {
  return loadDirectorVars(MOD_OVERRIDE, ...extraOverrides);
}

export type { DirectorVars, DirectorVarsOverride } from '@/archetypes/director';
