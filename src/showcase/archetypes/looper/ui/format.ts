/** Night-clock time: `m:ss.s` past a minute, `s.s` under it. */
export function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.max(0, seconds);
  if (s < 60) return s.toFixed(1);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
}

/** Signed split delta, `−3.2` faster / `+1.0` slower. */
export function delta(seconds: number): string {
  const sign = seconds < 0 ? '−' : '+';
  return `${sign}${Math.abs(seconds).toFixed(1)}`;
}

/** A speed multiplier: `×1.42`. */
export function mult(x: number): string {
  return `×${x.toFixed(2)}`;
}

/** Whole-number display for small counts like Intel. */
export function whole(x: number): string {
  return Math.floor(x + 1e-9).toLocaleString('en-US');
}

/** A duration with its unit: `12.3s` under a minute, `1:10` past it. */
export function secs(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.round(seconds - m * 60)).padStart(2, '0')}`;
}
