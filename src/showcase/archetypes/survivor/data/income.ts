// ─── Skeleton ───
// The income model — how motes become levels (`../IDENTITY.md` § Rate-function
// spine). It composes the threat curve (`./arena.ts`) with a seat's movement
// policy (`./seats.ts`), which is exactly why income is an ECONOMIC term here
// rather than a survival one: on a scrolling floor the operator chooses how much
// threat to meet, so the movement policy decides the economy.
//
// One home, because the XP ladder is derived from this and the shipping modules
// integrate it. If the projection's income and the game's income were written
// twice they would drift, and the ladder would quietly stop meaning anything.

import { COLLECTOR_BALANCE, spawnRate } from './arena';
import type { SeatDef } from './seats';
import { meanMoteYield } from './specimens';

/** A mote is one XP, so the ladder reads in motes rather than in points. */
export const XP_PER_MOTE = 1;

/** Integration step for the cumulative forms below, in game-seconds. */
const DT = 0.5;

// Every rate below projects from `seat.measured`, never from the seat's authored parameters.
// The authored parameters are what the policy is asked to prefer; these are what it achieves,
// and the gap between them is not a rounding error — see `./seats.ts`
// § SeatOutcome for the 20% ladder error that reading authored parameters here produced.

/** Motes dropped per game-second at `t` — kills × mean yield over the live mix. */
export function dropRate(t: number, seat: SeatDef): number {
  return spawnRate(t) * seat.measured.killsPerSpawn * meanMoteYield(t) * XP_PER_MOTE;
}

/** Motes banked per game-second at `t`, excluding collector bursts. */
export function incomeRate(t: number, seat: SeatDef): number {
  return dropRate(t, seat) * seat.measured.eta;
}

/**
 * Motes dropped but NOT banked — the pool a collector later pulls from.
 *
 * This is the term that punished reading the authored parameter. It is a cut of `1 − η`, so
 * understating `η` does not merely understate continuous income, it INFLATES the
 * collector's modelled yield — an error in the opposite direction, on a quantity
 * the ladder is derived from. At an authored 0.65 the pool reads 35% of drops;
 * measured it is nearer 3%.
 */
export function uncollectedRate(t: number, seat: SeatDef): number {
  return dropRate(t, seat) * (1 - seat.measured.eta);
}

/** Cumulative continuously-banked motes up to `t`. */
export function cumulativeIncome(t: number, seat: SeatDef): number {
  let total = 0;
  for (let s = 0; s < t; s += DT) total += incomeRate(s, seat) * DT;
  return total;
}

/**
 * Cumulative motes up to `t` INCLUDING collector impulses — the honest income
 * model, and the one `deriveXpLadder` must be handed. Each collector pulls
 * `onscreenShare` of everything left unbanked since the previous one.
 */
export function cumulativeIncomeWithCollectors(t: number, seat: SeatDef): number {
  let total = cumulativeIncome(t, seat);
  let windowStart = 0;
  for (const tv of COLLECTOR_BALANCE.nominalTimes.slice(0, COLLECTOR_BALANCE.perRun)) {
    if (tv > t) break;
    let pool = 0;
    for (let s = windowStart; s < tv; s += DT) pool += uncollectedRate(s, seat) * DT;
    total += pool * COLLECTOR_BALANCE.onscreenShare;
    windowStart = tv;
  }
  return total;
}

/**
 * Cumulative motes with the collector yield AMORTIZED — the expected-value form,
 * and the one the XP ladder must be derived against.
 *
 * Collectors drop stochastically, so deriving a ladder against point impulses at
 * nominal times bakes those times into the ladder: the beat containing an impulse
 * absorbs it as a huge requirement and its neighbours shrink, which holds the
 * schedule only for runs whose collectors land exactly there. Spreading the same
 * expected yield in proportion to continuous income keeps the ladder monotone and
 * leaves actual drops as jitter around the schedule instead of a cliff in it.
 */
export function cumulativeIncomeAmortized(t: number, seat: SeatDef, runSeconds: number): number {
  const continuous = cumulativeIncome(runSeconds, seat);
  if (continuous <= 0) return 0;
  const withBursts = cumulativeIncomeWithCollectors(runSeconds, seat);
  return cumulativeIncome(t, seat) * (withBursts / continuous);
}

// ─── Balance ────────────────────────────────────────────────────────────────
//   drops(t)       = d₀ · m_d^(t/60) · engage · meanMoteYield(t)
//   income(t)      = drops(t) · η
//   uncollected(t) = drops(t) · (1 − η)
//   collector      = onscreenShare · ∫ uncollected  over the window since the last
//
// `meanMoteYield` (`./specimens.ts`) is not a constant: it rises from 1.0 at open
// to ~2.4 once the heavy tiers are live, so late kills are worth more than early
// ones. Modelling it as 1 would have put an unaccounted ~2× on late income and
// landed every beat after the first tier entry early — the collector failure in a
// different costume, and just as invisible from any single beat.
//
// ─── η is assumed, never predicted ───
//
// Collection efficiency is a POLICY OUTPUT. The closed form takes an η and
// projects from it; it cannot derive one, because η falls out of how the
// movement policy trades contact risk for banked motes. This is the second half
// of the declared coverage boundary (`../IDENTITY.md` § Rate-function spine).
//
// The consequence worth knowing: a run that misses its beat schedule is either
// badly balanced or badly piloted, and those look identical from outside. The
// probe therefore reports η measured against η assumed, and splits it into
// continuous pickup and collector bursts — that split is what says which side
// needs the work. Retuning an economy because the automated player was bad is the standard way
// this goes wrong, and it is invisible without the ratio.
//
// ─── Collectors are impulses and belong in the derivation ───
//
// Two bursts at ~11% of run income. They must be inside the income handed to
// `deriveXpLadder` (`./schedule.ts`), not layered on afterwards: a smooth-derived
// ladder puts beats up to ~114s early and never re-syncs, because nothing in the
// ladder restores the schedule. Measured in the projection's derivation check.
//
// But they must go in AMORTIZED, not as point impulses. Second measured receipt:
// deriving against `cumulativeIncomeWithCollectors` directly produced a
// non-monotone ladder — beat 30 wanted 534 motes and beat 33 only 365 — because
// the beat straddling a nominal drop absorbs the whole burst. That ladder holds
// the schedule only for runs whose collectors land at the nominal times, and the
// drop is a roll. `cumulativeIncomeAmortized` is what the derivation takes.
//
// Second-order, and the reason collectors are worth their complexity: because
// motes stay on the floor and the floor behind the operator is un-spawned, deferring
// collection to bank a larger burst is a coherent gamble paid for against the
// beat schedule. The edge arrow on an off-screen collector is what makes routing
// through your own uncollected field a decision rather than a reflex.
//
// Known thin: `nominalTimes` is deterministic here where the game rolls a drop.
// The impulse MAGNITUDE is modelled; its variance is not, and picking it up is
// part of the seeded multi-run work.
