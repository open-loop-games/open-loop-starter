// ─── Skeleton ───
// The spine's home in `data/`. Every economy number in Night Clerk is derived
// here from a handful of named anchors, in plain arithmetic with no engine.
// Modules read these values at their `tunable()` reader sites and never
// re-author them; `balance/phase-shifter-projection.ts` prints them, and
// `balance/arc-probe.ts` measures the shipping game against them.
//
// Shape: three phases, each with its own currency and its own player. The
// box is a geometric clerk ladder, solved in closed form. The board and the
// night are walks of the reference player's own policies (`bestCell`,
// `planWatches` in `./evidence.ts`), because what they earn depends on
// arrangement and search, not only on what is bought. The phases do not
// compound — each one-way door retires the economy below it — so each is
// solved alone, and what couples them is what a door hands forward: the
// leftover notes and the clerks into the board, the pinned cards into the
// night as hints.

import { SUSPECTS } from './case';
import {
  BOARD_SIDE,
  BOARD_SIDES,
  CARD_BY_ID,
  DECK,
  SUSPECT_AT,
  SUSPECT_CARDS,
  bestCell,
  boardStrength,
  cellAt,
  planWatches,
  watchKey,
} from './evidence';

/** The only hand-picked numbers. Everything in § Balance follows from them. */
export const ANCHORS = {
  /** Manual acts per second an engaged player sustains — the player model. */
  clickRate: 2,
  /** Cost ratio on every repeatable ladder: doubles every ≈5 buys. */
  growth: 1.15,

  /** Seconds of reading by hand before the first clerk is affordable. */
  firstClerkSeconds: 8,
  /** Seconds a first clerk takes to read back its own price. */
  clerkPaybackSeconds: 16,
  /** Designed length of Phase I, the box. */
  phaseISeconds: 240,

  /** Cards a clerk — or you — writes up per second, notes allowing. */
  clerkCardsPerS: 0.02,
  /** Seconds into Phase II by which the whole deck is written up. */
  deckSeconds: 360,
  /** Leads per second each unit of string strength earns. Unit anchor. */
  leadsPerStrength: 1,
  /** Seconds into Phase II at which the reference board opens to 4×4. */
  boardOpensAt: 200,
  /** The 5×5 costs this many times what the reference banks after its 4×4: it rewards staying on the board. */
  boardLinger: 1.5,
  /** Designed length of Phase II, the board. */
  phaseIISeconds: 420,

  /** Sim-seconds per replayed night, 18:00 → 06:00. */
  nightSeconds: 40,
  /** Watches the first night can staff. */
  rosterStart: 2,
  /** Sightings an hour of an alibi needs before it holds. */
  sightingsPerHour: 1,
  /** Watches per unit of strain the night can take: a bigger night shift can afford to search more. */
  watchesPerStrain: 2,
  /** Accounts each sighting files at dawn. Unit anchor. */
  accountsPerSighting: 1,
  /** Night on which the sixth alibi holds under the reference planner. */
  lastAlibiNight: 13,
  /** Nights replayed before the clerks plan the watch themselves. */
  planningTierNights: 3,
  /** Game-speed factor once the clerk stops sleeping. */
  insomniaSpeed: 2,
} as const;

// ─── Balance ────────────────────────────────────────────────────────────────

/**
 * A geometric ladder `cost(j) = base · growth^j` funded by
 * `rate(j) = rate0 + ratePer · j`, bought greedily from an opening bank.
 */
export interface Ladder {
  base: number;
  growth: number;
  rate0: number;
  ratePer: number;
  /** Currency in hand at t = 0. */
  bank0?: number;
}

/**
 * Greedy walk of a ladder to `seconds`: each rung waits `(cost − bank) / rate`.
 * Returns the owned count, the total spent, the total earned (opening bank
 * included) and the time each purchase landed.
 */
export function ladderAt(
  l: Ladder,
  seconds: number,
): { count: number; spent: number; earned: number; times: number[] } {
  const times: number[] = [];
  let t = 0;
  let bank = l.bank0 ?? 0;
  let spent = 0;
  for (let n = 0; ; n++) {
    const cost = l.base * l.growth ** n;
    const rate = l.rate0 + l.ratePer * n;
    const wait = Math.max(0, cost - bank) / rate;
    if (t + wait > seconds) {
      bank += rate * (seconds - t);
      return { count: n, spent, earned: spent + bank, times };
    }
    t += wait;
    bank += rate * wait - cost;
    spent += cost;
    times.push(t);
  }
}

// Phase I — the box ─────────────────────────────────────────────────────────

/** Notes per page read. Unit anchor: a page is a note. */
export const NOTES_PER_PAGE = 1;
/** First clerk price: `firstClerkSeconds` of hand reading at the click rate. */
export const CLERK_BASE_COST = ANCHORS.clickRate * NOTES_PER_PAGE * ANCHORS.firstClerkSeconds;
/** Pages/s per clerk: reads back its first price in `clerkPaybackSeconds`. */
export const CLERK_PAGES_PER_S = CLERK_BASE_COST / NOTES_PER_PAGE / ANCHORS.clerkPaybackSeconds;

