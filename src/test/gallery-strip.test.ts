/**
 * Strip-cleanliness lint for `src/showcase/gallery/` and `src/showcase/about/`.
 *
 * Fork workflow:
 *   rm -rf src/showcase/gallery/ src/showcase/about/
 *   <revert main.ts to a single archetype createApp().mount('#app')>
 *   <delete the other archetype directories>
 *
 * If anything under `src/showcase/gallery/**` or `src/showcase/about/**` hard-imports a
 * specific archetype (e.g. `from '@/showcase/archetypes/cycler'`), that strip
 * cascades into broken imports. Only `import.meta.glob(...)` over the
 * `@/showcase/archetypes/*\/index.ts` wildcard is allowed — the eager glob
 * vanishes with the gallery, so its bundle effect goes away too.
 *
 * The check is a textual scan over file sources loaded via Vite's
 * `?raw` glob — keeps the test free of node:fs/path imports while
 * still walking the on-disk source tree.
 */
import { describe, it, expect } from 'vitest';

const gallerySources = import.meta.glob('../showcase/gallery/**/*.{ts,vue}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const aboutSources = import.meta.glob('../showcase/about/**/*.{ts,vue}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

interface Hit {
  file: string;
  line: number;
  text: string;
}

/**
 * Strip block comments and line comments so the import scan doesn't
 * fire on documentation that *describes* a forbidden import shape.
 * Tracks block-comment state across lines; replaces commented spans
 * with whitespace to preserve line numbers and column offsets.
 */
function stripComments(source: string): string {
  const out: string[] = [];
  let inBlock = false;
  for (const line of source.split('\n')) {
    let cleaned = '';
    let i = 0;
    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', i);
        if (end === -1) {
          cleaned += ' '.repeat(line.length - i);
          i = line.length;
        } else {
          cleaned += ' '.repeat(end + 2 - i);
          i = end + 2;
          inBlock = false;
        }
      } else if (line.startsWith('/*', i)) {
        inBlock = true;
        cleaned += '  ';
        i += 2;
      } else if (line.startsWith('//', i)) {
        cleaned += ' '.repeat(line.length - i);
        i = line.length;
      } else {
        cleaned += line[i];
        i++;
      }
    }
    // Skip JSDoc continuation lines: leading whitespace then `*`.
    if (/^\s*\*/.test(cleaned) && !/^\s*\*\//.test(cleaned)) {
      cleaned = ' '.repeat(cleaned.length);
    }
    out.push(cleaned);
  }
  return out.join('\n');
}

function findHardImports(source: string, file: string): Hit[] {
  const hits: Hit[] = [];
  const cleaned = stripComments(source);
  const cleanedLines = cleaned.split('\n');
  const originalLines = source.split('\n');
  // `from '@/showcase/archetypes/<name>...'` (static) — `<name>` may not begin
  // with `*`, which is the only allowed glob-pattern reference.
  const STATIC_IMPORT = /from\s+['"]@\/showcase\/archetypes\/(?!\*)/;
  // `import('@/showcase/archetypes/<name>')` (dynamic) — also disallowed: nothing
  // in the gallery should be calling a specific archetype, even lazily.
  // Allowed: `import.meta.glob('@/showcase/archetypes/*\/...')`.
  const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]@\/showcase\/archetypes\/(?!\*)/;
  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i];
    if (STATIC_IMPORT.test(line) || DYNAMIC_IMPORT.test(line)) {
      hits.push({ file, line: i + 1, text: originalLines[i].trim() });
    }
  }
  return hits;
}

describe('gallery strip-cleanliness', () => {
  it('nothing under src/showcase/gallery/** hard-imports @/showcase/archetypes/<name>', () => {
    const files = Object.entries(gallerySources);
    expect(files.length).toBeGreaterThan(0);
    const hits: Hit[] = [];
    for (const [file, source] of files) {
      hits.push(...findHardImports(source, file));
    }
    expect(
      hits,
      hits.length
        ? `Hard-imports of specific archetypes break the fork strip:\n${hits
            .map((h) => `  ${h.file}:${h.line}  ${h.text}`)
            .join('\n')}`
        : '',
    ).toEqual([]);
  });

  it('nothing under src/showcase/about/** hard-imports @/showcase/archetypes/<name>', () => {
    // about/ may legitimately be md-only (no .ts/.vue files). That's fine —
    // there's nothing to scan, and nothing to break.
    const hits: Hit[] = [];
    for (const [file, source] of Object.entries(aboutSources)) {
      hits.push(...findHardImports(source, file));
    }
    expect(hits).toEqual([]);
  });
});
