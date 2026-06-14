#!/usr/bin/env node
/**
 * eject — turn the starter into a single-game fork.
 *
 * Usage:
 *   pnpm eject <archetype> [--name <game-name>] [--execute] [--root <dir>]
 *
 * Dry-run by default — prints the plan and touches nothing. Pass `--execute`
 * to actually perform it (the operation is destructive: it deletes the whole
 * demo surface).
 *
 * Hoists one archetype out of the showcase boundary into `src/game/`, rewrites
 * `main.ts` to a single-archetype boot, repoints config, and deletes the entire
 * demo/research surface (`src/showcase/`, the gallery-strip guard, and the
 * repo-root demo docs). The result is a clean game with the scaffold + one
 * archetype and nothing to strip by hand.
 *
 * Safe because the move is mechanical: archetypes import only scaffold
 * (`@/ui`, `@/composables`, `@/lib`, `@/boot`, `@/types`, `@/balance`) and never
 * a sibling archetype, so deleting the rest can't break the kept one. The
 * default-dry-run plan is what `src/test/eject.test.ts` asserts against.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const SHOWCASE = 'src/showcase';
const ARCHETYPES = `${SHOWCASE}/archetypes`;
const GAME_DIR = 'src/game';

// Repo-root + in-src surfaces that exist only to support the demo gallery.
const DEMO_DELETES = [
  SHOWCASE,
  'src/test/gallery-strip.test.ts',
  'docs',
  'archetypes',
  'profiles',
  'ARCHETYPES.md',
];

const MAIN_TS = `import { effectScope } from 'vue';
import { createApp } from '@/game';
import { usePlayerPrefs } from '@/composables/usePlayerPrefs';
import { useNotation } from '@/composables/useNotation';
import '@/lib/styles/reset.css';
import '@/lib/styles/tokens.css';
import './styles/base.css';
import './styles/theme-widgets.css';

// Page-lifetime player-pref runtime: theme + ui-scale + notation begin
// applying at boot so the game honours the player's saved settings.
effectScope(true).run(() => {
  usePlayerPrefs();
  useNotation();
});

const { mount } = createApp();
mount('#app');
`;

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseArgs(argv) {
  const out = { archetype: undefined, name: undefined, execute: false, root: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute') out.execute = true;
    else if (a === '--name') out.name = argv[++i];
    else if (a === '--root') out.root = resolve(argv[++i]);
    else if (!a.startsWith('--') && !out.archetype) out.archetype = a;
  }
  return out;
}

/** Compute the eject plan without touching disk. Pure given the root tree. */
function planEject(root, archetype, name) {
  const archDir = join(root, ARCHETYPES, archetype);
  if (!existsSync(archDir)) {
    const have = existsSync(join(root, ARCHETYPES))
      ? readdirSync(join(root, ARCHETYPES)).filter((d) => !d.startsWith('_'))
      : [];
    throw new Error(`Unknown archetype "${archetype}". Available: ${have.join(', ') || '(none)'}`);
  }
  const gameId = name ? slug(name) : undefined;
  return {
    archetype,
    move: { from: `${ARCHETYPES}/${archetype}`, to: GAME_DIR },
    rewriteMain: 'src/main.ts',
    // Repoint config references for the kept archetype, then prune any that
    // still point into the (about-to-be-deleted) showcase.
    repoint: { from: `${ARCHETYPES}/${archetype}/`, to: `${GAME_DIR}/` },
    domainMap: { from: `${ARCHETYPES}/*/domain-map.config.mjs`, to: `${GAME_DIR}/domain-map.config.mjs` },
    pruneConfigLines: SHOWCASE, // delete config lines still mentioning this after repoint
    packageName: gameId,
    gameId,
    deletes: DEMO_DELETES,
  };
}

function gitMv(root, from, to) {
  try {
    execFileSync('git', ['mv', from, to], { cwd: root, stdio: 'pipe' });
  } catch {
    // Not a git repo (or untracked) — fall back to a plain rename.
    execFileSync('mv', [from, to], { cwd: root, stdio: 'pipe' });
  }
}

function editFile(path, fn) {
  if (!existsSync(path)) return;
  const next = fn(readFileSync(path, 'utf8'));
  if (next != null) writeFileSync(path, next);
}

function applyPlan(root, plan) {
  // 1. Hoist the chosen archetype out of the showcase boundary.
  gitMv(root, join(root, plan.move.from), join(root, plan.move.to));

  // 2. Single-archetype main.ts.
  writeFileSync(join(root, plan.rewriteMain), MAIN_TS);

  // 3. Repoint + prune config. eslint/tsconfig/package reference archetype paths.
  for (const rel of ['eslint.config.js', 'tsconfig.app.json', 'package.json']) {
    editFile(join(root, rel), (src) => {
      let out = src
        .split(plan.repoint.from)
        .join(plan.repoint.to)
        .split(plan.domainMap.from)
        .join(plan.domainMap.to);
      // Drop any config line that still points into the showcase (other
      // archetypes / _template excludes that no longer exist post-eject).
      out = out
        .split('\n')
        .filter((line) => !line.includes(plan.pruneConfigLines))
        .join('\n');
      return out;
    });
  }

  // 4. Apply the game name to package.json + the hoisted boot's GAME_ID.
  if (plan.packageName) {
    editFile(join(root, 'package.json'), (src) =>
      src.replace(/("name":\s*")[^"]*(")/, `$1${plan.packageName}$2`),
    );
    editFile(join(root, GAME_DIR, 'boot.ts'), (src) =>
      src.replace(/(const GAME_ID\s*=\s*')[^']*(')/, `$1${plan.gameId}$2`),
    );
  }

  // 5. Delete the demo/research surface.
  for (const rel of plan.deletes) {
    rmSync(join(root, rel), { recursive: true, force: true });
  }
}

function main() {
  const { archetype, name, execute, root } = parseArgs(process.argv.slice(2));
  if (!archetype) {
    console.error('usage: pnpm eject <archetype> [--name <game-name>] [--execute]');
    const dir = join(root, ARCHETYPES);
    if (existsSync(dir)) {
      const have = readdirSync(dir).filter((d) => !d.startsWith('_'));
      console.error(`\navailable archetypes: ${have.join(', ')}`);
    }
    process.exit(2);
  }
  let plan;
  try {
    plan = planEject(root, archetype, name);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  if (!execute) {
    process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
    console.error('\n(dry run — pass --execute to perform this. This deletes the whole demo surface.)');
    return;
  }
  applyPlan(root, plan);
  console.log(`✓ ejected "${archetype}" → ${GAME_DIR}`);
  console.log(`  main.ts now boots the single archetype; showcase + demo docs removed.`);
  if (plan.gameId) console.log(`  named "${plan.gameId}" (package.json + GAME_ID).`);
  console.log(`  next: pnpm install && pnpm typecheck && pnpm dev`);
}

// Exported for the dry-run lock test; runs as a CLI otherwise.
export { planEject, slug, MAIN_TS };

if (import.meta.url === `file://${process.argv[1]}`) main();
