/** A milestone time as `12m 05s`. */
export function milestoneClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}m ${String(Math.floor(seconds % 60)).padStart(2, '0')}s`;
}
