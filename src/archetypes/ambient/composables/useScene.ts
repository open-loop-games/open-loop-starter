import { useModule } from '@/composables/useModule';
import { SceneKey, type SceneState } from '../modules';

/**
 * Access the scene state — `zones` for unlock-set introspection,
 * `currentVariantId` for the canvas's active-variant binding.
 */
export function useScene(): SceneState {
  return useModule(SceneKey);
}
