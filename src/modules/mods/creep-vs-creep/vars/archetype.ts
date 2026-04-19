/**
 * Creep-vs-Creep — archetype-layer vars.
 *
 * Overrides over the Director archetype defaults at
 * `src/archetypes/director/defaults.ts`. Skeleton-level shape; changing
 * entries here is a "fork the skeleton" decision.
 */
import type { DirectorArchetypeVars } from '@/archetypes/director';

export const creepVsCreepArchetype: Partial<DirectorArchetypeVars> = {
  // The prototype arena is 60×60 while map-gen is still the OL-504 mirrored
  // cross-walls pipeline. OL-607 widens to the canonical 100×100 when the
  // vault + rock-scatter + 4-fold-rotational pipeline in MAP.md lands.
  mapWidth: 60,
  mapHeight: 60,
};
