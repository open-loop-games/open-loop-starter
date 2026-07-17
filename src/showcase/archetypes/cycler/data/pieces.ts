// ─── Skeleton ───
// The build-phase pieces on the shared placement grid (IDENTITY § One shared
// surface; studio/open-loop-starter#21 leaf 2). Two kinds occupy the same board:
//   • Reactor (producer) — yields output; the economy's source.
//   • Relay   (booster)  — yields nothing itself; boosts adjacent producers
//                          (and, from leaf 3, adjacent Lances — the bridge that
//                          makes economy and defense one system).
// Pure config: typed defs + the reference full-board layout the closed-form
// ceiling calibrates against. The board module reads these at construction.

/** Connection shape a booster reaches — the cells it covers. Cycler uses `cross`. */
export type ConnectionShape = 'cross' | 'diagonal' | 'ring';

export type PieceKind = 'reactor' | 'relay';

export interface PieceDef {
  kind: PieceKind;
  /** Role in the adjacency evaluation: producers receive boosts, boosters emit them. */
  role: 'producer' | 'booster';
  /** Player-facing name (costume). */
  title: string;
  /** Player-facing description. */
  description: string;
  /** Producer base output (MW) before adjacency and permanent power. Boosters: undefined. */
  output?: number;
  /** Booster additive boost fraction per covered producer (1 = +100%). Producers: undefined. */
  boost?: number;
  /** Booster coverage shape. Producers: undefined. */
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
  relay: {
    kind: 'relay',
    role: 'booster',
    title: 'Relay',
    description: 'Boosts cross-adjacent Reactors (and, later, Lances) — the shared-state bridge.',
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
