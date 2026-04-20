/**
 * Archetype-doc parser.
 *
 * Single parser, three consumers: the validator (structural rules), the
 * codegen (emits src/archetypes/<name>/vars/*.ts from § 5), and — later —
 * the starter gallery (OL-478). Markdown in, ArchetypeManifest out.
 *
 * Step 1 lifts the regex-based layer from scripts/validate-archetypes/validate.ts
 * verbatim. Step 2 adds ts-morph-backed § 5 parsing; the ArchetypeManifest
 * type already carries the varsSchema slot that step fills in.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { Project, SyntaxKind } from 'ts-morph';
import type { InterfaceDeclaration, PropertySignature } from 'ts-morph';

// ─── Paths ──────────────────────────────────────────────────────────────────

export const STARTER_ROOT = resolve(import.meta.dirname, '../..');
export const RESEARCH_ROOT = resolve(STARTER_ROOT, '../open-loop-research');
export const ENGINE_ROOT = resolve(STARTER_ROOT, '../open-loop-engine');

export const ARCHETYPES_DIR = resolve(STARTER_ROOT, 'archetypes');
export const LIBRARY_MD = resolve(RESEARCH_ROOT, 'LIBRARY.md');
export const ENGINE_INDEX_MD = resolve(ENGINE_ROOT, 'docs/api/INDEX.md');
export const CORPUS_DIR = resolve(RESEARCH_ROOT, 'analyses/complete');
export const SHELLS_DIR = resolve(STARTER_ROOT, 'src/lib/shells');

// ─── Canonical sections ─────────────────────────────────────────────────────

export const CANONICAL_SECTIONS: Readonly<Record<number, string>> = Object.freeze({
  1: 'Player experience',
  2: 'Pattern composition',
  3: 'Engine surface',
  4: 'Beat map',
  5: 'Data shape',
  6: 'Balance probes',
  7: 'Sim assertions',
  8: 'Content sketch',
  9: 'UI prescription',
  10: 'Predicted engine gaps',
  11: 'Themes',
});

// ─── Manifest shape ─────────────────────────────────────────────────────────

export interface ArchetypeManifest {
  file: string;
  name: string;
  markdown: string;
  status: string | null;
  /** The raw "**Exemplars:** …" line if present, else null. */
  exemplarLine: string | null;
  /** Paths pulled out of the Exemplars line (resolved relative to file). */
  exemplarPaths: string[];
  sections: Map<number, ParsedSection>;
  /**
   * Populated by step 2 (ts-morph integration). Step 1 leaves this undefined
   * for callers that don't need it; the validator doesn't inspect § 5 bodies
   * beyond interface presence, which the text-level `ruleVarsSchema` covers.
   */
  varsSchema?: VarsSchema;
}

export interface ParsedSection {
  number: number;
  title: string;
  /** Section body after the heading, up to the next section heading. */
  content: string;
}

export interface VarsSchema {
  /** Verbatim import statements from the top of the § 5 TS block. */
  imports: string[];
  archetype: VarsInterface | null;
  theme: VarsInterface | null;
  balance: VarsInterface | null;
}

export interface VarsInterface {
  name: string;
  fields: VarsField[];
  /** Kept so codegen can re-emit via ts-morph without re-parsing. */
  node: InterfaceDeclaration;
}

export interface VarsField {
  name: string;
  /** Verbatim type text (e.g. "number", "Array<{ label: string }>", "number | null"). */
  typeText: string;
  /** Inline default pulled from the `// default X` comment suffix, or null. */
  defaultExpr: string | null;
  /** Leading JSDoc / line comments above the field. */
  leadingComments: string[];
  /** Inline comment tail on the field's line, minus any "default X" prefix. */
  trailingComment: string | null;
  optional: boolean;
}

// ─── Parsing entrypoint ─────────────────────────────────────────────────────

export function parseArchetypeDoc(filePath: string): ArchetypeManifest {
  const markdown = readFileSync(filePath, 'utf8');
  const sections = extractSections(markdown);
  const varsSchema = parseVarsSchema(sections.get(5)?.content ?? '');
  return {
    file: filePath,
    name: basename(filePath, '.md'),
    markdown,
    status: extractStatus(markdown),
    exemplarLine: extractExemplarLine(markdown),
    exemplarPaths: extractExemplarPaths(markdown),
    sections,
    varsSchema,
  };
}

