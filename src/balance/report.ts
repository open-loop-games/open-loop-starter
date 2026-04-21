import type { BeatSnapshot } from './flow-probe';
import type { BeatArcResult } from './arc-probe';
import type { SweepResult } from './sweep';

/** Format a duration in seconds as `MM:SS` or `HH:MM:SS`. */
export function formatDuration(sec: number): string {
  if (!isFinite(sec)) return '∞';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Format a flow-channel name with a one-glance verdict glyph. */
export function formatChannel(channel: string): string {
  // Pocket = arousal, flow, flow-upper. Out-of-pocket = boredom and worse.
  switch (channel) {
    case 'arousal':
      return 'arousal';
    case 'flow':
      return 'FLOW';
    case 'flow-upper':
      return 'flow-upper';
    case 'boredom':
      return '! boredom';
    case 'frustration':
      return '!! frustration';
    case 'breakdown':
      return '!!! breakdown';
    default:
      return channel;
  }
}

/** Format `[lo, hi]` second range as `MM:SS – MM:SS`. */
export function formatWindow(window: [number, number]): string {
  return `${formatDuration(window[0])} – ${formatDuration(window[1])}`;
}

/** Markdown table of arc-completion results. One row per beat. */
export function renderArcTable(results: BeatArcResult[]): string {
  const header = ['beat', 'spec window', 'p5', 'p50', 'p95', 'predicate / max', 'in window?'];
  const rows = results.map((r) => {
    const t = r.terminationTime;
    return [
      r.beatId,
      formatWindow(r.specWindow),
      t ? formatDuration(t.p5) : '—',
      t ? formatDuration(t.p50) : '—',
      t ? formatDuration(t.p95) : '—',
      `${r.counts.predicate} / ${r.counts.predicate + r.counts.maxSimTime}`,
      r.inWindow ? 'YES' : 'NO',
    ];
  });
  return renderMarkdownTable(header, rows);
}

/** Markdown table of per-beat per-producer pacing. */
export function renderFlowTable(snapshots: BeatSnapshot[]): string {
  const header = [
    'beat',
    'snapshot @',
    'producer',
    'level',
    'qty',
    'rate/u',
    'next cost',
    'beat T',
    'channel',
  ];
  const rows: string[][] = [];
  for (const snap of snapshots) {
    if (snap.perProducer.length === 0) {
      rows.push([
        snap.beatId,
        formatDuration(snap.snapshotSimTime),
        '(none owned)',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
      continue;
    }
    let first = true;
    for (const p of snap.perProducer) {
      rows.push([
        first ? snap.beatId : '',
        first ? formatDuration(snap.snapshotSimTime) : '',
        p.producerId,
        String(p.level),
        String(p.quantity),
        formatScientific(p.perUnitRate),
        formatScientific(p.nextCost),
        formatDuration(p.beatTimeSeconds),
        formatChannel(p.channel),
      ]);
      first = false;
    }
  }
  return renderMarkdownTable(header, rows);
}

/** Markdown table of sweep deltas (one per beat). */
export function renderSweepTable(sweep: SweepResult, metricKey: string): string {
  const header = ['cell', metricKey, 'Δ vs baseline (abs)', 'Δ vs baseline (%)'];
  const baselineMetric =
    sweep.baseline.aggregate.metrics[metricKey]?.avg ??
    sweep.baseline.aggregate.terminationTime?.avg;
  const rows = [
    ['baseline', baselineMetric != null ? formatDuration(baselineMetric) : '—', '—', '—'],
  ];
  for (const cell of sweep.cells) {
    const delta = cell.vsBaseline[metricKey];
    const cellMetric =
      cell.aggregate.metrics[metricKey]?.avg ?? cell.aggregate.terminationTime?.avg;
    rows.push([
      `${cell.axis}=${String(cell.value)}`,
      cellMetric != null ? formatDuration(cellMetric) : '—',
      delta ? formatDuration(delta.absolute) : '—',
      delta ? `${(delta.relative * 100).toFixed(1)}%` : '—',
    ]);
  }
  return renderMarkdownTable(header, rows);
}

function formatScientific(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n === 0) return '0';
  if (Math.abs(n) < 1000) return n.toFixed(2);
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mantissa = n / Math.pow(10, exp);
  return `${mantissa.toFixed(2)}e${exp}`;
}

function renderMarkdownTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const fmt = (cells: string[]) => `| ${cells.map((c, i) => c.padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [fmt(header), sep, ...rows.map(fmt)].join('\n');
}
