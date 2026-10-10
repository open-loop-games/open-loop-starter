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

// Repo-root + in-src surfaces that exist only to support the demo gallery,
// plus eject's own machinery (which is meaningless in a single-game fork) and
// starter-identity files a fork must not inherit.
const DEMO_DELETES = [
  SHOWCASE,
  // Every rule in here is paths-scoped to the showcase tree, so in a fork its
  // globs can never match a file that exists. Claude-only either way.
  '.claude/rules',
  'src/test/gallery-strip.test.ts',
  'src/test/eject.test.ts',
  'scripts/eject.mjs',
  'docs',
  'profiles',
  'TODO.md',
  // Starter's task-backend config; a fork inherits the studio-root gitea config.
  '.mcp.json',
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

// Slim replacement for src/types.ts — keeps the app-wide Screen enum, drops the
// gallery-surface manifest contract (ArchetypeManifest + PrimitiveRef/BeatRef/
// ExemplarRef/FormFactor) that only the deleted gallery consumed.
const TYPES_TS = `export enum Screen {
  Slots = 'slots',
  Game = 'game',
}

/** Game identity manifest. Forwarded as \`appName\` to SlotScreen and used as
 *  the engine save-namespace. */
export interface GameManifest {
  id: string;
  name: string;
}
`;

/** Identity-only manifest for the hoisted src/game — the gallery arrays
 *  (primitives/beats/exemplars/shell) are dropped on eject. */
function gameManifest(id, name) {
  const esc = (s) => s.replace(/'/g, "\\'");
  return `import type { GameManifest } from '@/types';

export const manifest: GameManifest = { id: '${esc(id)}', name: '${esc(name)}' };
`;
}

/** Minimal README stub replacing starter's dual-character docs. */
function readmeMd(name) {
  return `# ${name}

A game built on [open-loop-engine](../open-loop-engine), forked from open-loop-starter.

## Setup

\`\`\`bash
pnpm install   # engine is a link: dep to the sibling directory
pnpm dev
\`\`\`

## Commands

\`\`\`bash
pnpm dev        # Vite dev server
pnpm build      # vue-tsc -b && vite build
pnpm typecheck  # vue-tsc -b
pnpm test       # Vitest run
pnpm lint       # eslint src/
pnpm domain-map # regenerate src/game/domain-map.md from data types
\`\`\`

Regenerate \`src/game/overview.md\` + \`domain-map.md\` after editing \`src/game/data\`.
`;
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseArgs(argv) {
  const out = { archetype: undefined, name: undefined, execute: false, clean: false, root: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute') out.execute = true;
    else if (a === '--clean') out.clean = true;
    else if (a === '--name') out.name = argv[++i];
    else if (a === '--root') out.root = resolve(argv[++i]);
    else if (!a.startsWith('--') && !out.archetype) out.archetype = a;
  }
  return out;
}

// `--clean` ejects the neutral `_blank` skeleton — the honest base for a novel
// composition with no fitting archetype (no archetype content to strip by hand).
const CLEAN_ARCHETYPE = '_blank';

/** Read the top-level `id`/`name` string literals from an archetype's manifest,
 *  falling back to the directory name if the manifest can't be parsed. */
function readManifestIdentity(root, archetype) {
  const p = join(root, ARCHETYPES, archetype, 'manifest.ts');
  if (existsSync(p)) {
    const src = readFileSync(p, 'utf8');
    const id = src.match(/\bid:\s*'([^']*)'/)?.[1];
    const name = src.match(/\bname:\s*'([^']*)'/)?.[1];
    if (id && name) return { id, name };
  }
  return { id: archetype, name: archetype };
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
  // Post-eject the game keeps only identity: --name wins, else the source
  // manifest's own id/name, else the directory name.
  const manifest = name ? { id: slug(name), name } : readManifestIdentity(root, archetype);
  return {
    archetype,
    manifest,
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
      // eslint.config.js carries demo-only rule blocks (the showcase-boundary
      // guard, the Synergism-snapshot ignores) that are brace-balanced JS a
      // line-filter can't safely remove. They're wrapped in `eject:strip-start`
      // /`eject:strip-end` sentinels in source; strip each region wholesale.
      if (rel === 'eslint.config.js') {
        out = out.replace(/[ \t]*\/\* eject:strip-start[\s\S]*?eject:strip-end \*\/\n?/g, '');
      }
      // Drop any config line that still points into the showcase (other
      // archetypes / _template excludes that no longer exist post-eject).
      out = out
        .split('\n')
        .filter((line) => !line.includes(plan.pruneConfigLines))
        .join('\n');
      // The `eject` script references machinery deleted by this run.
      if (rel === 'package.json') {
        out = out
          .split('\n')
          .filter((line) => !/^\s*"eject":/.test(line))
          .join('\n');
      }
      return out;
    });
  }

  // 4. Slim starter-wide surfaces to the single game: drop the gallery manifest
  // contract from types.ts, reduce the hoisted manifest to identity, and stub
  // the README. Wholesale writes (same pattern as main.ts) — never munging.
  writeFileSync(join(root, 'src/types.ts'), TYPES_TS);
  writeFileSync(join(root, GAME_DIR, 'manifest.ts'), gameManifest(plan.manifest.id, plan.manifest.name));
  writeFileSync(join(root, 'README.md'), readmeMd(plan.manifest.name));

  // 5. Apply the game name to package.json + the hoisted boot's GAME_ID.
  if (plan.packageName) {
    editFile(join(root, 'package.json'), (src) =>
      src.replace(/("name":\s*")[^"]*(")/, `$1${plan.packageName}$2`),
    );
    editFile(join(root, GAME_DIR, 'boot.ts'), (src) =>
      src.replace(/(const GAME_ID\s*=\s*')[^']*(')/, `$1${plan.gameId}$2`),
    );
  }

  // 6. Delete the demo/research surface + eject's own machinery. Runs last so
  // every read/write above completes first; self-deleting eject.mjs mid-run is
  // safe (the module is already loaded into memory).
  for (const rel of plan.deletes) {
    rmSync(join(root, rel), { recursive: true, force: true });
  }
}

function main() {
  const { archetype: named, name, execute, clean, root } = parseArgs(process.argv.slice(2));
  const archetype = clean ? CLEAN_ARCHETYPE : named;
  if (!archetype) {
    console.error('usage: pnpm eject <archetype> [--name <game-name>] [--execute]');
    console.error('       pnpm eject --clean [--name <game-name>] [--execute]');
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
  const label = clean ? 'clean scaffold' : `"${archetype}"`;
  console.log(`✓ ejected ${label} → ${GAME_DIR}`);
  console.log(`  main.ts now boots the single game; showcase, demo docs, and eject machinery removed.`);
  if (plan.gameId) console.log(`  named "${plan.gameId}" (package.json + GAME_ID + manifest).`);
  // The eject lock test is deleted with the rest of the machinery, so there is
  // no longer a self-checking green-after-eject invariant — the fork must run
  // the full gate itself before trusting the result.
  console.log('\n  next — REQUIRED to confirm a clean fork (there is no eject test left to enforce it):');
  console.log('    pnpm install && pnpm typecheck && pnpm test && pnpm lint');
  console.log('    pnpm dev');
}

// Exported for the dry-run lock test; runs as a CLI otherwise.
export { planEject, slug, MAIN_TS };

if (import.meta.url === `file://${process.argv[1]}`) main();
