/**
 * Archetype-doc citation/grounding validator.
 *
 * Walks `archetypes/*.md` (excluding `_*.md`, `BALANCING.md`) and gates
 * § 4 / § 6 / § 7 numerical claims against the per-status discipline:
 *
 *   - `canonical`: every confident number must reach a citation marker —
 *     `reference-code/<game>/<file>:line`, `wiki:<url>`, an inline
 *     `<file>.<ext>:<line>` short-form reference, or one of the keyword
 *     anchors `vanilla` / `canonical` in surrounding section prose. The
 *     `declared invention — <rationale>` tag is the explicit escape hatch
 *     for invented numbers without exemplar. `aspirational` is NOT valid.
 *   - `candidate`: same set as canonical, plus `aspirational` is allowed.
 *     Stripped placeholder sections (italicized one-liner referencing
 *     `aspirational — pending implementation`) pass trivially.
 *   - `deprecated`: not validated.
 *
 * Detection is per-row + section-level fallback. A "confident number" is
 * any digit-bearing token left over after stripping inline backtick code
 * spans, sim-time windows (`0:00–0:10`, `25:00–55:00`), tolerances
 * (`±25%`), and perturbation specs (`×[0.80, 1.20]`). If a row keeps a
 * number after stripping AND no marker is in reach (row text or section
 * text), the row fails.
 *
 * Run: `pnpm validate:archetypes` from open-loop-starter root.
 * Exits non-zero on any failure.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Paths ─────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const ARCHETYPES_DIR = join(REPO_ROOT, 'archetypes');

// ─── Types ─────────────────────────────────────────────────────────────────

type Status = 'canonical' | 'candidate' | 'deprecated' | 'unknown';

interface Section {
  num: 4 | 6 | 7;
  text: string; // full section text including heading
  rows: string[]; // extracted "row-shaped" lines (table rows + numbered list items)
}

interface Failure {
  section: 4 | 6 | 7;
  rowIndex: number; // 1-based index within the section's row list
  rowText: string;
  reason: string;
}

interface DocReport {
  filename: string;
  status: Status;
  failures: Failure[];
  rowsChecked: number;
  rowsGrounded: number;
  skipped: boolean;
  skipReason?: string;
}

// ─── Citation markers ──────────────────────────────────────────────────────

/** Inline `<file>.<ext>:<line[-line]>` short-form citation. */
const INLINE_FILE_LINE_RE = /\b[\w/.-]+\.(?:ts|tsx|js|jsx|vue|md|css|html|json):\d+(?:[-–]\d+)?\b/;
/** Long-form path under `reference-code/`. */
const REFERENCE_CODE_RE = /\breference-code\//;
/** Wiki citation form. */
const WIKI_RE = /\bwiki:/;
/** Escape-hatch tags. */
const DECLARED_INVENTION_RE = /\bdeclared invention\b/i;
const ASPIRATIONAL_RE = /\baspirational\b/i;
/** Keyword anchors that look like grounding in the looper.md house style. */
const VANILLA_RE = /\bvanilla\b/i;
const CANONICAL_RE = /\bcanonical\b/i;

interface MarkerSet {
  hasReferenceCode: boolean;
  hasWiki: boolean;
  hasInlineFileLine: boolean;
  hasDeclaredInvention: boolean;
  hasAspirational: boolean;
  hasVanilla: boolean;
  hasCanonical: boolean;
}

function findMarkers(text: string): MarkerSet {
  return {
    hasReferenceCode: REFERENCE_CODE_RE.test(text),
    hasWiki: WIKI_RE.test(text),
    hasInlineFileLine: INLINE_FILE_LINE_RE.test(text),
    hasDeclaredInvention: DECLARED_INVENTION_RE.test(text),
    hasAspirational: ASPIRATIONAL_RE.test(text),
    hasVanilla: VANILLA_RE.test(text),
    hasCanonical: CANONICAL_RE.test(text),
  };
}

/** Citation that satisfies the canonical-status discipline. Excludes `aspirational`. */
function hasCanonicalGrounding(m: MarkerSet): boolean {
  return (
    m.hasReferenceCode ||
    m.hasWiki ||
    m.hasInlineFileLine ||
    m.hasDeclaredInvention ||
    m.hasVanilla ||
    m.hasCanonical
  );
}

/** Citation or escape hatch that satisfies the candidate-status discipline. */
function hasCandidateGrounding(m: MarkerSet): boolean {
  return hasCanonicalGrounding(m) || m.hasAspirational;
}

// ─── Status frontmatter ────────────────────────────────────────────────────

