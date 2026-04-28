/**
 * Lazy `?raw` loaders for archetype `.md` doc bodies.
 *
 * Vite's `import.meta.glob` with `query: '?raw'` produces a lazy map keyed
 * by the source-relative path. We index it by the manifest's `docPath`
 * (e.g. `archetypes/producer.md`) so the gallery can fetch a doc on demand
 * without statically importing each one.
 */
type RawLoader = () => Promise<string>;

const rawByRelativePath = (() => {
  const docsAbsolute = import.meta.glob('/archetypes/*.md', {
    query: '?raw',
    import: 'default',
  }) as Record<string, RawLoader>;
  const out: Record<string, RawLoader> = {};
  for (const [absPath, loader] of Object.entries(docsAbsolute)) {
    const rel = absPath.replace(/^\//, '');
    out[rel] = loader;
  }
  return out;
})();

export async function loadArchetypeDoc(docPath: string): Promise<string | null> {
  const loader = rawByRelativePath[docPath];
  if (!loader) return null;
  return await loader();
}
