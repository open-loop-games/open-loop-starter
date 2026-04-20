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

      it('parses § 5 into three named interfaces', () => {
        const vars = manifest.varsSchema;
        expect(vars).toBeDefined();
        expect(vars!.archetype, 'archetype interface').not.toBeNull();
        expect(vars!.theme, 'theme interface').not.toBeNull();
        expect(vars!.balance, 'balance interface').not.toBeNull();
      });

      it('§ 5 interfaces expose at least one field each', () => {
        const vars = manifest.varsSchema!;
        expect(vars.archetype!.fields.length).toBeGreaterThan(0);
        expect(vars.theme!.fields.length).toBeGreaterThan(0);
        expect(vars.balance!.fields.length).toBeGreaterThan(0);
      });
    });
  }
});

describe('producer § 5 default extraction (spot check)', () => {
  it('pulls numeric + boolean + quoted defaults out of comments', () => {
    const producerPath = findArchetypeDocs().find((p) => p.endsWith('producer.md'))!;
    const manifest = parseArchetypeDoc(producerPath);
    const arch = manifest.varsSchema!.archetype!;
    const balance = manifest.varsSchema!.balance!;

    const tierCount = arch.fields.find((f) => f.name === 'producerTierCount')!;
    expect(tierCount.defaultExpr).toBe('7');
    expect(tierCount.typeText).toBe('number');

    const bulkBuy = arch.fields.find((f) => f.name === 'bulkBuyEnabled')!;
    expect(bulkBuy.defaultExpr).toBe('true');

    const clickBase = balance.fields.find((f) => f.name === 'clickBaseValue')!;
    // Trailing comment is `Decimal — default "1"`; extractor should pull "1".
    expect(clickBase.defaultExpr).toBe('"1"');
  });
});
