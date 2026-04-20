/**
 * Archetype-doc validator.
 *
 * Enforces the structural contract defined in archetypes/_template.md
 * against any archetypes/<name>.md file. Thin consumer of the shared
 * ArchetypeManifest parser — all extraction logic lives there.
 *
 * Rules mirror the template's § Validator rules verbatim. If this file
 * and the template disagree, the template wins — fix the code.
 */
import { basename, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import {
  CANONICAL_SECTIONS,
  SHELLS_DIR,
  findArchetypeDocs as _findArchetypeDocs,
  loadCorpusGames,
  loadEnginePrimitives,
  loadStarterShells,
  parseArchetypeDoc as _parseArchetypeDoc,
} from '../archetype-tooling/parser';
import type { ArchetypeManifest } from '../archetype-tooling/parser';

// Re-export from parser so the existing test harness (which imports these
// names from './validate') keeps working without edits.
export { CANONICAL_SECTIONS };
export const findArchetypeDocs = _findArchetypeDocs;
export const parseArchetypeDoc = _parseArchetypeDoc;
export type ArchetypeDoc = ArchetypeManifest;

// ─── Rule constants ────────────────────────────────────────────────────────

export const ALLOWED_STATUSES = new Set(['canonical', 'candidate', 'deprecated']);

export const ALLOWED_FORM_FACTORS = new Set(['desktop', 'mobile-first', 'responsive']);

export const UI_CITATION_TOKENS = [
  'layout-audit-2026.md',
  'subgenre-shell-mapping-2026.md',
  'widget-vocabulary.md',
  '`declared invention`',
] as const;

export interface Violation {
  rule: string;
  message: string;
}

// ─── Rule orchestration ────────────────────────────────────────────────────

export function runAllRules(doc: ArchetypeManifest): Violation[] {
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
    ...rulePitchParagraph(doc),
    ...ruleLiveConsumerFormat(doc),
    ...ruleConvergentGapSeverity(doc),
  ];
}

// ─── Rule constants for new template-evolution rules ──────────────────────

export const PITCH_MIN_CHARS = 300;
export const PITCH_MAX_CHARS = 1200;

// ─── Rules ─────────────────────────────────────────────────────────────────

