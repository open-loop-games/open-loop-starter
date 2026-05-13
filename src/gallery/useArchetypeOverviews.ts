/**
 * Eager `?raw` loaders for each archetype's `overview.md`. Vite resolves
 * the glob at build time, so the index is synchronous and small (one
 * paragraph per archetype).
 */
const overviewsByPath = import.meta.glob('@/archetypes/*/overview.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const overviewsById: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [path, body] of Object.entries(overviewsByPath)) {
    const match = path.match(/archetypes\/([^/]+)\/overview\.md$/);
    if (match) out[match[1]] = body;
  }
  return out;
})();

export function loadArchetypeOverview(id: string): string | null {
  return overviewsById[id] ?? null;
}