function extractStatus(md: string): string | null {
  const match = md.match(/>\s*\*\*Status:\*\*\s*`([^`]+)`/);
  return match ? match[1] : null;
}

function extractExemplarLine(md: string): string | null {
  const line = md.match(/\*\*Exemplars[^*]*\*\*:?\s*([^\n]+)/);
  return line ? line[0] : null;
}

function extractExemplarPaths(md: string): string[] {
  const line = md.match(/\*\*Exemplars[^*]*\*\*:?\s*([^\n]+)/);
  if (!line) return [];
  return Array.from(line[1].matchAll(/\[[^\]]+\]\(([^)]+)\)/g)).map((m) => m[1]);
}

function extractSections(md: string): Map<number, ParsedSection> {
  const sections = new Map<number, ParsedSection>();
  const pattern = /^## (\d+)\. (.+)$/gm;
  const matches = Array.from(md.matchAll(pattern));
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const number = Number(m[1]);
    const title = m[2].trim();
    const start = m.index! + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : md.length;
    sections.set(number, { number, title, content: md.slice(start, end) });
  }
  return sections;
}

// ─── Reference loading (cached) ────────────────────────────────────────────

let _enginePrimitives: Set<string> | null = null;
let _corpusGames: Set<string> | null = null;
let _starterShells: Set<string> | null = null;

export function loadEnginePrimitives(indexPath = ENGINE_INDEX_MD): Set<string> {
  if (_enginePrimitives) return _enginePrimitives;
  const md = readFileSync(indexPath, 'utf8');
  const names = new Set<string>();
  for (const m of md.matchAll(/^- `(?:function|class|const) (\w+)/gm)) {
    names.add(m[1]);
  }
  _enginePrimitives = names;
  return names;
}

export function loadCorpusGames(dirPath = CORPUS_DIR): Set<string> {
  if (_corpusGames) return _corpusGames;
  if (!existsSync(dirPath)) return new Set();
  _corpusGames = new Set(readdirSync(dirPath).filter((f) => f.endsWith('.md')));
  return _corpusGames;
}

export function loadStarterShells(dirPath = SHELLS_DIR): Set<string> {
  if (_starterShells) return _starterShells;
  if (!existsSync(dirPath)) return new Set();
  _starterShells = new Set(
    readdirSync(dirPath)
      .filter((f) => f.endsWith('Shell.vue'))
      .map((f) => f.replace(/\.vue$/, '')),
  );
  return _starterShells;
}

// ─── § 5 vars schema (ts-morph) ────────────────────────────────────────────

/**
 * Extract the joined body of every ```ts``` block in § 5. All 10 current
 * docs put the three interfaces in a single block, but joining is safer
 * for future docs that split.
 */
function extractTsBlocks(sectionContent: string): string {
  return Array.from(sectionContent.matchAll(/```ts\n([\s\S]*?)```/g))
    .map((m) => m[1])
    .join('\n\n');
}

function parseFieldDefault(trailingComment: string | null): {
  defaultExpr: string | null;
  rest: string | null;
} {
  if (!trailingComment) return { defaultExpr: null, rest: null };
  const trimmed = trailingComment.trim();
  const m = trimmed.match(/\bdefault\s+/i);
  if (!m) return { defaultExpr: null, rest: trimmed };
  const valueStart = m.index! + m[0].length;
  const tail = trimmed.slice(valueStart);
  const defaultExpr = sliceDefaultExpr(tail);
  if (defaultExpr === null) return { defaultExpr: null, rest: trimmed };
  const rest = trimmed
    .slice(0, m.index)
    .replace(/[—–-]\s*$/, '')
    .trim();
  return { defaultExpr, rest: rest.length > 0 ? rest : null };
}

/**
 * Extract the default expression: try to match a well-formed TS literal
 * shape (array/object/string/number/keyword). Falls back to a bracket-depth
 * walk stopping at annotation separators. Returns the trimmed slice, or
 * null if empty.
 */
