/**
 * Parser regression net for steps 2–5.
 *
 * Parses every archetype doc and asserts the manifest has the fields the
 * downstream validator + codegen consume. Deliberately shallow — rule-level
 * assertions live in scripts/validate-archetypes/validate.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { basename } from 'node:path';
import { CANONICAL_SECTIONS, findArchetypeDocs, parseArchetypeDoc } from './parser';

const docs = findArchetypeDocs();

describe('archetype parser', () => {
  it('discovers at least one archetype doc', () => {
    expect(docs.length).toBeGreaterThan(0);
  });

  for (const filePath of docs) {
    describe(basename(filePath), () => {
      const manifest = parseArchetypeDoc(filePath);

      it('parses a non-empty status', () => {
        expect(manifest.status).not.toBeNull();
      });

      it('parses all 11 canonical sections', () => {
        for (const num of Object.keys(CANONICAL_SECTIONS).map(Number)) {
          expect(manifest.sections.get(num), `§ ${num}`).toBeDefined();
        }
      });

      it('extracts exemplar line', () => {
        expect(manifest.exemplarLine).not.toBeNull();
      });

      it('preserves raw markdown', () => {
        expect(manifest.markdown.length).toBeGreaterThan(0);
      });
    });
  }
});
