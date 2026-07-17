// ─── Skeleton ───
// The pieces on the one shared placement grid (IDENTITY § One shared surface;
// studio/open-loop-starter#21 leaves 2–3, #22 roster additions). Five kinds occupy
// the same board:
//   • Reactor (producer) — yields MW output; the economy's source.
//   • Lance   (tower)    — yields clear-rate C (Lance interception); draws MW to
//                          fire (a within-run sink). Shares cells with Reactors —
//                          every cell a Lance takes is a cell not producing (the
//                          spatial C-vs-output tradeoff, Stage 2).
//   • Relay   (booster)  — yields nothing itself; boosts cross-adjacent Reactors AND
//                          Lances — the bridge that makes economy and defense one
//                          system (Relays raise both output and C). Concentrated,
//                          short (range-1) reach.
//   • Pylon   (booster)  — a range-2 booster (studio/open-loop-starter#22): the same
//                          Reactor-AND-Lance bridge as Relay, but reaching two cells
//                          out along each axis (`reach` shape) at a lower per-cell
//                          boost. Diffuse long reach vs Relay's concentrated boost —
//                          it spans the forward/back split (a row-1 Pylon lifts a
//                          front-row Lance AND a back-row Reactor), a distinct tool,
//                          not a strict upgrade.
//   • Bulwark (repair)   — the third strategic leg made spatial (leaf 3): converts
//                          MW surplus into line-repair THROUGHPUT (Δ_wall tail). A
//                          Bulwark cell is a cell not producing or clearing, so
//                          "buy tail" competes for the board like C and output.
//                          Not a boost receiver (boosters don't lift it).
// Pure config: typed defs + the reference full-board layout the closed-form
// ceiling calibrates against. The board module reads these at construction.

/**
 * Connection shape a booster reaches — the cells it covers. `cross` = 4-connected
 * (range-1 cardinal, Relay), `diagonal` = the 4 range-1 corners, `ring` = the 8
 * range-1 Moore cells, `reach` = the range-2 cardinal cross (distance 1 AND 2 along
 * each axis, up to 8 cells — Pylon's wider footprint).
 */
export type ConnectionShape = 'cross' | 'diagonal' | 'ring' | 'reach';

export type PieceKind = 'reactor' | 'lance' | 'relay' | 'pylon' | 'bulwark';

/**
 * A piece's role in the adjacency evaluation. `producer` and `tower` are both
 * *boostable* receivers (Relays lift both); `booster` emits the boost; `repair`
 * is neither (it feeds the wall's Δ_wall tail, not the board evaluation).
 */
export type PieceRole = 'producer' | 'tower' | 'booster' | 'repair';

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
  /** Repair throughput β (MW-surplus → line HP a Bulwark can route per STANDBY, before power). Non-repair: undefined. */
  throughput?: number;
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
  pylon: {
    kind: 'pylon',
    role: 'booster',
    title: 'Pylon',
    description: 'Range-2 booster — a lower, longer-reach lift spanning the forward/back split.',
    boost: 0.35,
    shape: 'reach',
  },
  bulwark: {
    kind: 'bulwark',
    role: 'repair',
    title: 'Bulwark',
    description: 'Routes MW surplus into line repair — extends the Δ_wall tail. Costs a cell.',
    throughput: 200,
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

/**
 * A competent reference DEFENSE board: a forward Lance line (relay-boosted),
 * Reactors behind, and one Bulwark. Its realized clear-rate is a fixed fraction of
 * the aspirational `cMax`, so a run reaches a consistent, power-invariant crossing +
 * Δ_wall tail. Row-major, length BOARD.width·BOARD.height. Used by the wave-model sim
 * harness (`sim/harness.ts` placeDefense) and the balance probes — one source of the
 * reference so they can't drift. (Distinct from REFERENCE_LAYOUT, the all-producer
 * board the OUTPUT ceiling D_max calibrates against.)
 */
export const REFERENCE_DEFENSE: readonly (PieceKind | null)[] = [
  'lance',
  'lance',
  'lance',
  'lance',
  'relay',
  'relay',
  'relay',
  'relay',
  'reactor',
  'reactor',
  'reactor',
  'reactor',
  'reactor',
  'reactor',
  'reactor',
  'bulwark',
];

// ─── Balance ───
// The realized board reconciles with the abstract ceiling (studio/open-loop-starter#6
// `data/build.ts`): the finite board caps capacity, which is what makes the burn
// crossing logarithmic. Leaf 2 replaces the SCALAR ceiling with a REAL evaluation
// over placed pieces, calibrated so the reference full board reproduces it:
//   • Reactor output 95 MW; Relay +0.75 per cross-covered receiver; Pylon +0.35 per
//     range-2-covered receiver. Both boosters sum into ONE additive group (multiplier
//     = 1 + Σ all boosts), the degenerate case of mv-hr's hybrid stacking — cycler has
//     no cross-type product. Pylon's magnitude is illustrative (a fork re-grounds it),
//     traded lower for its wider `reach` footprint; like every booster it lifts realized
//     C/output toward the reference, never the closed-form cMax/dMax peg.
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