function parseStatus(doc: string): Status {
  // Format: `> **Status:** \`canonical\`` / `\`candidate\`` / `\`deprecated\``
  const m = doc.match(/^>\s*\*\*Status:\*\*\s*`(canonical|candidate|deprecated)`/m);
  if (!m) return 'unknown';
  return m[1] as Status;
}

// ─── Section extraction ────────────────────────────────────────────────────

const SECTION_HEADING_RE = /^##\s+(\d+)\.\s+/;

function extractSections(doc: string): Map<number, string> {
  const lines = doc.split('\n');
  const sections = new Map<number, string>();
  let currentNum: number | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (currentNum !== null) {
      sections.set(currentNum, buf.join('\n'));
    }
  };

  for (const line of lines) {
    // Stop on the post-§ 11 trailers (`## Vocabulary anchors`, etc.).
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      const numMatch = line.match(SECTION_HEADING_RE);
      flush();
      if (numMatch) {
        currentNum = parseInt(numMatch[1], 10);
        buf = [line];
      } else {
        currentNum = null;
        buf = [];
      }
      continue;
    }
    if (currentNum !== null) buf.push(line);
  }
  flush();
  return sections;
}

// ─── Row extraction ────────────────────────────────────────────────────────

/**
 * Extract "rows" from a section. We treat as a row:
 *   1. Pipe-table rows (lines starting with `|`, excluding header separator).
 *      We skip the header row (the one above `|---|`) too — only data rows.
 *   2. Numbered list items in code-block-free context (e.g. `1. blah`) when
 *      the section uses an enumeration shape instead of a table.
 *
 * Code blocks (between fenced ```) are skipped entirely — § 7 carries TS test
 * stubs which use numerics as trigger predicates and are out of scope (the
 * stubs cite their own grounding via § 4 / § 6).
 */
function extractRows(sectionText: string): string[] {
  const lines = sectionText.split('\n');
  const rows: string[] = [];
  let inCodeFence = false;
  let prevWasHeader = false;

  for (const rawLine of lines) {
    const line = rawLine;

    // Track fence open/close.
    if (line.trimStart().startsWith('```')) {
      inCodeFence = !inCodeFence;
      prevWasHeader = false;
      continue;
    }
    if (inCodeFence) continue;

    const trimmed = line.trim();

    // Pipe-table rows: skip the header-separator line and the header row above it.
    if (/^\|[-:\s|]+\|$/.test(trimmed)) {
      // Separator — and the immediately-preceding row was the header. Drop it.
      if (rows.length > 0 && prevWasHeader) {
        rows.pop();
      }
      prevWasHeader = false;
      continue;
    }
    if (/^\|.*\|$/.test(trimmed)) {
      rows.push(trimmed);
      prevWasHeader = true;
      continue;
    }

    prevWasHeader = false;
  }

  return rows;
}

// ─── Confident-number detection ────────────────────────────────────────────

