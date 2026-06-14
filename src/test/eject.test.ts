/**
 * Locks for `pnpm eject` (scripts/eject.mjs).
 *
 * Two guarantees:
 *   1. The eject *plan* keeps its shape — hoist one archetype to `src/game`,
 *      delete the whole demo surface. A `--dry-run`-equivalent assertion that
 *      needs no node_modules, so it's a fast CI lock.
 *   2. Eject *stays safe* — no archetype statically or dynamically imports a
 *      sibling archetype or the gallery/sandbox. That isolation is the reason
 *      deleting the rest of the showcase can't break the archetype you keep;
 *      this test fails the moment a future port introduces cross-coupling.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — .mjs script, no types; we only touch the pure planner.
import { planEject, slug } from '../../scripts/eject.mjs';

const ROOT = process.cwd();

describe('eject plan', () => {
  it('hoists the chosen archetype and deletes the demo surface', () => {
    const plan = planEject(ROOT, 'producer', 'Cookie Tycoon');
    expect(plan.move).toEqual({ from: 'src/showcase/archetypes/producer', to: 'src/game' });
    expect(plan.rewriteMain).toBe('src/main.ts');
    expect(plan.gameId).toBe('cookie-tycoon');
    expect(plan.deletes).toContain('src/showcase');
    expect(plan.deletes).toContain('src/test/gallery-strip.test.ts');
    // Nothing in the plan deletes anything under what becomes the game.
    for (const d of plan.deletes) expect(d.startsWith('src/game')).toBe(false);
  });

  it('omits the game name when none is given', () => {
    const plan = planEject(ROOT, 'looper');
    expect(plan.gameId).toBeUndefined();
    expect(plan.packageName).toBeUndefined();
  });

  it('rejects an unknown archetype', () => {
    expect(() => planEject(ROOT, 'does-not-exist')).toThrow(/Unknown archetype/);
  });

  it('slugifies game names', () => {
    expect(slug('Cookie Tycoon!!')).toBe('cookie-tycoon');
  });
});

// Source of every archetype file, keyed by path, for the isolation scan.
const archetypeSources = import.meta.glob('../showcase/archetypes/**/*.{ts,vue}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** `…/archetypes/<name>/…` → `<name>`. */
function archetypeOf(path: string): string {
  return path.replace(/^.*\/archetypes\//, '').split('/')[0];
}

/** Quote-delimited import specifiers — `from '…'` and `import('…')`. Matching
 *  on the quoted specifier keeps prose comments from registering as imports. */
function importSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const re = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
  for (const m of source.matchAll(re)) specs.push(m[1]);
  return specs;
}

describe('eject safety — archetype isolation', () => {
  const names = new Set(Object.keys(archetypeSources).map(archetypeOf));

  it('has archetypes to check', () => {
    expect(names.size).toBeGreaterThan(0);
  });

  it('no archetype imports a sibling archetype or the gallery/sandbox', () => {
    const violations: string[] = [];
    for (const [path, source] of Object.entries(archetypeSources)) {
      const self = archetypeOf(path);
      for (const spec of importSpecifiers(source)) {
        const sibling = spec.match(/^@\/showcase\/archetypes\/([^/*]+)/);
        if (sibling && sibling[1] !== self) {
          violations.push(`${path} → ${spec} (sibling archetype)`);
        }
        if (/^@\/showcase\/(gallery|sandbox)\b/.test(spec)) {
          violations.push(`${path} → ${spec} (demo-only surface)`);
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });
});
