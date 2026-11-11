/**
 * A milestone time as `12m 05s`. The engine's `formatTime` writes the same from one minute
 * up, but hundredths below it ("45.00s"), and a milestone can fall there.
 */
export function milestoneClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}m ${String(Math.floor(seconds % 60)).padStart(2, '0')}s`;
}
