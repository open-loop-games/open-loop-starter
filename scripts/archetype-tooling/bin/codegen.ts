#!/usr/bin/env node
/**
 * CLI entry: `pnpm codegen:archetype-vars <name> [--dry-run]`.
 *
 * Reads archetypes/<name>.md via the shared parser, emits the three vars
 * files to src/archetypes/<name>/vars/ after an in-memory typecheck.
 * On --dry-run, prints the files to stdout and writes nothing.
 */
import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ARCHETYPES_DIR, STARTER_ROOT, parseArchetypeDoc } from '../parser';
import { archetypeDirForName, generateArchetypeVars } from '../codegen';

function parseArgs(argv: string[]): { name: string; dryRun: boolean } {
  const dryRun = argv.includes('--dry-run');
  const positional = argv.filter((a) => !a.startsWith('--'));
  if (positional.length !== 1) {
    console.error('Usage: codegen:archetype-vars <name> [--dry-run]');
    process.exit(2);
  }
  return { name: positional[0], dryRun };
}

function main(): void {
  const { name, dryRun } = parseArgs(process.argv.slice(2));

  const docPath = resolve(ARCHETYPES_DIR, `${name}.md`);
  if (!existsSync(docPath)) {
    console.error(`archetype doc not found: ${docPath}`);
    process.exit(1);
  }

  const manifest = parseArchetypeDoc(docPath);
  const archetypeDir = archetypeDirForName(name);
  if (!existsSync(archetypeDir)) {
    console.error(`archetype source dir not found: ${archetypeDir}`);
    process.exit(1);
  }

  const result = generateArchetypeVars(manifest, { archetypeDir });

  const varsDir = resolve(archetypeDir, 'vars');
  const outputs = [
    { path: resolve(varsDir, 'archetype.ts'), content: result.emitted.archetypeTs },
    { path: resolve(varsDir, 'theme.ts'), content: result.emitted.themeTs },
    { path: resolve(varsDir, 'balance.ts'), content: result.emitted.balanceTs },
    { path: resolve(varsDir, 'index.ts'), content: result.emitted.indexTs },
  ];

  if (dryRun) {
    for (const o of outputs) {
      console.log(`\n// ═══ ${o.path.replace(STARTER_ROOT + '/', '')} ═══\n`);
      console.log(o.content);
    }
    reportTodos(result.todos);
    if (result.diagnostics.length > 0) {
      console.error(
        `\ntypecheck would fail for ${name} (${result.diagnostics.length} diagnostic${result.diagnostics.length === 1 ? '' : 's'}):`,
      );
      for (const d of result.diagnostics) console.error(`  ${d}`);
    }
    return;
  }

  if (result.diagnostics.length > 0) {
    console.error(`typecheck failed for ${name}:`);
    for (const d of result.diagnostics) console.error(`  ${d}`);
    process.exit(1);
  }

  mkdirSync(varsDir, { recursive: true });
  for (const o of outputs) writeFileSync(o.path, o.content);

  // Migrate load.ts: import from `./defaults` → `./vars`.
  updateLoadImports(archetypeDir);

  // Remove the now-subsumed defaults.ts.
  const defaultsPath = resolve(archetypeDir, 'defaults.ts');
  if (existsSync(defaultsPath)) rmSync(defaultsPath);

  // Update index.ts re-exports from './defaults' → './vars'.
  updateIndexReexports(archetypeDir);

  console.log(
    `codegen ${name}: wrote ${outputs.length} files to ${varsDir.replace(STARTER_ROOT + '/', '')}/`,
  );
  reportTodos(result.todos);
}

function reportTodos(todos: { archetype: string[]; theme: string[]; balance: string[] }): void {
  const all = [
    ['archetype', todos.archetype],
    ['theme', todos.theme],
    ['balance', todos.balance],
  ] as const;
  const total = all.reduce((n, [, f]) => n + f.length, 0);
  if (total === 0) return;
  console.log(`\n${total} TODO field${total === 1 ? '' : 's'} emitted (no inline default in § 5):`);
  for (const [kind, fields] of all) {
    if (fields.length === 0) continue;
    console.log(`  ${kind}: ${fields.join(', ')}`);
  }
}

function updateLoadImports(archetypeDir: string): void {
  const loadPath = resolve(archetypeDir, 'load.ts');
  if (!existsSync(loadPath)) return;
  const source = readFileSync(loadPath, 'utf8');
  // Single-line swap: `from './defaults'` → `from './vars'`.
  const updated = source.replace(/from\s+(['"])\.\/defaults\1/g, "from './vars'");
  if (updated !== source) writeFileSync(loadPath, updated);
}

function updateIndexReexports(archetypeDir: string): void {
  const indexPath = resolve(archetypeDir, 'index.ts');
  if (!existsSync(indexPath)) return;
  const source = readFileSync(indexPath, 'utf8');
  const updated = source.replace(/from\s+(['"])\.\/defaults\1/g, "from './vars'");
  if (updated !== source) writeFileSync(indexPath, updated);
}

main();
