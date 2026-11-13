import type { BeatResult } from '@open-loop/engine';
import { formatClock } from '@/composables/useFormatting';

/** `formatClock`, with `∞` for a beat time that never comes. */
const clock = (sec: number): string => (Number.isFinite(sec) ? formatClock(sec) : '∞');

const formatWindow = (window: [number, number]): string =>
  `${clock(window[0])} – ${clock(window[1])}`;

/**
 * Markdown table of arc results, one row per beat. Takes what `runBeatProbe`
 * returns, or `beatResultsOf` over the fire times an arc probe recorded.
 */
export function renderArcTable(results: BeatResult[]): string {
  const header = ['beat', 'tuning window', 'p5', 'p50', 'p95', 'reached / runs', 'in window?'];
  const rows = results.map((r) => {
    const t = r.terminationTime;
    const runs = r.counts.predicate + r.counts.maxSimTime + r.counts.unreachable;
    return [
      r.beatId,
      r.tuningWindow ? formatWindow(r.tuningWindow) : '—',
      t ? clock(t.p5) : '—',
      t ? clock(t.p50) : '—',
      t ? clock(t.p95) : '—',
      `${r.counts.predicate} / ${runs}`,
      r.inTuningWindow === undefined ? '—' : r.inTuningWindow ? 'YES' : 'NO',
    ];
  });
  return renderMarkdownTable(header, rows);
}

function renderMarkdownTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const fmt = (cells: string[]) => `| ${cells.map((c, i) => c.padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [fmt(header), sep, ...rows.map(fmt)].join('\n');
}