function ruleSections(doc: ArchetypeManifest): Violation[] {
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

function ruleStatus(doc: ArchetypeManifest): Violation[] {
  if (!doc.status)
    return [{ rule: 'status', message: 'missing `> **Status:**` line with backticked value' }];
  if (!ALLOWED_STATUSES.has(doc.status)) {
    return [
      {
        rule: 'status',
        message: `status "${doc.status}" not in ${[...ALLOWED_STATUSES].join('/')}`,
      },
    ];
  }
  return [];
}

function ruleExemplars(doc: ArchetypeManifest): Violation[] {
  if (doc.exemplarLine && /`declared invention`/.test(doc.exemplarLine)) {
    return [];
  }
  const corpus = loadCorpusGames();
  const v: Violation[] = [];
  if (doc.exemplarPaths.length === 0) {
    v.push({
      rule: 'exemplars',
      message: 'no exemplar links found (tag `declared invention` if no corpus analogues exist)',
    });
  }
  for (const p of doc.exemplarPaths) {
    const leaf = basename(p);
    if (!corpus.has(leaf)) {
      v.push({ rule: 'exemplars', message: `exemplar "${leaf}" not found in analyses/complete/` });
    }
  }
  return v;
}

function rulePatterns(doc: ArchetypeManifest): Violation[] {
  const section = doc.sections.get(2);
  if (!section) return [];
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

function rulePrimitives(doc: ArchetypeManifest): Violation[] {
  const section = doc.sections.get(3);
  if (!section) return [];
  const primitives = loadEnginePrimitives();
  const cited = Array.from(section.content.matchAll(/`(\w+)`/g))
    .map((m) => m[1])
    .filter((n) => /^(create|run|calculate|process|track|apply|setup)[A-Z]/.test(n));
  const unique = Array.from(new Set(cited));
  const v: Violation[] = [];
  if (unique.length < 3) {
    v.push({
      rule: 'primitives',
      message: `§ 3 cites ${unique.length} engine primitive(s), need ≥ 3`,
    });
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

function ruleBeatMap(doc: ArchetypeManifest): Violation[] {
  const section = doc.sections.get(4);
  if (!section) return [];
  const rows = countTableRows(section.content);
  if (rows < 5 || rows > 8) {
    return [{ rule: 'beat-map', message: `§ 4 has ${rows} beats, need 5–8` }];
  }
  return [];
}

function ruleVarsSchema(doc: ArchetypeManifest): Violation[] {
  const vars = doc.varsSchema;
  if (!vars) return [{ rule: 'vars-schema', message: '§ 5 has no ```ts code block' }];
  if (vars.archetype === null && vars.theme === null && vars.balance === null) {
    return [{ rule: 'vars-schema', message: '§ 5 has no ```ts code block' }];
  }
  const v: Violation[] = [];
  if (!vars.archetype)
    v.push({ rule: 'vars-schema', message: '§ 5 missing interface *ArchetypeVars' });
  if (!vars.theme) v.push({ rule: 'vars-schema', message: '§ 5 missing interface *ThemeVars' });
  if (!vars.balance) v.push({ rule: 'vars-schema', message: '§ 5 missing interface *BalanceVars' });
  return v;
}

function ruleProbes(doc: ArchetypeManifest): Violation[] {
  const section = doc.sections.get(6);
  if (!section) return [];
  const rows = countTableRows(section.content);
  if (rows < 4) {
    return [{ rule: 'probes', message: `§ 6 has ${rows} probes, need ≥ 4` }];
  }
  return [];
}

function ruleSimAssertions(doc: ArchetypeManifest): Violation[] {
  const section = doc.sections.get(7);
  if (!section) return [];
  const codeBlocks = Array.from(section.content.matchAll(/```ts\n([\s\S]*?)```/g)).map((m) => m[1]);
  const body = codeBlocks.join('\n');
  const itCount = Array.from(body.matchAll(/\bit\(/g)).length;
  if (itCount < 2) {
    return [{ rule: 'sim-assertions', message: `§ 7 has ${itCount} test stub(s), need ≥ 2` }];
  }
  const beatCount = countTableRows(doc.sections.get(4)?.content ?? '');
  const probeCount = countTableRows(doc.sections.get(6)?.content ?? '');
  const required = beatCount + probeCount;
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

function ruleThemes(doc: ArchetypeManifest): Violation[] {
  const section = doc.sections.get(11);
  if (!section) return [];
  const themeHeadings = Array.from(section.content.matchAll(/^### Theme /gm)).length;
  if (themeHeadings < 3 || themeHeadings > 5) {
    return [{ rule: 'themes', message: `§ 11 has ${themeHeadings} theme(s), need 3–5` }];
  }
  return [];
}

// ─── § 9 UI prescription helpers ───────────────────────────────────────────

function extractShellName(line: string): string | null {
  const m = line.match(/`([A-Z]\w*Shell)`/);
  return m ? m[1] : null;
}

function isDeclaredInvention(line: string): boolean {
  return /`declared invention`/.test(line);
}

function hasUICitation(line: string): boolean {
  return UI_CITATION_TOKENS.some((token) => line.includes(token));
}

function findFieldLine(content: string, label: string): string | null {
  const pattern = new RegExp(`^[-*]?\\s*\\*\\*${label}:\\*\\*.*$`, 'm');
  const m = content.match(pattern);
  return m ? m[0] : null;
}

// ─── Template-evolution rules (OL-549 folded into OL-546) ────────────────

/**
 * First paragraph of § 1 is the gallery pitch. Must be 300–1200 chars,
 * contain no markdown links or code fences, so it can be lifted verbatim
 * into a gallery card.
 */
function rulePitchParagraph(doc: ArchetypeManifest): Violation[] {
  const section = doc.sections.get(1);
  if (!section) return [];
  // Strip HTML comments that sit above the first paragraph in the template.
  const stripped = section.content.replace(/<!--[\s\S]*?-->/g, '').trim();
  // The first paragraph ends at the first blank-line break.
  const firstBreak = stripped.search(/\n\s*\n/);
  const firstPara = (firstBreak === -1 ? stripped : stripped.slice(0, firstBreak)).trim();
  if (firstPara.length === 0) {
    return [{ rule: 'pitch-paragraph', message: '§ 1 first paragraph is empty' }];
  }
  const v: Violation[] = [];
  if (firstPara.length < PITCH_MIN_CHARS) {
    v.push({
      rule: 'pitch-paragraph',
      message: `§ 1 pitch paragraph is ${firstPara.length} chars, need ≥ ${PITCH_MIN_CHARS}`,
    });
  }
  if (firstPara.length > PITCH_MAX_CHARS) {
    v.push({
      rule: 'pitch-paragraph',
      message: `§ 1 pitch paragraph is ${firstPara.length} chars, need ≤ ${PITCH_MAX_CHARS}`,
    });
  }
  if (/\[[^\]]+\]\([^)]+\)/.test(firstPara)) {
    v.push({
      rule: 'pitch-paragraph',
      message: '§ 1 pitch paragraph must not contain markdown links',
    });
  }
  if (/```/.test(firstPara)) {
    v.push({
      rule: 'pitch-paragraph',
      message: '§ 1 pitch paragraph must not contain code fences',
    });
  }
  return v;
}

/**
 * Optional "Live consumer references" field lives in the identity block
 * (between the Exemplars line and § 1). When present, each cited path
 * under `/work/studio/<name>/` must exist on disk.
 */
function ruleLiveConsumerFormat(doc: ArchetypeManifest): Violation[] {
  // Slice the identity block — everything before § 1.
  const firstSectionIdx = doc.markdown.search(/^## 1\./m);
  const header = firstSectionIdx === -1 ? doc.markdown : doc.markdown.slice(0, firstSectionIdx);
  const m = header.match(/\*\*Live consumer references[^*]*\*\*:?\s*([^\n]+)/);
  if (!m) return []; // optional
  const line = m[1];
  const v: Violation[] = [];
  // Explicit "none in the ecosystem today" sentinel is a valid fallback
  // per the template — documents absence so drafting sessions don't search
  // for consumers that don't exist.
  if (/^\s*none\b/i.test(line)) return [];
  const paths = Array.from(line.matchAll(/`(\/work\/studio\/[^`]+)`/g)).map((pm) => pm[1]);
  if (paths.length === 0) {
    v.push({
      rule: 'live-consumer',
      message:
        '`**Live consumer references**` line has no `/work/studio/<name>/` citations and no "none" sentinel',
    });
  }
  for (const p of paths) {
    if (!existsSync(p)) {
      v.push({ rule: 'live-consumer', message: `live consumer path does not exist: ${p}` });
    }
  }
  return v;
}

/**
 * Convergent-gap severity rule. If a § 10 row self-declares convergence
 * across ≥ 2 consumers (phrase "convergent across N consumers"), severity
 * must be High. Keeps the rule auditable from the doc alone — no cross-doc
 * inspection.
 */
function ruleConvergentGapSeverity(doc: ArchetypeManifest): Violation[] {
  const section = doc.sections.get(10);
  if (!section) return [];
  const v: Violation[] = [];
  const lines = section.content.split('\n');
  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    const convergentMatch = line.match(/convergent across (\d+)\s+consumers?/i);
    if (!convergentMatch) continue;
    const count = Number(convergentMatch[1]);
    if (count < 2) continue;
    // Severity sits in column 2 of the § 10 table.
    const cells = line.split('|').map((c) => c.trim());
    // cells[0] = '' (leading pipe), cells[1] = gap, cells[2] = severity.
    const severity = (cells[2] ?? '').toLowerCase();
    if (!severity.includes('high')) {
      v.push({
        rule: 'convergent-gap-severity',
        message: `§ 10 row declares "convergent across ${count} consumers" but severity is "${cells[2] ?? ''}" (expected High)`,
      });
    }
  }
  return v;
}

function ruleUIPrescription(doc: ArchetypeManifest): Violation[] {
  const section = doc.sections.get(9);
  if (!section) return [];
  const v: Violation[] = [];
  const shells = loadStarterShells();

  const primaryLine = findFieldLine(section.content, 'Primary shell');
  const secondaryLine = findFieldLine(section.content, 'Secondary shell');
  const formFactorLine = findFieldLine(section.content, 'Form-factor intent');

  if (!primaryLine)
    v.push({ rule: 'ui-prescription', message: '§ 9 missing `**Primary shell:**` line' });
  if (!secondaryLine)
    v.push({ rule: 'ui-prescription', message: '§ 9 missing `**Secondary shell:**` line' });
  if (!formFactorLine)
    v.push({ rule: 'ui-prescription', message: '§ 9 missing `**Form-factor intent:**` line' });

  for (const [label, line] of [
    ['Primary shell', primaryLine],
    ['Secondary shell', secondaryLine],
  ] as const) {
    if (!line) continue;
    if (isDeclaredInvention(line)) continue;
    const shellName = extractShellName(line);
    if (shellName === null) {
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

  if (formFactorLine && !isDeclaredInvention(formFactorLine)) {
    const ffMatch = formFactorLine.match(/`(desktop|mobile-first|responsive)`/);
    if (!ffMatch) {
      v.push({
        rule: 'ui-prescription',
        message: `§ 9 Form-factor intent line missing a backticked value from {${[...ALLOWED_FORM_FACTORS].join(', ')}} and not tagged \`declared invention\``,
      });
    }
  }

  for (const [label, line] of [
    ['Primary shell', primaryLine],
    ['Secondary shell', secondaryLine],
    ['Form-factor intent', formFactorLine],
  ] as const) {
    if (!line) continue;
    if (label === 'Secondary shell' && /:\s*`?—`?/.test(line) && !extractShellName(line)) continue;
    if (!hasUICitation(line)) {
      v.push({
        rule: 'ui-prescription',
        message: `§ 9 ${label} line has no citation (expect one of: ${UI_CITATION_TOKENS.join(', ')})`,
      });
    }
  }

  if (!/\*\*ARIA-aligned widgets\b/.test(section.content)) {
    v.push({
      rule: 'ui-prescription',
      message: '§ 9 missing `**ARIA-aligned widgets**` list header',
    });
  }
  if (!/\*\*Domain widgets\b/.test(section.content)) {
    v.push({ rule: 'ui-prescription', message: '§ 9 missing `**Domain widgets**` list header' });
  }

  return v;
}
