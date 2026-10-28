import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findArchetype, listArchetypes } from '../useArchetypes';

const stories = readdirSync(join(process.cwd(), 'src/showcase/archetypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
  .map((d) => d.name);

describe('gallery archetypes', () => {
  it('lists every story by its manifest, and no underscore skeleton', () => {
    const ids = listArchetypes().map((a) => a.manifest.id);
    expect(ids).toHaveLength(stories.length);
    expect(ids).not.toContain('_blank');
  });

  // The first load transforms the story's whole module tree.
  it('loads a story and boots its engine on demand', async () => {
    const story = findArchetype(listArchetypes()[0].manifest.id);
    const result = await story!.boot();
    expect(result.engine).toBeDefined();
    result.app.unmount?.();
  }, 30_000);
});
