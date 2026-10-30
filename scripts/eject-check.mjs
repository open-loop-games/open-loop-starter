#!/usr/bin/env node
/**
 * eject:check — eject every archetype into its own temporary copy of the working tree,
 * then typecheck and lint each fork. Prints one line per fork; exits non-zero when any
 * fork fails.
 *
 * Usage:
 *   pnpm eject:check [archetype...] [--keep]
 *
 * `_blank` is ejected as `--clean`. `--keep` leaves each fork on disk for inspection.
 *
 * Starter's own suite and gate pass on the stories in place. This checks what eject
 * changes: the slimmed `types.ts` and `manifest.ts`, the pruned config, the dropped
 * story files and dependencies. A fork's tests are starter's tests, moved, so it does not
 * run them. It is slower than a Vitest suite should be, so `pnpm test` does not run it.
 * Run it after a change to eject, to the base's types or config, or to what a story
 * imports.
 */
import { execFile, execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
} from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '..');
const ARCHETYPES = join(ROOT, 'src/showcase/archetypes');

/** Copy the working tree (tracked files plus untracked, unignored ones) into `dest`. */
export function copyWorkingTree(root, dest) {
  const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    // A tracked file deleted from the working tree is still listed.
    .filter((f) => f && existsSync(join(root, f)));
  for (const f of files) cpSync(join(root, f), join(dest, f));
}

/** Link `root`'s installed packages into `dest`. The directory itself is real, because
 *  `tsconfig.app.json` writes its build info under `node_modules/.tmp`, and a fork must
 *  not overwrite starter's or another fork's. */
function linkNodeModules(root, dest) {
  mkdirSync(join(dest, 'node_modules'));
  for (const entry of readdirSync(join(root, 'node_modules'))) {
    if (entry !== '.tmp') symlinkSync(join(root, 'node_modules', entry), join(dest, 'node_modules', entry));
  }
}

/** Every file under `dir`, recursively. */
function walkFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === 'node_modules') return [];
    return statSync(p).isDirectory() ? walkFiles(p) : [p];
  });
}

/** The error lines of a failed run, at most `max`. */
function errorLines(err, max = 5) {
  return `${err.stdout ?? ''}${err.stderr ?? ''}`
    .split('\n')
    .filter((l) => /error/i.test(l))
    .slice(0, max);
}

/** Eject `archetype` into a fresh copy and gate it; resolves to the problems found. */
async function checkOne(archetype, keep) {
  const fork = mkdtempSync(join(tmpdir(), `eject-check-${archetype}-`));
  const problems = [];
  try {
    copyWorkingTree(ROOT, fork);
    linkNodeModules(ROOT, fork);
    const args = archetype === '_blank' ? ['--clean'] : [archetype];
    await run('node', [join(fork, 'scripts/eject.mjs'), ...args, '--execute', '--root', fork]);

    // Binaries run directly: `pnpm run` would first reinstall, because eject edits package.json.
    const bin = (name) => join(fork, 'node_modules/.bin', name);
    for (const [label, cmd, cmdArgs] of [
      ['typecheck', bin('vue-tsc'), ['-b']],
      ['lint', bin('oxlint'), ['src/']],
    ]) {
      try {
        await run(cmd, cmdArgs, { cwd: fork, maxBuffer: 16 << 20 });
      } catch (err) {
        problems.push(`${label}:`, ...errorLines(err).map((l) => `  ${l.trim()}`));
      }
    }
    for (const path of walkFiles(fork)) {
      if (!/\.(ts|vue|mjs|md|json|css)$/.test(path)) continue;
      if (readFileSync(path, 'utf8').includes('eject:strip')) {
        problems.push(`strip marker left in ${relative(fork, path)}`);
      }
    }
    return problems;
  } catch (err) {
    return [`eject failed: ${err.message.split('\n')[0]}`, ...problems];
  } finally {
    if (keep) problems.push(`kept at ${fork}`);
    else rmSync(fork, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const keep = args.includes('--keep');
  const have = readdirSync(ARCHETYPES).filter((d) => statSync(join(ARCHETYPES, d)).isDirectory());
  const named = args.filter((a) => !a.startsWith('--'));
  const unknown = named.filter((a) => !have.includes(a));
  if (unknown.length) {
    console.error(`unknown archetype: ${unknown.join(', ')}. Available: ${have.join(', ')}`);
    process.exit(2);
  }
  const archetypes = named.length ? named : have;

  // A vue-tsc build keeps about two cores busy.
  const width = Math.max(1, Math.floor(availableParallelism() / 2));
  const results = new Map();
  let next = 0;
  async function worker() {
    while (next < archetypes.length) {
      const archetype = archetypes[next++];
      results.set(archetype, await checkOne(archetype, keep));
    }
  }
  const start = Date.now();
  await Promise.all(Array.from({ length: Math.min(width, archetypes.length) }, worker));

  let failed = 0;
  for (const archetype of archetypes) {
    const problems = results.get(archetype);
    const ok = !problems.some((p) => !p.startsWith('kept at'));
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${archetype}`);
    for (const p of problems) console.log(`       ${p}`);
  }
  console.log(
    `\n${archetypes.length - failed}/${archetypes.length} forks green in ${((Date.now() - start) / 1000).toFixed(1)}s`,
  );
  if (failed) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
