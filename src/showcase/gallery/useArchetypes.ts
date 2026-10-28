/**
 * Gallery archetype enumeration.
 *
 * The gallery has zero per-archetype knowledge. It enumerates manifests via
 * `import.meta.glob` over `@/showcase/archetypes/*\/manifest.ts`, eager because a
 * manifest is plain data the cards read synchronously. Each archetype's
 * `index.ts` loads only when the sandbox boots it, so every story is its own
 * chunk and a story's renderer downloads only with that story. The strip-cleanliness
 * lint confirms no static `from '@/showcase/archetypes/<name>'` imports exist
 * anywhere under `src/gallery/`.
 */
import type { Component } from 'vue';
import type { Engine } from '@open-loop/engine';
import type { ArchetypeManifest } from '@/types';
import type { ArchetypeBootResult } from '@/showcase/sandbox';

interface ArchetypeIndexModule {
  createApp: (overrides?: unknown) => {
    engine: Engine;
    app: import('vue').App;
    mount: (target: string | Element) => void;
  };
}

const manifests = import.meta.glob<ArchetypeManifest>('@/showcase/archetypes/*/manifest.ts', {
  eager: true,
  import: 'manifest',
});
const indexLoaders = import.meta.glob<ArchetypeIndexModule>('@/showcase/archetypes/*/index.ts');

export interface GalleryArchetype {
  manifest: ArchetypeManifest;
  /** Loads the archetype's code, then calls its `createApp()`. */
  boot: () => Promise<ArchetypeBootResult>;
}

function buildEntries(): GalleryArchetype[] {
  const entries: GalleryArchetype[] = [];
  for (const [path, manifest] of Object.entries(manifests)) {
    // Skip underscore-prefixed dirs (e.g. `_blank`) — authoring skeletons the
    // gallery must not show, consistent with eject's archetype-list filter.
    if (/\/archetypes\/_/.test(path)) continue;
    const load = indexLoaders[path.replace(/manifest\.ts$/, 'index.ts')];
    if (!manifest || !load) continue;
    entries.push({
      manifest,
      boot: async () => {
        const { createApp } = await load();
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
 * Shell-component lookup for the gallery's "Shell:" line. Returns the
 * `src/lib/shells/` component named by the leading word of the manifest's
 * `shell` field, or undefined when that name is a declared invention.
 * Imported eagerly for type-safety; payload is small.
 */
import * as libShells from '@/lib/shells';

export function resolveShellComponent(name: string): Component | undefined {
  const reg = libShells as unknown as Record<string, Component>;
  return reg[name.split(/\s/)[0]];
}
