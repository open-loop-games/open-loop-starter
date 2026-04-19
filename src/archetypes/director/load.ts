/**
 * Director archetype — vars loader.
 *
 * Deep-merges archetype → theme → balance in that load order. Callers pass
 * a game's three vars files (and optional test overrides) and get a
 * fully-resolved DirectorVars back.
 *
 * Deliberately a single function rather than a framework. Games that need
 * richer merge semantics (per-field precedence, environment overlays) fork
 * this file rather than growing it.
 */
import { DEFAULT_DIRECTOR_VARS } from './defaults';
import type { DirectorVars, DirectorVarsOverride } from './types';

export function loadDirectorVars(...overrides: DirectorVarsOverride[]): DirectorVars {
  return overrides.reduce<DirectorVars>(
    (acc, override) => mergeDirectorVars(acc, override),
    DEFAULT_DIRECTOR_VARS,
  );
}

function mergeDirectorVars(base: DirectorVars, override: DirectorVarsOverride): DirectorVars {
  return {
    archetype: { ...base.archetype, ...(override.archetype ?? {}) },
    theme: mergeTheme(base.theme, override.theme),
    balance: mergeBalance(base.balance, override.balance),
  };
}

function mergeTheme(
  base: DirectorVars['theme'],
  override: DirectorVarsOverride['theme'],
): DirectorVars['theme'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    factionNames: { ...base.factionNames, ...(override.factionNames ?? {}) },
    factionEssenceNames: { ...base.factionEssenceNames, ...(override.factionEssenceNames ?? {}) },
    factionColors: { ...base.factionColors, ...(override.factionColors ?? {}) },
    personalityNames: { ...base.personalityNames, ...(override.personalityNames ?? {}) },
  };
}

function mergeBalance(
  base: DirectorVars['balance'],
  override: DirectorVarsOverride['balance'],
): DirectorVars['balance'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    spreadTerrainMul: { ...base.spreadTerrainMul, ...(override.spreadTerrainMul ?? {}) },
    factionPersonalities: { ...base.factionPersonalities, ...(override.factionPersonalities ?? {}) },
  };
}
