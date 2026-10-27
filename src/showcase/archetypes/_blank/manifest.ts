import type { ArchetypeManifest } from '@/types';

/**
 * The blank skeleton hoisted by `pnpm eject --clean`. Not a canonical archetype
 * — it carries no engine primitives, beats, or exemplars, and is filtered out
 * of the gallery (leading-underscore dir). Eject rewrites this to the slim
 * `GameManifest` identity form on hoist.
 */
export const manifest: ArchetypeManifest = {
  id: 'game',
  displayName: 'Game',
  primitives: [],
  beats: [],
  shell: 'ColumnShell',
  formFactor: 'responsive',
};
