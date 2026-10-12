/**
 * Eager `?raw` loader for each archetype's identity doc. Vite resolves the
 * glob at build time, so the index is synchronous.
 *
 * Each archetype has one identity doc, `IDENTITY.md`.
 */
const identityByPath = import.meta.glob('@/showcase/archetypes/*/IDENTITY.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const docsById: Record<string, string> = (() => {
  const out: Record<string, string> = {};
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
 * The one-line pitch for a gallery card: skips a leading `# heading`, then
 * returns the first paragraph with any leading `>` blockquote markers stripped
 * — so an `IDENTITY.md` yields its identity-line blockquote.
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
