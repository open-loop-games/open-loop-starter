/**
 * Archetype-doc validator — test harness.
 *
 * Runs the validator rules against every archetype doc in archetypes/ and
 * fails the test run if any doc reports violations. Invoked via
 * `pnpm validate:archetypes` or as part of `pnpm test`.
 */
import { describe, it, expect } from 'vitest';
import { basename } from 'node:path';
import { findArchetypeDocs, parseArchetypeDoc, runAllRules } from './validate';

const docs = findArchetypeDocs();

describe('archetype docs', () => {
  it('has at least one archetype doc to validate', () => {
    expect(docs.length).toBeGreaterThan(0);
  });

  for (const filePath of docs) {
    describe(basename(filePath), () => {
      const doc = parseArchetypeDoc(filePath);
      const violations = runAllRules(doc);

      it('passes all structural rules', () => {
        if (violations.length > 0) {
          const grouped = violations.reduce<Record<string, string[]>>((acc, v) => {
            (acc[v.rule] ??= []).push(v.message);
            return acc;
          }, {});
          const report = Object.entries(grouped)
            .map(([rule, msgs]) => `  [${rule}]\n    - ${msgs.join('\n    - ')}`)
            .join('\n');
          throw new Error(`${violations.length} violation(s):\n${report}`);
        }
        expect(violations).toEqual([]);
      });
    });
  }
});