export const BOX_LADDER: Ladder = {
  base: CLERK_BASE_COST,
  growth: ANCHORS.growth,
  rate0: ANCHORS.clickRate * NOTES_PER_PAGE,
  ratePer: CLERK_PAGES_PER_S * NOTES_PER_PAGE,
};

const boxAtEnd = ladderAt(BOX_LADDER, ANCHORS.phaseISeconds);
/** Pages in the box: what the greedy ladder reads by `phaseISeconds`, so the box empties on time. */
export const BOX_PAGES = Math.round(boxAtEnd.earned / NOTES_PER_PAGE);
/** Clerks the greedy policy holds when the box empties — the count Phase II inherits. */
export const PREDICTED_CLERKS = boxAtEnd.count;
/** Notes left over at the door under greedy buying: Phase II's opening buffer. */
export const PREDICTED_NOTE_BUFFER = boxAtEnd.earned - boxAtEnd.spent;

// Phase II — the board ──────────────────────────────────────────────────────

/** Tip-line notes/s: keeps Phase I's hand pace alive once reading is retired. */
export const TIPLINE_NOTES_PER_S = ANCHORS.clickRate * NOTES_PER_PAGE;
/** Notes a card costs to write up, so the deck runs out at `deckSeconds` on the inherited notes and the phone. */
export const NOTES_PER_CARD = Math.round(
  (PREDICTED_NOTE_BUFFER + TIPLINE_NOTES_PER_S * ANCHORS.deckSeconds) / DECK.length,
);

export interface BoardWalk {
  /** Seconds into Phase II each expansion was bought. */
  opened: number[];
  /** Leads banked at each expansion: the price the walk solves for. */
  spent: number[];
  /** Lifetime leads at `phaseIISeconds`. */
  lifetime: number;
  /** The board when the door opens: cell → card id. */
  pins: (string | null)[];
  /** Seconds into Phase II each card reached the inbox. */
  written: number[];
}

/**
 * The board under the reference player: clerks write cards up as notes and
 * their pace allow, every card is pinned the moment it arrives at its
 * `bestCell`, and each expansion is bought once its price is banked. With no
 * prices given, the first is bought at `boardOpensAt` for everything banked,
 * which is how the prices are solved.
 */
export function walkBoard(prices?: readonly number[], dt = 0.5): BoardWalk {
  const pins: (string | null)[] = Array(BOARD_SIDE * BOARD_SIDE).fill(null);
  const inbox: string[] = [];
  const written: number[] = [];
  const opened: number[] = [];
  const spent: number[] = [];
  let notes = PREDICTED_NOTE_BUFFER;
  let writing = 0;
  let next = 0;
  let side: number = BOARD_SIDES[0];
  let bank = 0;
  let lifetime = 0;
  for (let t = 0; t < ANCHORS.phaseIISeconds; t += dt) {
    notes += TIPLINE_NOTES_PER_S * dt;
    writing = Math.min(writing + (PREDICTED_CLERKS + 1) * ANCHORS.clerkCardsPerS * dt, 1);
    while (writing >= 1 && notes >= NOTES_PER_CARD && next < DECK.length) {
      notes -= NOTES_PER_CARD;
      writing -= 1;
      inbox.push(DECK[next++].id);
      written.push(t);
    }
    while (inbox.length) {
      const cell = bestCell(pins, side, inbox[0]);
      if (!cell) break;
      pins[cellAt(cell.x, cell.y)] = inbox.shift()!;
    }
    const earned = boardStrength(pins, side) * ANCHORS.leadsPerStrength * dt;
    bank += earned;
    lifetime += earned;
    const k = opened.length;
    if (k < BOARD_SIDES.length - 1) {
      const price = prices
        ? prices[k]
        : k === 0 && t + dt / 2 >= ANCHORS.boardOpensAt
          ? bank
          : Infinity;
      if (bank >= price) {
        bank -= price;
        spent.push(price);
        opened.push(t);
        side = BOARD_SIDES[k + 1];
      }
    }
  }
  return { opened, spent, lifetime, pins, written };
}

/**
 * Leads each expansion costs. The 4×4 is what the reference has banked at
 * `boardOpensAt`. The 5×5 is `boardLinger` times what it banks after that,
 * so the reference opens the night without it; the 6×6 steps up again by the
 * same ratio.
 */
export const BOARD_PRICES: number[] = (() => {
  const first = Math.round(walkBoard().spent[0]);
  const after = walkBoard([first, Infinity, Infinity]);
  const lifetimeAfter = after.lifetime - first;
  const second = Math.round(lifetimeAfter * ANCHORS.boardLinger);
  return [first, second, Math.round((second * second) / first)];
})();
/** Lifetime leads that open the night: the reference board's take at `phaseIISeconds`. */
export const RECONSTRUCT_LEADS = Math.round(walkBoard(BOARD_PRICES).lifetime);

// Phase III — the night ─────────────────────────────────────────────────────

