import { Decimal, formatWhole, type DecimalSource } from '@open-loop/engine';

/** A store read as whole units with thousands separators; the engine's notation past a million. */
export function fmt(value: DecimalSource): string {
  const d = Decimal.floor(value);
  return d.lt(1e6) ? d.toNumber().toLocaleString('en-US') : formatWhole(d);
}

/** Play time as `m:ss`. */
export function playClock(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A milestone time as `12m 05s`. */
export function milestoneClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}m ${String(Math.floor(seconds % 60)).padStart(2, '0')}s`;
}
