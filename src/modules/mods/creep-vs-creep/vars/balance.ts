/**
 * Creep-vs-Creep — balance-layer vars.
 *
 * Tuning overrides over the Director defaults in
 * `src/archetypes/director/defaults.ts`. Fields left unset inherit from the
 * archetype default; only the values this consumer diverges on appear here.
 */
import type { DirectorVarsOverride } from '@/archetypes/director';

export const creepVsCreepBalance: NonNullable<DirectorVarsOverride['balance']> = {
  // Prototype reservoir target; Director default is 1000 but the 60×60 demo
  // shipped with 100 and is tuned for it. OL-607 revisits when tiered
  // hotspots + the 100×100 arena arrive.
  hotspotCapacity: 100,
};
