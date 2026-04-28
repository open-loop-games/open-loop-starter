/**
 * Gallery is the landing surface. The gallery enumerates archetypes via
 * `import.meta.glob('@/archetypes/*\/index.ts')` and mounts each demo
 * through `src/ui/sandbox/SandboxWrapper.vue`.
 *
 * Forks delete `src/gallery/` and `src/about/`, then revert this file to
 * a single archetype boot:
 *
 * ```ts
 * import { createApp } from '@/archetypes/producer';
 * import '@/lib/styles/reset.css';
 * import '@/lib/styles/tokens.css';
 * import './styles/base.css';
 * import './styles/theme-widgets.css';
 * const { mount } = createApp();
 * mount('#app');
 * ```
 */
import { createApp } from 'vue';
import { GalleryApp } from '@/gallery';
import '@/lib/styles/reset.css';
import '@/lib/styles/tokens.css';
import './styles/base.css';
import './styles/theme-widgets.css';

createApp(GalleryApp).mount('#app');
