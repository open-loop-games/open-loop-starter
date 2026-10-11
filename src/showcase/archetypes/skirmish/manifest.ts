import type { ArchetypeManifest } from '@/types';

/**
 * Skirmish — continuous tactical RTS archetype. Two-sided, bot-vs-bot of
 * built-in AI first; pixi/webgl play field; player-playable as a stretch.
 * Scaffolded off `_blank`; the throwaway `game/*` placeholder economy it
 * inherited is DELETE-OR-RESHAPE and gets replaced as real modules land.
 */
export const manifest: ArchetypeManifest = {
  id: 'skirmish',
  displayName: 'Skirmish',
  primitives: [],
  beats: [],
  shell: 'SingleColumnShell',
  formFactor: 'responsive',
};