/** Strip inline `\`code\`` spans. */
function stripBackticks(s: string): string {
  return s.replace(/`[^`]*`/g, ' ');
}

/** Strip pure design-window patterns: time windows, tolerances, perturbations. */
function stripDesignSpec(s: string): string {
  return (
    s
      // Sim-time window: 0:00–0:10, 25:00–55:00, 1:30:00–3:00:00, etc.
      .replace(/\b\d+:\d+(?::\d+)?\s*[-–—]\s*\d+:\d+(?::\d+)?\b/g, ' ')
      // Bare HH:MM timestamp.
      .replace(/\b\d+:\d+(?::\d+)?\b/g, ' ')
      // Range with units: 0–2 min, 30 s – 2 min, 1–4 min, etc.
      .replace(
        /\b\d+\s*(?:min|sec|s|h|hr|hrs|m|ms)\s*[-–—]\s*\d+\s*(?:min|sec|s|h|hr|hrs|m|ms)?\b/gi,
        ' ',
      )
      // Tolerances: ±25%, ± 0.05, etc.
      .replace(/[±]\s*\d+(?:\.\d+)?\s*%?/g, ' ')
      // Perturbation specs: ×[0.80, 1.20], x[0.5, 2.0], ×0.95
      .replace(/[×x]\s*\[\s*[\d.,\s-]+\]/g, ' ')
      .replace(/[×x]\s*\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?/g, ' ')
  );
}

/**
 * Does the row, after stripping, still contain a digit?
 * If yes, the row makes a confident numerical claim that must be grounded.
 */
function rowHasConfidentNumber(rowText: string): boolean {
  const stripped = stripDesignSpec(stripBackticks(rowText));
  return /\d/.test(stripped);
}

// ─── Per-doc evaluation ────────────────────────────────────────────────────

function evaluateDoc(filename: string, doc: string): DocReport {
  const status = parseStatus(doc);

  if (status === 'unknown') {
    return {
      filename,
      status,
      failures: [],
      rowsChecked: 0,
      rowsGrounded: 0,
      skipped: true,
      skipReason: 'no Status frontmatter found',
    };
  }
  if (status === 'deprecated') {
    return {
      filename,
      status,
      failures: [],
      rowsChecked: 0,
      rowsGrounded: 0,
      skipped: true,
      skipReason: 'deprecated — not validated',
    };
  }

  const sections = extractSections(doc);
  const failures: Failure[] = [];
  let rowsChecked = 0;
  let rowsGrounded = 0;

  for (const num of [4, 6, 7] as const) {
    const sectionText = sections.get(num);
    if (!sectionText) {
      // Section absent — that's a structural failure but outside this validator's
      // scope (the existing structural-validator covers it; we only gate
      // grounding). Skip silently.
      continue;
    }

    const sectionMarkers = findMarkers(sectionText);
    const rows = extractRows(sectionText);

    rows.forEach((rowText, i) => {
      if (!rowHasConfidentNumber(rowText)) return;

      rowsChecked++;
      const rowMarkers = findMarkers(rowText);

      const grounded =
        status === 'canonical'
          ? hasCanonicalGrounding(rowMarkers) || hasCanonicalGrounding(sectionMarkers)
          : hasCandidateGrounding(rowMarkers) || hasCandidateGrounding(sectionMarkers);

      if (grounded) {
        rowsGrounded++;
      } else {
        const reason =
          status === 'canonical'
            ? 'no `reference-code/`, `wiki:`, inline `<file>:line`, `vanilla`, `canonical`, or `declared invention` marker in row or section'
            : 'no `aspirational`, `declared invention`, `reference-code/`, `wiki:`, inline `<file>:line`, `vanilla`, or `canonical` marker in row or section';
        failures.push({
          section: num,
          rowIndex: i + 1,
          rowText: condenseRow(rowText),
          reason,
        });
      }
    });
  }

  return { filename, status, failures, rowsChecked, rowsGrounded, skipped: false };
}

/** Compress a row to a one-line snippet for the report. */
function condenseRow(rowText: string): string {
  const oneLine = rowText.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= 140) return oneLine;
  return oneLine.slice(0, 137) + '...';
}

// ─── Reporter ──────────────────────────────────────────────────────────────

function formatReport(reports: DocReport[]): string {
  const lines: string[] = [];
  let totalFailures = 0;
  let totalDocsWithFailures = 0;
  let totalDocsChecked = 0;
  let totalDocsSkipped = 0;

  for (const r of reports) {
    if (r.skipped) {
      totalDocsSkipped++;
      lines.push(`archetypes/${r.filename} (${r.status}):`);
      lines.push(`  skip — ${r.skipReason}`);
      lines.push('');
      continue;
    }
    totalDocsChecked++;
    lines.push(`archetypes/${r.filename} (${r.status}):`);
    if (r.failures.length === 0) {
      lines.push(`  ok — ${r.rowsChecked} rows checked, ${r.rowsGrounded} grounded`);
    } else {
      totalDocsWithFailures++;
      totalFailures += r.failures.length;
      for (const f of r.failures) {
        lines.push(`  fail — § ${f.section} row ${f.rowIndex}: "${f.rowText}"`);
        lines.push(`         ↳ ${f.reason}`);
      }
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(
    `summary — ${totalDocsChecked} docs checked (${totalDocsSkipped} skipped); ` +
      `${totalFailures} failures across ${totalDocsWithFailures} doc${totalDocsWithFailures === 1 ? '' : 's'}.`,
  );
  return lines.join('\n');
}

// ─── Entry point ───────────────────────────────────────────────────────────

function listArchetypeDocs(): string[] {
  if (!existsSync(ARCHETYPES_DIR)) {
    throw new Error(`archetypes/ directory not found at ${ARCHETYPES_DIR}`);
  }
  return readdirSync(ARCHETYPES_DIR)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => !f.startsWith('_'))
    .filter((f) => f !== 'BALANCING.md')
    .sort();
}

function main(): number {
  const filenames = listArchetypeDocs();
  const reports: DocReport[] = filenames.map((filename) => {
    const fullPath = join(ARCHETYPES_DIR, filename);
    const doc = readFileSync(fullPath, 'utf8');
    return evaluateDoc(filename, doc);
  });

  process.stdout.write(formatReport(reports) + '\n');
  const anyFailures = reports.some((r) => r.failures.length > 0);
  return anyFailures ? 1 : 0;
}

process.exit(main());
