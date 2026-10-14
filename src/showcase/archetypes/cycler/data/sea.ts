// ─── Skeleton ───
// What the sea brings besides the storm's force. A night's gale may carry spray, which goes
// over the walls and is turned only by screens facing its quarter; dawn names the kind, and
// dusk shows how much of the force is spray. From the middle of a watch the gale may back:
// some breakers swing to the quarter named beside tonight's. And some dawns a wreck is
// sighted offshore, which the keeper may row out to strip while the day lasts.

export type GaleKind = 'gale' | 'spray';

// ─── Balance ───
// The storm's force stays a pure function of the night (`./spine.ts`); these only decide where
// it lands and what turns it, so a side built for the night's kind still meets C_max.
//   spray share — a hedge: dawn names the kind, dusk draws the share, and a mix of screens and
//     buttresses built at dawn must turn the share drawn. Screens are sized (`ANCHORS.screen`)
//     so three of them behind bare walls turn about C_max at any share.
//   backing — per breaker, with odds against a repeat (Dome Keeper's side flips): after a
//     backed breaker the odds halve, after a true one they recover by `backingRecover`.
export const SEA = {
  /** First night spray may come. */
  sprayFromNight: 3,
  /** Chance a night from `sprayFromNight` on carries spray. */
  sprayChance: 0.5,
  /** The share of a spray night's force that is spray, drawn at dusk. */
  sprayShares: [0.2, 0.3, 0.4] as const,
  /** First night the gale may back. */
  backingFromNight: 4,
  /** Odds a breaker backs, when the last one did not. */
  backingOdds: 0.3,
  /** Odds recovered after a breaker that held true, up to `backingOdds`. */
  backingRecover: 0.1,
  /** Chance a wreck is sighted at dawn, from night 2 on. */
  wreckChance: 0.5,
  /** A wreck's salvage, in cycles of Y: drawn evenly between the two. */
  wreckSizeInCycles: [0.4, 1.2] as const,
  /** Seconds to row to the wreck, and the same back. */
  rowSeconds: 10,
  /** Salvage a keeper strips from a wreck per second there, in cycles of Y. */
  stripPerSecondInCycles: 1 / 60,
} as const;
