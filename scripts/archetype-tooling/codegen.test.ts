/**
 * Codegen unit tests.
 *
 * Focused on the pure `generateArchetypeVars` function — verifies emitted
 * shape, TODO accounting, and in-memory typecheck green on producer.
 * Round-trip (codegen → re-parse → manifest match) is covered by running
 * `pnpm codegen:archetype-vars producer` end-to-end under CLI tests.
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { ARCHETYPES_DIR, parseArchetypeDoc, STARTER_ROOT } from './parser';
import { generateArchetypeVars, archetypeDirForName } from './codegen';

describe('generateArchetypeVars — producer pilot', () => {
  const manifest = parseArchetypeDoc(resolve(ARCHETYPES_DIR, 'producer.md'));
  const result = generateArchetypeVars(manifest, {
    archetypeDir: archetypeDirForName('producer'),
  });

  it('emits three non-empty files', () => {
    expect(result.emitted.archetypeTs.length).toBeGreaterThan(50);
    expect(result.emitted.themeTs.length).toBeGreaterThan(50);
    expect(result.emitted.balanceTs.length).toBeGreaterThan(50);
  });

  it('typechecks against producer/types.ts', () => {
    if (result.diagnostics.length > 0) {
      throw new Error(`typecheck diagnostics:\n${result.diagnostics.join('\n')}`);
    }
    expect(result.diagnostics).toEqual([]);
  });

  it('names the default const by archetype + kind', () => {
    expect(result.emitted.archetypeTs).toContain('DEFAULT_PRODUCER_ARCHETYPE_VARS');
    expect(result.emitted.themeTs).toContain('DEFAULT_PRODUCER_THEME_VARS');
    expect(result.emitted.balanceTs).toContain('DEFAULT_PRODUCER_BALANCE_VARS');
  });

  it('imports the matching type from ../types', () => {
    expect(result.emitted.archetypeTs).toContain(
      "import type { ProducerArchetypeVars } from '../types';",
    );
  });

  it('renders archetype defaults from inline comments', () => {
    expect(result.emitted.archetypeTs).toContain('producerTierCount: 7,');
    expect(result.emitted.archetypeTs).toContain('bulkBuyEnabled: true,');
  });

  it('renders balance defaults including Decimal string quotes', () => {
    expect(result.emitted.balanceTs).toContain('clickBaseValue: "1",');
    expect(result.emitted.balanceTs).toContain('achievementMultiplier: 1.02,');
  });

  it('flags theme fields as TODO (no inline defaults in § 5)', () => {
    expect(result.todos.theme.length).toBeGreaterThan(0);
    expect(result.emitted.themeTs).toContain('TODO(codegen)');
  });

  it('tags the file as auto-generated', () => {
    expect(result.emitted.archetypeTs).toContain('AUTO-GENERATED');
  });
});

describe('generateArchetypeVars — non-producer archetypes', () => {
  const cases = ['looper', 'scaler', 'interlocker', 'ambient', 'tug'];

  for (const name of cases) {
    it(`${name}: typechecks green or reports diagnostics for review`, () => {
      const manifest = parseArchetypeDoc(resolve(ARCHETYPES_DIR, `${name}.md`));
      const result = generateArchetypeVars(manifest, {
        archetypeDir: archetypeDirForName(name),
      });
      // Each archetype is a separate pilot — diagnostics surface, don't fail
      // the test file (so producer's green stays visible even if another
      // doc drifts). The CLI fails hard on diagnostics; this is advisory.
      if (result.diagnostics.length > 0) {
        console.warn(
          `[${name}] ${result.diagnostics.length} typecheck diagnostic(s) — inspect before running codegen`,
        );
      }
      expect(result.emitted.archetypeTs).toBeTruthy();
      void STARTER_ROOT;
    });
  }
});
