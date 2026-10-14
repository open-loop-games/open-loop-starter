// ─── Balance ───
// The spine: every number in the economy derives here from a handful of named anchors.
// Plain arithmetic, no engine. The modules read the anchors through `tunable()`, so a probe
// that overrides one sees every derived number follow.
//
// Bucket: piecewise phase alternation, a saturating ward against a geometric storm.
//
//   ward on one side  → saturates to  C_max   (its five shore cells, bracing, buttresses)
//   storm on night n  → W_n = W₀ · g^(n−1)    (exogenous: a pure function of the night index)
//   peg at run start  → W₀ = C_max / H        (C_max from permanent power only)
//   crossing night    → N_c = 1 + log_g(H)    (the first night a saturated side leaks)
//   run length        → N* = N_c + Δ_tower    (Δ_tower: nights the tower outlasts the leak)
//
// The peg re-baselines W₀ on permanent power, so a power purchase adds no run length; only
// bending g (the Storm almanac) lengthens a watch.

import { KNOWLEDGE_EFFECT } from './logbook';
import { SEA } from './sea';

/** The only hand-picked numbers. */
export const ANCHORS = {
  /** Seconds of calm per day. A cycle (day and night) is about three minutes. */
  daySeconds: 120,
  /** Seconds of storm per night: long enough to watch every breaker land. */
  nightSeconds: 50,

  /** Force one lone, unbraced breakwater turns aside per night: the ward unit. */
  wardPerWall: 10,
  /** Ward bonus per ring-adjacent breakwater (walls brace each other along the shore). */
  brace: 0.25,
  /** Ward bonus per buttress in the yard touching a breakwater (8-adjacent). */
  buttress: 0.2,
  /** Spray one screen turns per night on each quarter it faces, in lone walls. */
  screen: 1.2,

  /** Reference storm growth: the Skerry's own posting. Postings sit either side of it. */
  gRef: 1.5,
  /** At gRef, the first night a fully defended side starts to leak. Authors run length. */
  crossNightRef: 5,
  /** Nights the tower outlasts the crossing at saturation, at gRef. Sizes integrity. */
  tailNights: 1.5,

  /** Salvage per second one tide net catches in the calm. The economy's unit of flow. */
  netRate: 0.5,
  /** Storms throw up more wrack: the night multiplier on every net. */
  nightSurge: 2,
  /** Calm seconds a net holds beyond one night's catch before it spills. */
  netSlackDaySeconds: 60,

  /** Each price as a fraction of Y, one net's catch over a whole cycle. */
  priceInCycles: { net: 0.3, breakwater: 0.35, buttress: 1, screen: 0.8, winch: 2 },
  /** Per-copy price growth. Walls grow slowest: a side of five should stay in reach. */
  priceGrowth: { net: 1.6, breakwater: 1.3, buttress: 1.5, screen: 1.5, winch: 2 },
  /** Starting salvage, in cycles of Y: one net and two breakwaters on day one. */
  startInCycles: 1.15,
  /** A full mend of the tower costs this many cycles of Y. */
  fullRepairInCycles: 1.5,
  /** Night-only shoring, in cycles of Y; doubles with each use in one night. */
  shoreUpInCycles: 0.25,
  /** Salvage a Ship's timbers find washes up, in cycles of Y. */
  timbersInCycles: 0.6,

  /** Reference run for payout sizing: this many nets kept working all run. */
  refNets: 4,
  /** Logbook entries a saturated reference run pays for force weathered. */
  refEntriesWeathered: 6,
  /** Logbook entries a saturated reference run pays for salvage gathered. */
  refEntriesGathered: 4,

  /** The closing posting's storm is pegged to this many levels of stone, whatever is owned. */
  closingStone: 3,
  /** The first night the relief may be signalled on the closing posting. */
  callFromNight: 3,
  /**
   * The final gale, as a multiple of tonight's storm or the crossing night's, whichever is
   * larger: calling before the crossing buys no smaller gale, only an earlier one.
   */
  finalGale: 2.4,
} as const;

