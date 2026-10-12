import type { App } from 'vue';
import type { Engine } from '@open-loop/engine';

/**
 * Shape every archetype's `createApp()` must return so the gallery sandbox
 * can mount it in isolation and dispose it cleanly.
 *
 * `engine` and `app` give the sandbox the two handles needed for a clean
 * exit: `engine.dispose()` stops the game loop; `app.unmount()` runs Vue's
 * unmount chain (which fires onUnmounted in the archetype's AppRoot —
 * including any `body[data-archetype]` cleanup the archetype owns).
 *
 * Each archetype's `createApp(overrides?)` factory may return a wider
 * shape; the sandbox only depends on this subset.
 */
export interface ArchetypeBootResult {
  engine: Engine;
  app: App;
  mount: (target: string | Element) => void;
}

/**
 * Subset of `ArchetypeManifest` the sandbox depends on. Defined here as a
 * structural shape so the sandbox doesn't need to import the manifest type
 * (which carries gallery-presentation fields the sandbox doesn't use).
 */
export interface SandboxArchetype {
  id: string;
}
