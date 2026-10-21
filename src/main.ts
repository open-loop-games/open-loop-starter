/**
 * Gallery is the landing surface. The gallery enumerates archetypes via
 * `import.meta.glob('@/showcase/archetypes/*\/index.ts')` and mounts each demo
 * through `src/showcase/sandbox/SandboxWrapper.vue`.
 *
 * `pnpm eject` deletes `src/showcase/` and rewrites this file to a single
 * archetype boot. A hand-written fork does the same. Keep the player-pref
 * runtime block, so the fork's settings (theme, notation, ui scale) apply at
 * app boot. Keep the styles first: the game's CSS must load after tokens.css,
 * or its token overrides lose the tie:
 *
 * ```ts
 * import '@/lib/styles/reset.css';
 * import '@/lib/styles/tokens.css';
 * import './styles/base.css';
 * import './styles/theme-widgets.css';
 * import { effectScope } from 'vue';
 * import { createApp } from '@/showcase/archetypes/cycler';
 * import { usePlayerPrefs } from '@/composables/usePlayerPrefs';
 * import { useNotation } from '@/composables/useNotation';
 * effectScope(true).run(() => { usePlayerPrefs(); useNotation(); });
 * const { mount } = createApp();
 * mount('#app');
 * ```
 */
import { createApp, effectScope } from 'vue';
import { GalleryApp } from '@/showcase/gallery';
import { usePlayerPrefs } from '@/composables/usePlayerPrefs';
import { useNotation } from '@/composables/useNotation';
import '@/lib/styles/reset.css';
import '@/lib/styles/tokens.css';
import './styles/base.css';
import './styles/theme-widgets.css';

// Page-lifetime player-pref runtime: theme + ui-scale + notation start
// applying immediately, before any demo is picked, so the gallery
// honours the player's last selection. Wrapped in an effectScope so
// Vue's watch APIs have an owner outside any component setup.
effectScope(true).run(() => {
  usePlayerPrefs();
  useNotation();
});

createApp(GalleryApp).mount('#app');