// ─── Skeleton ───
// Board geometry the spine reads. Structural, not tunable.

/**
 * One side's five shore cells, corner to corner: how many of its own walls brace each, and
 * how many of the three yard cells behind it touch each. A corner's other neighbour is on
 * the next side, so a side built alone braces its corners once.
 */
export const SIDE_PROFILE = [
  { braced: 1, buttresses: 1 },
  { braced: 2, buttresses: 2 },
  { braced: 2, buttresses: 3 },
  { braced: 2, buttresses: 2 },
  { braced: 1, buttresses: 1 },
] as const;
/** One more breaker each night: a late night reads as a longer assault, not a bigger number. */
export const BREAKERS_FIRST_NIGHT = 4;

// ─── Balance ───

export interface SpineInput {
  wardPerWall: number;
  headroomNights: number;
  gRef: number;
  netRate: number;
  daySeconds: number;
  nightSeconds: number;
  /** Product of permanent ward multipliers (Dressed stone). Re-pegs the storm. */
  wardPower: number;
}

export type PricedPiece = keyof typeof ANCHORS.priceInCycles;

export interface Spine {
  /** One net's catch over a full cycle. Every price is a multiple of it. */
  cycleYield: number;
  /** Capacity of one net: a night's surge catch plus `netSlackDaySeconds` of calm. */
  netCapacity: number;
  /** Saturated ward of one side under current permanent power. */
  cMax: number;
  /** How many times the opening storm a saturated side turns. */
  headroom: number;
  /** Opening storm (night 1) under the peg. */
  w0: number;
  /** Tower integrity at run start. */
  integrity: number;
  prices: Record<PricedPiece, { base: number; growth: number }>;
  startSalvage: number;
  /** Salvage per integrity point mended. */
  repairPerPoint: number;
  shoreUpBase: number;
  /** Ward one shoring adds to the struck side for the rest of the night: one braced wall. */
  shoreUpWard: number;
  /** Spray one screen turns per night on each quarter it faces. */
  screenWard: number;
  /** The closing posting's opening storm: authored at `closingStone`, not pegged to power. */
  closingW0: number;
  timbers: number;
  /** A wreck's salvage, smallest and largest. */
  wreckSize: readonly [number, number];
  /** Salvage stripped from a wreck per second there. */
  stripPerSecond: number;
  /** Divisors inside the cube-root payout, one per source. */
  payoutScale: { weathered: number; gathered: number };
}

/** The reference input: every anchor at its default, no permanent power. */
export function referenceInput(wardPower = 1): SpineInput {
  return {
    wardPerWall: ANCHORS.wardPerWall,
    headroomNights: ANCHORS.crossNightRef,
    gRef: ANCHORS.gRef,
    netRate: ANCHORS.netRate,
    daySeconds: ANCHORS.daySeconds,
    nightSeconds: ANCHORS.nightSeconds,
    wardPower,
  };
}

/**
 * Saturated ward of one side: five walls on its own shore cells with three buttresses
 * behind, the side as one side's cells can build it. Walls on the next sides' cells beside
 * the corners brace them twice, which is reach above C_max, like shoring.
 */
export function saturatedSideWard(wardPerWall: number, power: number): number {
  let total = 0;
  for (const cell of SIDE_PROFILE)
    total += (1 + ANCHORS.brace * cell.braced) * (1 + ANCHORS.buttress * cell.buttresses);
  return wardPerWall * power * total;
}

/**
 * Integrity sized so the tower outlasts the crossing by `tailNights` at gRef: after the
 * crossing night c, night c+k leaks C_max·(g^k − 1), and a fractional last night counts pro
 * rata.
 */
