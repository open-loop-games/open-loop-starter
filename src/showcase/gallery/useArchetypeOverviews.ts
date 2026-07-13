/**
 * Eager `?raw` loaders for each archetype's identity doc. Vite resolves the
 * globs at build time, so the index is synchronous.
 *
 * The canonical doc is `IDENTITY.md` (see
 * `src/showcase/archetypes/README.md` § IDENTITY.md). `overview.md` is the
 * legacy filename still used by un-migrated archetypes; both globs run and
 * `IDENTITY.md` wins when an archetype carries both, so the doc-rename sweep
 * (studio/open-loop-starter#9) can migrate one archetype at a time without
 * dropping any from the gallery.
 */
const identityByPath = import.meta.glob('@/showcase/archetypes/*/IDENTITY.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const overviewByPath = import.meta.glob('@/showcase/archetypes/*/overview.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const docsById: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  // Legacy first, then IDENTITY.md overwrites — the canonical doc wins.
  for (const [path, body] of Object.entries(overviewByPath)) {
    const id = path.match(/archetypes\/([^/]+)\/overview\.md$/)?.[1];
    if (id) out[id] = body;
  }
  for (const [path, body] of Object.entries(identityByPath)) {
    const id = path.match(/archetypes\/([^/]+)\/IDENTITY\.md$/)?.[1];
    if (id) out[id] = body;
  }
  return out;
})();

export function loadArchetypeOverview(id: string): string | null {
  return docsById[id] ?? null;
}

/**
 * The one-line pitch for a gallery card. Robust to both doc shapes: skips a
 * leading `# heading`, then returns the first paragraph with any leading `>`
 * blockquote markers stripped — so a prose-first `overview.md` yields its pitch
 * paragraph and an `IDENTITY.md` yields its identity-line blockquote.
 */
export function archetypePitch(id: string): string {
  const md = docsById[id];
  if (!md) return '';
  const blocks = md.split(/\n\s*\n/);
  for (const block of blocks) {
    const cleaned = block
      .split('\n')
      .map((line) => line.replace(/^\s*>\s?/, '').trim())
      .join(' ')
      .trim();
    if (!cleaned || cleaned.startsWith('#')) continue; // skip the title heading
    // Strip inline emphasis so the plain-text card doesn't show literal markup.
    return cleaned
      .replace(/\*\*|`/g, '') // bold markers + code ticks
      .replace(/\*([^*]+)\*/g, '$1') // unwrap *italic*
      .replace(/\s+/g, ' ');
  }
  return '';
}
