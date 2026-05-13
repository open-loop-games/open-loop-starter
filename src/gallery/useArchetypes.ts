/**
 * Gallery archetype enumeration.
 *
 * The gallery has zero per-archetype knowledge. It enumerates manifests via
 * `import.meta.glob` over `@/archetypes/*\/index.ts` (eager so the type can
 * be consumed synchronously) and obtains each archetype's `createApp()`
 * factory the same way. The `createApp()` access is wrapped in a per-id
 * lazy boot helper so the strip-cleanliness lint can confirm no static
 * `from '@/archetypes/<name>'` imports exist anywhere under `src/gallery/`.
 */
import type { Component } from 'vue';
import type { Engine } from '@open-loop/engine';
import type { ArchetypeManifest } from '@/types';
import type { ArchetypeBootResult } from '@/ui/sandbox';

interface ArchetypeIndexModule {
  manifest: ArchetypeManifest;
  createApp: (overrides?: unknown) => {
    engine: Engine;
    app: import('vue').App;
    mount: (target: string | Element) => void;
  };
}

const indexModules = import.meta.glob<ArchetypeIndexModule>('@/archetypes/*/index.ts', {
  eager: true,
});

export interface GalleryArchetype {
  manifest: ArchetypeManifest;
  /** Lazy factory: defers calling `createApp()` until the sandbox mounts. */
  boot: () => Promise<ArchetypeBootResult>;
}

function buildEntries(): GalleryArchetype[] {
  const entries: GalleryArchetype[] = [];
  for (const mod of Object.values(indexModules)) {
    if (!mod || typeof mod !== 'object') continue;
    const manifest = (mod as ArchetypeIndexModule).manifest;
    if (!manifest) continue;
    const createApp = (mod as ArchetypeIndexModule).createApp;
    entries.push({
      manifest,
      boot: async () => {
        const result = createApp();
        return { engine: result.engine, app: result.app, mount: result.mount };
      },
    });
  }
  entries.sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
  return entries;
}

const archetypes = buildEntries();

export function listArchetypes(): GalleryArchetype[] {
  return archetypes;
}

export function findArchetype(id: string): GalleryArchetype | undefined {
  return archetypes.find((a) => a.manifest.id === id);
}

/**
 * Optional shell-component lookup for the gallery's "Shell:" classification
 * line. Returns the resolved `<lib>/shells/*.vue` component when the
 * manifest's `shell` field matches a known shell name; otherwise undefined
 * (declared-invention case, e.g. tug's `TugFrameLayout`). Imported eagerly
 * for type-safety; payload is small.
 */
import * as libShells from '@/lib/shells';

export function resolveShellComponent(name: string): Component | undefined {
  const reg = libShells as unknown as Record<string, Component>;
  return reg[name];
}