export function integrityForTail(cMax: number, g: number, tailNights: number): number {
  let total = 0;
  for (let k = 1; k <= Math.ceil(tailNights); k++) {
    const share = Math.min(1, tailNights - (k - 1));
    total += share * cMax * (g ** k - 1);
  }
  return total;
}

export function deriveSpine(input: SpineInput): Spine {
  const a = ANCHORS;
  const cycleYield = input.netRate * (input.daySeconds + a.nightSurge * input.nightSeconds);
  const netCapacity = input.netRate * (a.nightSurge * input.nightSeconds + a.netSlackDaySeconds);
  const cMax = saturatedSideWard(input.wardPerWall, input.wardPower);
  // H is authored so night `headroomNights` meets C_max exactly at gRef: W₀·gRef^(N_c−1) = C_max.
  const headroom = input.gRef ** (input.headroomNights - 1);
  const w0 = cMax / headroom;
  const integrity = integrityForTail(cMax, input.gRef, a.tailNights);
  const price = (k: PricedPiece) => ({
    base: Math.round(cycleYield * a.priceInCycles[k]),
    growth: a.priceGrowth[k],
  });
  // A saturated reference run weathers about Σ W_n up to the crossing, C_max·g/(g−1), and
  // gathers refNets·Y per night it lasts.
  const refNights = input.headroomNights + a.tailNights;
  const refWeathered = (cMax * input.gRef) / (input.gRef - 1);
  const refGathered = a.refNets * cycleYield * refNights;
  return {
    cycleYield,
    netCapacity,
    cMax,
    headroom,
    w0,
    integrity,
    prices: {
      net: price('net'),
      breakwater: price('breakwater'),
      buttress: price('buttress'),
      screen: price('screen'),
      winch: price('winch'),
    },
    startSalvage: Math.round(cycleYield * a.startInCycles),
    repairPerPoint: (cycleYield * a.fullRepairInCycles) / integrity,
    shoreUpBase: Math.round(cycleYield * a.shoreUpInCycles),
    shoreUpWard: input.wardPerWall * input.wardPower * (1 + 2 * a.brace),
    screenWard: input.wardPerWall * input.wardPower * a.screen,
    closingW0:
      saturatedSideWard(input.wardPerWall, KNOWLEDGE_EFFECT.stone ** a.closingStone) / headroom,
    timbers: Math.round(cycleYield * a.timbersInCycles),
    wreckSize: [cycleYield * SEA.wreckSizeInCycles[0], cycleYield * SEA.wreckSizeInCycles[1]],
    stripPerSecond: cycleYield * SEA.stripPerSecondInCycles,
    payoutScale: {
      weathered: refWeathered / a.refEntriesWeathered ** 3,
      gathered: refGathered / a.refEntriesGathered ** 3,
    },
  };
}

// ─── Predictions ───
// The spine in runnable form: `../balance/cycler-projection.ts` prints these, and the
// probes print them beside what the engine measures.

/** Storm growth after the Storm almanac bends it toward 1. */
export function bentG(g: number, almanacLevels: number, bendRatio: number): number {
  return 1 + (g - 1) * bendRatio ** almanacLevels;
}

/** First night a saturated side leaks: N_c = 1 + log_g(H). Fractional. */
export function crossingNight(headroom: number, g: number): number {
  return 1 + Math.log(headroom) / Math.log(g);
}

/**
 * Nights survived by a saturated keeper: the last whole night the tower stands. Walks the
 * integer nights, since storms land per night: night n leaks max(0, W_n − C_max), and the
 * run ends on the night the running leak passes integrity.
 */
export function predictNightsSurvived(
  s: Pick<Spine, 'cMax' | 'w0' | 'integrity'>,
  g: number,
): number {
  let leaked = 0;
  for (let n = 1; n < 200; n++) {
    leaked += Math.max(0, s.w0 * g ** (n - 1) - s.cMax);
    if (leaked >= s.integrity) return n - 1;
  }
  return Infinity;
}
