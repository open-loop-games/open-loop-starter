/**
 * Money notation. A firm reads its books in words, not exponents: grouped dollars
 * below a million, then "1.24 million" up the -illion ladder, and the engine's
 * notation only once the words run out.
 */
import { Decimal, format, type DecimalSource } from '@open-loop/engine';

const ILLIONS = [
  'million',
  'billion',
  'trillion',
  'quadrillion',
  'quintillion',
  'sextillion',
  'septillion',
  'octillion',
  'nonillion',
  'decillion',
];

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Bare magnitude without the dollar sign. */
export function amount(value: DecimalSource): string {
  const d = Decimal.fromValue(value);
  if (d.lt(0)) return `−${amount(d.neg())}`;
  if (d.lt(100)) return d.eq(d.floor()) ? grouped.format(d.toNumber()) : cents.format(d.toNumber());
  if (d.lt(1e6)) return grouped.format(Math.floor(d.toNumber()));
  const exp = Math.floor(d.log10().toNumber() / 3) - 2;
  if (exp < ILLIONS.length) {
    const mantissa = d.div(Decimal.pow(1000, exp + 2)).toNumber();
    return `${mantissa.toFixed(mantissa < 10 ? 3 : mantissa < 100 ? 2 : 1)} ${ILLIONS[exp]}`;
  }
  return format(d);
}

export function money(value: DecimalSource): string {
  const d = Decimal.fromValue(value);
  return d.lt(0) ? `−$${amount(d.neg())}` : `$${amount(d)}`;
}

export function perSecond(value: DecimalSource): string {
  return `${money(value)}/s`;
}

/** Sim seconds since founding, as mm:ss. */
export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
