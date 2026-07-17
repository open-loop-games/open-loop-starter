// ─── Skeleton ───
// The pieces on the one shared placement grid (IDENTITY § One shared surface;
// studio/open-loop-starter#21 leaves 2–3). Three kinds occupy the same board:
//   • Reactor (producer) — yields MW output; the economy's source.
//   • Lance   (tower)    — yields clear-rate C (Lance interception); draws MW to
//                          fire (a within-run sink). Shares cells with Reactors —
//                          every cell a Lance takes is a cell not producing (the
//                          spatial C-vs-output tradeoff, Stage 2).
//   • Relay   (booster)  — yields nothing itself; boosts adjacent Reactors AND
//                          Lances — the bridge that makes economy and defense one
//                          system (Relays raise both output and C).
// Pure config: typed defs + the reference full-board layout the closed-form
// ceiling calibrates against. The board module reads these at construction.

/** Connection shape a booster reaches — the cells it covers. Cycler uses `cross`. */
export type ConnectionShape = 'cross' | 'diagonal' | 'ring';

export type PieceKind = 'reactor' | 'lance' | 'relay';

/**
 * A piece's role in the adjacency evaluation. `producer` and `tower` are both
 * *boostable* receivers (Relays lift both); `booster` emits the boost.
 */
export type PieceRole = 'producer' | 'tower' | 'booster';

export interface PieceDef {
  kind: PieceKind;
  role: PieceRole;
  /** Player-facing name (costume). */
  title: string;
  /** Player-facing description. */
  description: string;
  /** Producer base output (MW) before adjacency and permanent power. Non-producers: undefined. */
  output?: number;
  /** Tower base clear-rate C (interception) before adjacency and power. Non-towers: undefined. */
  intercept?: number;
  /** Tower MW drawn per INBOUND to fire — the within-run economic sink. Non-towers: undefined. */
  draw?: number;
  /** Booster additive boost fraction per covered receiver (1 = +100%). Non-boosters: undefined. */
  boost?: number;
  /** Booster coverage shape. Non-boosters: undefined. */
  shape?: ConnectionShape;
}

/** The one shared board — 4×4 = 16 cells (the abstract `build.boardCells`). */
export const BOARD = { width: 4, height: 4 } as const;

export const PIECES: Record<PieceKind, PieceDef> = {
  reactor: {
    kind: 'reactor',
    role: 'producer',
    title: 'Reactor',
    description: 'Yields MW. The economy that funds Lances and repair.',
    output: 95,
  },
  lance: {
    kind: 'lance',
    role: 'tower',
    title: 'Lance',
    description: 'Directed-energy tower — raises clear-rate C, draws MW to fire.',
    intercept: 40,
    draw: 30,
  },
  relay: {
    kind: 'relay',
    role: 'booster',
    title: 'Relay',
    description: 'Boosts cross-adjacent Reactors and Lances — the shared-state bridge.',
    boost: 0.75,
    shape: 'cross',
  },
};

/**
 * The canonical full-board layout (`fillBoard`) — the reference the closed-form
 * ceiling calibrates against. Row-major, length BOARD.width·BOARD.height. 12
 * Reactors + 4 Relays; each Relay cross-covers its Reactor neighbours. Its
 * realized output ≈ the abstract `D_max` (see the Balance lens). A player min-maxes
 * a different layout freely — this is the default a fill produces, not the optimum.
 */
export const REFERENCE_LAYOUT: readonly (PieceKind | null)[] = [
  'reactor',
  'reactor',
  'reactor',
  'reactor',
  'reactor',
  'relay',
  'reactor',
  'relay',
  'reactor',
  'reactor',
  'reactor',
  'reactor',
  'reactor',
  'relay',
  'reactor',
  'relay',
];

// ─── Balance ───
// The realized board reconciles with the abstract ceiling (studio/open-loop-starter#6
// `data/build.ts`): the finite board caps capacity, which is what makes the burn
// crossing logarithmic. Leaf 2 replaces the SCALAR ceiling with a REAL evaluation
// over placed pieces, calibrated so the reference full board reproduces it:
//   • Reactor output 95 MW; Relay +0.75 per cross-covered Reactor (additive, one
//     booster type ⇒ a single additive group, per the lifted mv-hr evaluator).
//   • REFERENCE_LAYOUT: 12 Reactors, Σ adjacency-multiplier = 12·(1) + 0.75·(Σ
//     cross-coverage = 12) = 21. Realized output = 95 · 21 = 1995 ≈ the abstract
//     D_max = boardCells·baseOutputCeiling·adjacencyBoost = 16·50·2.5 = 2000 (99.7%).
//     `sim/build.test.ts` locks realized ≈ D_max (tolerance) — the leaf-2 lock.
//   • The peg still reads the closed-form `D_max` (unchanged formula; `data/build.ts`),
//     so the kernel crossing and prestige currency are undisturbed — the realized
//     board is the live/UI value and the substrate leaf 3 (Lances) reads C off.
//   • Permanent power scales the whole board ·producerUpgradeRatio^L uniformly, so
//     realized capacity stays geometric in L (reach) exactly like D_max.
//   • Absolute (output, boost) magnitudes are illustrative; a fork re-grounds them
//     in its own economy. The load-bearing facts are the finite board (saturation)
//     and booster-additive adjacency (the synergy that builds the ceiling).