function sliceDefaultExpr(tail: string): string | null {
  const first = tail[0];

  // Balanced array / object / parenthesized — consume up to the matching close.
  if (first === '[' || first === '{' || first === '(') {
    const closers: Record<string, string> = { '[': ']', '{': '}', '(': ')' };
    const closer = closers[first];
    let depth = 1;
    for (let i = 1; i < tail.length; i++) {
      const c = tail[i];
      if (c === first) depth++;
      else if (c === closer) {
        depth--;
        if (depth === 0) return tail.slice(0, i + 1).trim();
      }
    }
    return null;
  }

  // Quoted string literal.
  if (first === '"' || first === "'" || first === '`') {
    const end = tail.indexOf(first, 1);
    if (end > 0) return tail.slice(0, end + 1);
  }

  // Numeric literal — allow underscore digits and simple arithmetic
  // expressions (`0.1/60`, `1024 * 4`) that appear in doc defaults. Require
  // at-most-one decimal point per number so that "1.5..1.8" range notation
  // (seen in director.md) fails the shape check and is treated as a TODO.
  const numPattern = /-?\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?(?:e[-+]?\d+)?/;
  const numExpr = tail.match(
    new RegExp(`^${numPattern.source}(?:\\s*[/*+\\-]\\s*${numPattern.source})*`),
  );
  if (numExpr && numExpr[0].length > 0) {
    // Reject if the next character suggests a range or continuation (e.g. "1.5..1.8").
    const next = tail[numExpr[0].length];
    if (next === '.') return null;
    return numExpr[0].trim();
  }

  // Boolean / null / undefined keywords.
  const kwExpr = tail.match(/^(true|false|null|undefined)\b/);
  if (kwExpr) return kwExpr[0];

  // Fallback bracket-depth walk for shapes like enum strings already quoted
  // above (shouldn't reach here) or other unforeseen literals. Stops at
  // annotation separators.
  let depth = 0;
  let end = tail.length;
  for (let i = 0; i < tail.length; i++) {
    const c = tail[i];
    if (c === '[' || c === '{' || c === '(') depth++;
    else if (c === ']' || c === '}' || c === ')') {
      if (depth === 0) {
        end = i;
        break;
      }
      depth--;
    } else if (depth === 0) {
      if (c === ';') {
        end = i;
        break;
      }
      if (c === ' ') {
        const next = tail[i + 1];
        if (next === '—' || next === '–') {
          end = i;
          break;
        }
        if (next === '-' && tail[i + 2] === ' ') {
          end = i;
          break;
        }
        if (next === '(') {
          end = i;
          break;
        }
      }
    }
  }
  const sliced = tail.slice(0, end).trim();
  return sliced.length > 0 ? sliced : null;
}

function propertyToField(prop: PropertySignature, sourceText: string): VarsField {
  const name = prop.getName();
  const typeNode = prop.getTypeNode();
  const typeText = typeNode ? typeNode.getText() : 'unknown';

  // Leading comments: JSDoc + line comments before the property.
  const leadingRanges = prop.getLeadingCommentRanges();
  const leadingComments = leadingRanges.map((r) => r.getText().trim());

  // Trailing single-line comment — ts-morph exposes this via getTrailingCommentRanges.
  const trailingRanges = prop.getTrailingCommentRanges();
  let trailingComment: string | null = null;
  if (trailingRanges.length > 0) {
    const raw = trailingRanges[0].getText().trim();
    trailingComment = raw.replace(/^\/\/\s?/, '').trim();
  } else {
    // Fallback: look at the raw source line — ts-morph occasionally returns []
    // for trailing ranges when the comment shares the line with another token.
    const startLine = prop.getStartLineNumber();
    const endLine = prop.getEndLineNumber();
    const lines = sourceText.split('\n');
    if (endLine <= lines.length) {
      const line = lines[endLine - 1];
      const m = line.match(/\/\/\s?(.+)$/);
      if (m) trailingComment = m[1].trim();
      void startLine;
    }
  }

  const { defaultExpr, rest } = parseFieldDefault(trailingComment);

  return {
    name,
    typeText,
    defaultExpr,
    leadingComments,
    trailingComment: rest,
    optional: prop.hasQuestionToken(),
  };
}

function interfaceToVars(decl: InterfaceDeclaration, sourceText: string): VarsInterface {
  const fields = decl.getProperties().map((p) => propertyToField(p, sourceText));
  return {
    name: decl.getName(),
    fields,
    node: decl,
  };
}

export function parseVarsSchema(sectionContent: string): VarsSchema {
  const source = extractTsBlocks(sectionContent);
  if (source.trim().length === 0) {
    return { imports: [], archetype: null, theme: null, balance: null };
  }

  // Strip the `// archetype.ts — …` / `// theme.ts — …` / `// balance.ts — …`
  // file-boundary markers; they'd parse as valid TS but introduce noise.
  // Keeping them does no harm, but stripping prevents confusing diagnostics.
  const cleaned = source;

  // In-memory project — avoid touching disk. `useInMemoryFileSystem` keeps
  // things hermetic even if cwd has its own tsconfig.
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      noEmit: true,
      strict: false,
      target: 99,
    },
  });
  const sourceFile = project.createSourceFile('vars-schema.ts', cleaned);

  const imports = sourceFile.getImportDeclarations().map((d) => d.getText().trim());

  const interfaces = sourceFile.getInterfaces();
  const archetype = interfaces.find((i) => /ArchetypeVars$/.test(i.getName())) ?? null;
  const theme = interfaces.find((i) => /ThemeVars$/.test(i.getName())) ?? null;
  const balance = interfaces.find((i) => /BalanceVars$/.test(i.getName())) ?? null;

  void SyntaxKind; // keep import for future rule expansions

  return {
    imports,
    archetype: archetype ? interfaceToVars(archetype, cleaned) : null,
    theme: theme ? interfaceToVars(theme, cleaned) : null,
    balance: balance ? interfaceToVars(balance, cleaned) : null,
  };
}

// ─── Discovery ─────────────────────────────────────────────────────────────

export function findArchetypeDocs(dir = ARCHETYPES_DIR): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => resolve(dir, f));
}
