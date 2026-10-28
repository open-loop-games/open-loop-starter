/**
 * Locks for `pnpm eject` (scripts/eject.mjs).
 *
 * Four guarantees:
 *   1. The eject *plan* keeps its shape — hoist one archetype to `src/game`,
 *      delete the whole demo surface. A `--dry-run`-equivalent assertion that
 *      needs no node_modules, so it's a fast CI lock.
 *   2. Eject *stays safe* — no archetype statically or dynamically imports a
 *      sibling archetype or the gallery/sandbox. That isolation is the reason
 *      deleting the rest of the showcase can't break the archetype you keep;
 *      this test fails the moment a future port introduces cross-coupling.
 *   3. A clean fork *carries no showcase text* — no path into the deleted
 *      tree, no gallery framing, no `eject:strip` region left behind.
 *   4. A fork *installs only what its game imports* — every dependency only the
 *      showcase imports is listed in `SHOWCASE_ONLY_DEPS`, and eject drops it.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';
// @ts-expect-error — .mjs script, no types; we only touch the pure planner.
import { planEject, slug, importSpecifiers, SHOWCASE_ONLY_DEPS } from '../../scripts/eject.mjs';

const ROOT = process.cwd();

describe('eject plan', () => {
  it('hoists the chosen archetype and deletes the demo surface', () => {
    const plan = planEject(ROOT, 'cycler', 'Cookie Tycoon');
    expect(plan.move).toEqual({ from: 'src/showcase/archetypes/cycler', to: 'src/game' });
    expect(plan.rewriteMain).toBe('src/main.ts');
    expect(plan.gameId).toBe('cookie-tycoon');
    expect(plan.deletes).toContain('src/showcase');
    expect(plan.deletes).toContain('src/test/gallery-strip.test.ts');
    // The instruction surface strips too: every rule is paths-scoped to the
    // showcase tree, so a fork would inherit globs that can never match.
    expect(plan.deletes).toContain('.claude/rules');
    // Eject strips its own machinery so the fork starts clean + green.
    expect(plan.deletes).toContain('scripts/eject.mjs');
    expect(plan.deletes).toContain('src/test/eject.test.ts');
    // The games-site listing is the stories', so a fork does not inherit it.
    expect(plan.deletes).toContain('game.json');
    expect(plan.deletes).toContain('.gitea/workflows/games-site.yaml');
    // Nothing in the plan deletes anything under what becomes the game.
    for (const d of plan.deletes) expect(d.startsWith('src/game')).toBe(false);
  });

  it('slims the manifest to identity — --name wins', () => {
    const plan = planEject(ROOT, 'cycler', 'Cookie Tycoon');
    expect(plan.manifest).toEqual({ id: 'cookie-tycoon', displayName: 'Cookie Tycoon' });
  });

  it('slims the manifest to identity — falls back to the source manifest', () => {
    const plan = planEject(ROOT, 'cycler');
    expect(plan.manifest).toEqual({ id: 'cycler', displayName: 'Cycler — Skerry Light' });
  });

  it('omits the game name when none is given', () => {
    const plan = planEject(ROOT, 'producer');
    expect(plan.gameId).toBeUndefined();
    expect(plan.packageName).toBeUndefined();
  });

  it('ejects the neutral _blank skeleton for a clean fork', () => {
    // `--clean` resolves to the `_blank` archetype in main(); the planner sees
    // the resolved name. This also transitively locks that _blank exists.
    const plan = planEject(ROOT, '_blank');
    expect(plan.move).toEqual({ from: 'src/showcase/archetypes/_blank', to: 'src/game' });
    expect(plan.manifest).toEqual({ id: 'game', displayName: 'Game' });
  });

  it('drops the showcase-only dependencies the kept game does not import', () => {
    expect(planEject(ROOT, 'cycler').dropDependencies).toContain('pixi.js');
    expect(planEject(ROOT, 'defender').dropDependencies).not.toContain('pixi.js');
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

/** Every file under `dir`, recursively, as paths relative to `root`. */
function filesUnder(root: string, dir = root): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? filesUnder(root, p) : [relative(root, p)];
  });
}

describe('eject — showcase-only dependencies', () => {
  it('lists every dependency that only the showcase imports', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const importers = new Map<string, string[]>();
    for (const rel of filesUnder(ROOT, join(ROOT, 'src')).filter((f) => /\.(ts|vue)$/.test(f))) {
      for (const spec of importSpecifiers(readFileSync(join(ROOT, rel), 'utf8')) as string[]) {
        const dep = deps.find((d) => spec === d || spec.startsWith(`${d}/`));
        if (dep) importers.set(dep, [...(importers.get(dep) ?? []), rel]);
      }
    }
    const unlisted = [...importers]
      .filter(
        ([dep, files]) =>
          !(dep in SHOWCASE_ONLY_DEPS) && files.every((f) => f.startsWith('src/showcase/')),
      )
      .map(([dep]) => dep);
    expect(unlisted, 'add these to SHOWCASE_ONLY_DEPS in scripts/eject.mjs').toEqual([]);
  });
});

describe('eject --clean residue', () => {
  it('leaves no showcase text in the fork', () => {
    // Eject a copy of the working tree: tracked files plus untracked, unignored ones.
    const fork = mkdtempSync(join(tmpdir(), 'starter-eject-'));
    try {
      const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
        cwd: ROOT,
        encoding: 'utf8',
      })
        .split('\0')
        // A tracked file deleted from the working tree is still listed.
        .filter((f) => f && existsSync(join(ROOT, f)));
      for (const f of files) cpSync(join(ROOT, f), join(fork, f));
      execFileSync(
        'node',
        [join(fork, 'scripts/eject.mjs'), '--clean', '--execute', '--root', fork],
        {
          stdio: 'pipe',
        },
      );

      const pkg = JSON.parse(readFileSync(join(fork, 'package.json'), 'utf8'));
      const forkDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
      expect(forkDeps.filter((d) => d in SHOWCASE_ONLY_DEPS)).toEqual([]);

      const residue: string[] = [];
      for (const rel of filesUnder(fork)) {
        if (rel === 'pnpm-lock.yaml' || !/\.(ts|vue|mjs|md|json|css|html)$|^\.husky\//.test(rel)) {
          continue;
        }
        readFileSync(join(fork, rel), 'utf8')
          .split('\n')
          .forEach((line, i) => {
            // The read-in-place pointer names starter's tree on purpose.
            const showcasePath = /src\/showcase/.test(line) && !line.includes('open-loop-starter');
            if (showcasePath || /\b(gallery|sandbox)\b|eject:strip/i.test(line)) {
              residue.push(`${rel}:${i + 1}: ${line.trim()}`);
            }
          });
      }
      expect(residue, residue.join('\n')).toEqual([]);
    } finally {
      rmSync(fork, { recursive: true, force: true });
    }
  }, 30_000);
});