/** The watches the reference board hands the night as hints. */
export function hintsOf(pins: readonly (string | null)[]): Set<string> {
  const out = new Set<string>();
  for (const id of pins) {
    if (!id) continue;
    const c = CARD_BY_ID[id];
    if (c.who !== 'ada') out.add(watchKey(c.where, c.when));
  }
  return out;
}

export interface NightWalk {
  /** Night each alibi held on, in the order they held. */
  alibis: number[];
  /** Roster at the end. */
  roster: number;
  /** Night insomnia was bought. */
  insomnia: number | null;
}

/**
 * Empty watches that break the model on a night staffed by `roster`: one more
 * than every `watchesPerStrain` watches. A night survives one fewer.
 */
export function strainCapacity(roster: number): number {
  return Math.floor(roster / ANCHORS.watchesPerStrain) + 1;
}

/** Insomnia's price: what the starting roster files in three nights. */
export const INSOMNIA_COST =
  3 * ANCHORS.rosterStart * ANCHORS.accountsPerSighting * ANCHORS.sightingsPerHour;

/**
 * The night under the reference planner: each dawn banks every sighting,
 * buys roster places while affordable, then insomnia once an alibi holds.
 * The planner never breaks the model, so nothing is lost.
 */
export function walkNight(
  hints: ReadonlySet<string>,
  rosterBase: number,
  rosterRatio: number,
  maxNights = 200,
): NightWalk {
  const seen: Record<string, number> = {};
  const empty = new Set<string>();
  const held = new Set<string>();
  const alibis: number[] = [];
  let accounts = 0;
  let bought = 0;
  let insomnia: number | null = null;
  for (let night = 1; night <= maxNights && held.size < SUSPECTS.length; night++) {
    const plan = planWatches({
      roster: ANCHORS.rosterStart + bought,
      seen,
      empty,
      hints,
      need: ANCHORS.sightingsPerHour,
      strainCap: strainCapacity(ANCHORS.rosterStart + bought),
      search: true,
    });
    for (const k of plan) {
      if (SUSPECT_AT[k]) {
        seen[k] = (seen[k] ?? 0) + 1;
        accounts += ANCHORS.accountsPerSighting;
      } else empty.add(k);
    }
    for (const s of SUSPECTS) {
      if (held.has(s.id)) continue;
      const hours = SUSPECT_CARDS.filter((c) => c.who === s.id);
      if (hours.every((c) => (seen[watchKey(c.where, c.when)] ?? 0) >= ANCHORS.sightingsPerHour)) {
        held.add(s.id);
        alibis.push(night);
      }
    }
    while (accounts >= rosterBase * rosterRatio ** bought) {
      accounts -= rosterBase * rosterRatio ** bought;
      bought++;
    }
    if (insomnia === null && held.size > 0 && accounts >= INSOMNIA_COST) {
      accounts -= INSOMNIA_COST;
      insomnia = night;
    }
  }
  return { alibis, roster: ANCHORS.rosterStart + bought, insomnia };
}

/** The night's hints under the reference board. */
export const REFERENCE_HINTS = hintsOf(walkBoard(BOARD_PRICES).pins);

/** First roster place: two nights of the starting roster's sightings. */
export const ROSTER_BASE_COST = 2 * ANCHORS.rosterStart * ANCHORS.accountsPerSighting;

/**
 * Smallest x on a grid of `step` from `lo` where `f(x) >= target`. A scan, not
 * a bisection: buying roster changes what the planner can search, so the
 * night an alibi holds is not monotone in the price.
 */
function scan(
  f: (x: number) => number,
  target: number,
  lo: number,
  step: number,
  hi: number,
): number {
  for (let x = lo; x <= hi; x += step) if (f(x) >= target) return Number(x.toFixed(6));
  throw new Error(`spine: no solution below ${hi}`);
}

/** Ratio between roster places: the gentlest at which the sixth alibi holds on `lastAlibiNight`. */
export const ROSTER_RATIO = scan(
  (q) => walkNight(REFERENCE_HINTS, ROSTER_BASE_COST, q).alibis.at(-1) ?? Infinity,
  ANCHORS.lastAlibiNight,
  1,
  0.01,
  20,
);

// Prediction ─────────────────────────────────────────────────────────────────

/** The beats the probe times, as the spine expects them: sim-seconds from a fresh save. */
export function predictBeats(): Record<string, number> {
  const phaseIIStart = ANCHORS.phaseISeconds;
  const phaseIIIStart = phaseIIStart + ANCHORS.phaseIISeconds;
  const board = walkBoard(BOARD_PRICES);
  const night = walkNight(REFERENCE_HINTS, ROSTER_BASE_COST, ROSTER_RATIO);
  const beats: Record<string, number> = {
    'first clerk': ladderAt(BOX_LADDER, ANCHORS.phaseISeconds).times[0],
    'box empty': ANCHORS.phaseISeconds,
    'board 4×4': phaseIIStart + board.opened[0],
    'reconstruct threshold': phaseIIIStart,
  };
  night.alibis.forEach((n, i) => {
    beats[`alibi ${i + 1}`] = phaseIIIStart + n * ANCHORS.nightSeconds;
  });
  return beats;
}
