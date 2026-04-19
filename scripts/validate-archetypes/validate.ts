/**
 * Archetype-doc validator.
 *
 * Enforces the structural contract defined in archetypes/_template.md
 * against any archetypes/<name>.md file. Designed to catch drift in
 * parallel-agent-authored archetype docs.
 *
 * Rules mirror the template's § Validator rules verbatim. If this file
 * and the template disagree, the template wins — fix the code.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

// ─── Paths ──────────────────────────────────────────────────────────────────

export const STARTER_ROOT = resolve(import.meta.dirname, '../..');
export const RESEARCH_ROOT = resolve(STARTER_ROOT, '../open-loop-research');
export const ENGINE_ROOT = resolve(STARTER_ROOT, '../open-loop-engine');

export const ARCHETYPES_DIR = resolve(STARTER_ROOT, 'archetypes');
export const LIBRARY_MD = resolve(RESEARCH_ROOT, 'LIBRARY.md');
export const ENGINE_INDEX_MD = resolve(ENGINE_ROOT, 'docs/api/INDEX.md');
export const CORPUS_DIR = resolve(RESEARCH_ROOT, 'analyses/complete');
export const SHELLS_DIR = resolve(STARTER_ROOT, 'src/lib/shells');

// ─── Canonical section titles (order matters) ──────────────────────────────

export const CANONICAL_SECTIONS: Readonly<Record<number, string>> = Object.freeze({
  1: 'Player experience',
  2: 'Pattern composition',
  3: 'Engine surface',
  4: 'Beat map',
  5: 'Vars schema',
  6: 'Balance probes',
  7: 'Sim assertions',
  8: 'Content sketch',
  9: 'UI prescription',
  10: 'Predicted engine gaps',
  11: 'Themes',
});

export const ALLOWED_STATUSES = new Set(['canonical', 'candidate', 'deprecated']);

// Form-factor intent values accepted by ruleFormFactor. Order: audit taxonomy.
export const ALLOWED_FORM_FACTORS = new Set(['desktop', 'mobile-first', 'responsive']);

// The three ui-ux data artifacts § 9 prescriptions must cite (or tag `declared invention`).
export const UI_CITATION_TOKENS = [
  'layout-audit-2026.md',
  'subgenre-shell-mapping-2026.md',
  'widget-vocabulary.md',
  '`declared invention`',
] as const;

// ─── Parsed doc model ──────────────────────────────────────────────────────

export interface ArchetypeDoc {
  file: string;
  name: string;
  markdown: string;
  status: string | null;
  exemplarPaths: string[];
  sections: Map<number, ParsedSection>;
}

export interface ParsedSection {
  number: number;
  title: string;
  content: string;
}

export interface Violation {
  rule: string;
  message: string;
}

// ─── Parsing ───────────────────────────────────────────────────────────────

export function parseArchetypeDoc(filePath: string): ArchetypeDoc {
  const markdown = readFileSync(filePath, 'utf8');
  return {
    file: filePath,
    name: basename(filePath, '.md'),
    markdown,
    status: extractStatus(markdown),
    exemplarPaths: extractExemplarPaths(markdown),
    sections: extractSections(markdown),
  };
}

function extractStatus(md: string): string | null {
  const match = md.match(/>\s*\*\*Status:\*\*\s*`([^`]+)`/);
  return match ? match[1] : null;
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
  // Match `- \`function name(` patterns from INDEX.md function entries
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

// ─── Rule runners ──────────────────────────────────────────────────────────

export function runAllRules(doc: ArchetypeDoc): Violation[] {
  return [
    ...ruleSections(doc),
    ...ruleStatus(doc),
    ...ruleExemplars(doc),
    ...rulePatterns(doc),
    ...rulePrimitives(doc),
    ...ruleBeatMap(doc),
    ...ruleVarsSchema(doc),
    ...ruleProbes(doc),
    ...ruleSimAssertions(doc),
    ...ruleUIPrescription(doc),
    ...ruleThemes(doc),
  ];
}

function ruleSections(doc: ArchetypeDoc): Violation[] {
  const v: Violation[] = [];
  for (const [num, expected] of Object.entries(CANONICAL_SECTIONS)) {
    const section = doc.sections.get(Number(num));
    if (!section) {
      v.push({ rule: 'sections', message: `missing § ${num} (${expected})` });
      continue;
    }
    if (section.title !== expected) {
      v.push({
        rule: 'sections',
        message: `§ ${num} title is "${section.title}", expected "${expected}"`,
      });
    }
  }
  return v;
}

function ruleStatus(doc: ArchetypeDoc): Violation[] {
  if (!doc.status) return [{ rule: 'status', message: 'missing `> **Status:**` line with backticked value' }];
  if (!ALLOWED_STATUSES.has(doc.status)) {
    return [{ rule: 'status', message: `status "${doc.status}" not in ${[...ALLOWED_STATUSES].join('/')}` }];
  }
  return [];
}

function ruleExemplars(doc: ArchetypeDoc): Violation[] {
  const corpus = loadCorpusGames();
  const v: Violation[] = [];
  if (doc.exemplarPaths.length === 0) {
    v.push({ rule: 'exemplars', message: 'no exemplar links found' });
  }
  for (const p of doc.exemplarPaths) {
    const leaf = basename(p);
    if (!corpus.has(leaf)) {
      v.push({ rule: 'exemplars', message: `exemplar "${leaf}" not found in analyses/complete/` });
    }
  }
  return v;
}

function rulePatterns(doc: ArchetypeDoc): Violation[] {
  const section = doc.sections.get(2);
  if (!section) return []; // covered by ruleSections
  // Accept links to files (.md) or directories — LIBRARY.md references
  // both (some tier-0 patterns are single files, others are directories
  // with variation subdocs).
  const links = Array.from(section.content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)).map((m) => m[1]);
  const patternLinks = links.filter((p) => p.includes('open-loop-research/patterns/'));
  const v: Violation[] = [];
  if (patternLinks.length < 2) {
    v.push({ rule: 'patterns', message: `§ 2 cites ${patternLinks.length} pattern(s), need ≥ 2` });
  }
  for (const p of patternLinks) {
    const abs = resolve(doc.file, '..', p);
    if (!existsSync(abs)) {
      v.push({ rule: 'patterns', message: `§ 2 pattern link does not resolve: ${p}` });
    }
  }
  return v;
}

function rulePrimitives(doc: ArchetypeDoc): Violation[] {
  const section = doc.sections.get(3);
  if (!section) return [];
  const primitives = loadEnginePrimitives();
  const cited = Array.from(section.content.matchAll(/`(\w+)`/g))
    .map((m) => m[1])
    .filter((n) => /^(create|run|calculate|process|track|apply|setup)[A-Z]/.test(n));
  const unique = Array.from(new Set(cited));
  const v: Violation[] = [];
  if (unique.length < 3) {
    v.push({ rule: 'primitives', message: `§ 3 cites ${unique.length} engine primitive(s), need ≥ 3` });
  }
  for (const name of unique) {
    if (!primitives.has(name)) {
      v.push({ rule: 'primitives', message: `§ 3 cites unknown engine primitive: ${name}` });
    }
  }
  return v;
}

function countTableRows(content: string): number {
  const lines = content.split('\n').map((l) => l.trim());
  let inTable = false;
  let rows = 0;
  for (const line of lines) {
    if (!line.startsWith('|')) {
      inTable = false;
      continue;
    }
    if (/^\|[\s:|-]+\|$/.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable) rows++;
  }
  return rows;
}

function ruleBeatMap(doc: ArchetypeDoc): Violation[] {
  const section = doc.sections.get(4);
  if (!section) return [];
  const rows = countTableRows(section.content);
  if (rows < 5 || rows > 8) {
    return [{ rule: 'beat-map', message: `§ 4 has ${rows} beats, need 5–8` }];
  }
  return [];
}

function ruleVarsSchema(doc: ArchetypeDoc): Violation[] {
  const section = doc.sections.get(5);
  if (!section) return [];
  const tsBlocks = Array.from(section.content.matchAll(/```ts\n([\s\S]*?)```/g)).map((m) => m[1]);
  if (tsBlocks.length === 0) {
    return [{ rule: 'vars-schema', message: '§ 5 has no ```ts code block' }];
  }
  const body = tsBlocks.join('\n');
  const v: Violation[] = [];
  const need = [
    { suffix: 'ArchetypeVars', rx: /interface\s+\w+ArchetypeVars\b/ },
    { suffix: 'ThemeVars', rx: /interface\s+\w+ThemeVars\b/ },
    { suffix: 'BalanceVars', rx: /interface\s+\w+BalanceVars\b/ },
  ];
  for (const { suffix, rx } of need) {
    if (!rx.test(body)) {
      v.push({ rule: 'vars-schema', message: `§ 5 missing interface *${suffix}` });
    }
  }
  return v;
}

function ruleProbes(doc: ArchetypeDoc): Violation[] {
  const section = doc.sections.get(6);
  if (!section) return [];
  const rows = countTableRows(section.content);
  if (rows < 4) {
    return [{ rule: 'probes', message: `§ 6 has ${rows} probes, need ≥ 4` }];
  }
  return [];
}

function ruleSimAssertions(doc: ArchetypeDoc): Violation[] {
  const section = doc.sections.get(7);
  if (!section) return [];
  const codeBlocks = Array.from(section.content.matchAll(/```ts\n([\s\S]*?)```/g)).map((m) => m[1]);
  const body = codeBlocks.join('\n');
  const itCount = Array.from(body.matchAll(/\bit\(/g)).length;
  const beatCount = countTableRows(doc.sections.get(4)?.content ?? '');
  const probeCount = countTableRows(doc.sections.get(6)?.content ?? '');
  const required = beatCount + probeCount;
  if (itCount < 2) {
    // This is a template sketch — docs typically show 2–3 representative
    // tests with a `// one it() per …` comment rather than enumerate all.
    // Enforce ≥ 2 stubs + a coverage note.
    return [{ rule: 'sim-assertions', message: `§ 7 has ${itCount} test stub(s), need ≥ 2` }];
  }
  const hasCoverageNote = /one\s+`?it`?\s+per\s+beat|Required test count/.test(section.content);
  if (!hasCoverageNote && itCount < required) {
    return [
      {
        rule: 'sim-assertions',
        message: `§ 7 has ${itCount} stubs but no coverage note; beat+probe count is ${required}`,
      },
    ];
  }
  return [];
}

function ruleThemes(doc: ArchetypeDoc): Violation[] {
  const section = doc.sections.get(11);
  if (!section) return [];
  const themeHeadings = Array.from(section.content.matchAll(/^### Theme /gm)).length;
  if (themeHeadings < 3 || themeHeadings > 5) {
    return [{ rule: 'themes', message: `§ 11 has ${themeHeadings} theme(s), need 3–5` }];
  }
  return [];
}

// Extracts the inline-code-wrapped shell name from a bolded prescription line.
// Example match: `**Primary shell:** \`SidebarMainShell\` — …` → `SidebarMainShell`.
function extractShellName(line: string): string | null {
  const m = line.match(/`([A-Z]\w*Shell)`/);
  return m ? m[1] : null;
}

// Is the line tagged `declared invention` (as an escape-hatch for the validator)?
function isDeclaredInvention(line: string): boolean {
  return /`declared invention`/.test(line);
}

// Does the line carry at least one of the required UI citation tokens?
function hasUICitation(line: string): boolean {
  return UI_CITATION_TOKENS.some((token) => line.includes(token));
}

// Extract the full line containing a bolded field label from § 9 content.
// Returns the raw line including the label, or null if not found.
function findFieldLine(content: string, label: string): string | null {
  const pattern = new RegExp(`^[-*]?\\s*\\*\\*${label}:\\*\\*.*$`, 'm');
  const m = content.match(pattern);
  return m ? m[0] : null;
}

function ruleUIPrescription(doc: ArchetypeDoc): Violation[] {
  const section = doc.sections.get(9);
  if (!section) return []; // covered by ruleSections
  const v: Violation[] = [];
  const shells = loadStarterShells();

  // Required field lines.
  const primaryLine = findFieldLine(section.content, 'Primary shell');
  const secondaryLine = findFieldLine(section.content, 'Secondary shell');
  const formFactorLine = findFieldLine(section.content, 'Form-factor intent');

  if (!primaryLine) {
    v.push({ rule: 'ui-prescription', message: '§ 9 missing `**Primary shell:**` line' });
  }
  if (!secondaryLine) {
    v.push({ rule: 'ui-prescription', message: '§ 9 missing `**Secondary shell:**` line' });
  }
  if (!formFactorLine) {
    v.push({ rule: 'ui-prescription', message: '§ 9 missing `**Form-factor intent:**` line' });
  }

  // Shell resolution (primary + secondary if not `—`).
  for (const [label, line] of [
    ['Primary shell', primaryLine],
    ['Secondary shell', secondaryLine],
  ] as const) {
    if (!line) continue;
    if (isDeclaredInvention(line)) continue;
    const shellName = extractShellName(line);
    if (shellName === null) {
      // Secondary may carry a literal em-dash meaning "no secondary, single-shell prescription".
      // Accept `—` as a sentinel after the colon.
      if (label === 'Secondary shell' && /:\s*`?—`?/.test(line)) continue;
      v.push({
        rule: 'ui-prescription',
        message: `§ 9 ${label} line has no backticked \`ShellName\` and no \`declared invention\` tag`,
      });
      continue;
    }
    if (!shells.has(shellName)) {
      v.push({
        rule: 'ui-prescription',
        message: `§ 9 ${label} "${shellName}" not found in ${SHELLS_DIR} (and not tagged \`declared invention\`)`,
      });
    }
  }

  // Form-factor value check.
  if (formFactorLine && !isDeclaredInvention(formFactorLine)) {
    const ffMatch = formFactorLine.match(/`(desktop|mobile-first|responsive)`/);
    if (!ffMatch) {
      v.push({
        rule: 'ui-prescription',
        message: `§ 9 Form-factor intent line missing a backticked value from {${[...ALLOWED_FORM_FACTORS].join(', ')}} and not tagged \`declared invention\``,
      });
    }
  }

  // Citation discipline on the three prescription lines.
  for (const [label, line] of [
    ['Primary shell', primaryLine],
    ['Secondary shell', secondaryLine],
    ['Form-factor intent', formFactorLine],
  ] as const) {
    if (!line) continue;
    // Single-shell-prescription sentinel on Secondary exempts the citation check.
    if (label === 'Secondary shell' && /:\s*`?—`?/.test(line) && !extractShellName(line)) continue;
    if (!hasUICitation(line)) {
      v.push({
        rule: 'ui-prescription',
        message: `§ 9 ${label} line has no citation (expect one of: ${UI_CITATION_TOKENS.join(', ')})`,
      });
    }
  }

  // Widget-list header presence (content may be empty; header must not).
  if (!/\*\*ARIA-aligned widgets\b/.test(section.content)) {
    v.push({ rule: 'ui-prescription', message: '§ 9 missing `**ARIA-aligned widgets**` list header' });
  }
  if (!/\*\*Domain widgets\b/.test(section.content)) {
    v.push({ rule: 'ui-prescription', message: '§ 9 missing `**Domain widgets**` list header' });
  }

  return v;
}

// ─── Discovery ─────────────────────────────────────────────────────────────

export function findArchetypeDocs(dir = ARCHETYPES_DIR): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => resolve(dir, f));
}
