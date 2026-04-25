import { inject } from 'vue';
import type { Engine } from 'open-loop-engine';
import { SceneKey, type SceneState } from '../modules';

/**
 * Access the scene state — `zones` for unlock-set introspection,
 * `currentVariantId` for the canvas's active-variant binding.
 */
export function useScene(): SceneState {
  const engine = inject<Engine>('engine');
  const scene = engine?.tryInject(SceneKey);
  if (!scene) {
    throw new Error('useScene() called outside an active ambient engine');
  }
  return scene;
}
