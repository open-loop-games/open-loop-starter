// ─── Skeleton ───
// The spine's home in `data/`. Every economy number in Night Clerk is derived
// here from a handful of named anchors, in plain arithmetic with no engine.
// Modules read these values at their `tunable()` reader sites and never
// re-author them; `balance/phase-shifter-projection.ts` prints them, and
// `balance/arc-probe.ts` measures the shipping game against them.
//
// Shape: three phases, each a geometric purchase ladder funded by a rate that
// grows linearly with what the ladder buys. The phases do not compound into
// each other — each one-way door retires the ladder below it — so each phase
// is solved on its own. What couples them is what a door hands forward: the
// leftover notes, the clerk count, the lifetime lead record.

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

  /** Notes cross-referenced into one lead. */
  notesPerLead: 10,
  /** A reassigned clerk cross-references this many times its reading pace. */
  clerkXrefFactor: 2,
  /** Seconds of tip-line trickle the first canvasser is priced at. */
  firstCanvasserSeconds: 20,
  /** Seconds a first canvasser takes to pay back its price in leads. */
  canvasserPaybackSeconds: 20,
  /** Designed length of Phase II, the board. */
  phaseIISeconds: 420,

  /** Sim-seconds per replayed night, 18:00 → 06:00. */
  nightSeconds: 40,
  /** Night on which the first suspect falls under the shared dawn order. */
  firstEliminationNight: 4,
  /** Night on which the sixth, last eliminable suspect falls. */
  lastEliminationNight: 16,
  /** Share of banked contradictions the filing policy may spend on witnesses. */
  witnessShare: 0.5,
  /** Nights replayed before the clerks file accounts themselves. */
  filingTierNights: 3,
  /** Game-speed factor once the clerk stops sleeping. */
  insomniaSpeed: 2,

  /** Suspects on the board; all but the last can be cleared. */
  suspects: 7,
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
/** First canvasser price in leads: `firstCanvasserSeconds` of tip line, cross-referenced. */
export const CANVASSER_BASE_COST =
  (TIPLINE_NOTES_PER_S / ANCHORS.notesPerLead) * ANCHORS.firstCanvasserSeconds;
/** Notes/s per canvasser: pays back its first price in `canvasserPaybackSeconds`. */
export const CANVASSER_NOTES_PER_S =
  (CANVASSER_BASE_COST * ANCHORS.notesPerLead) / ANCHORS.canvasserPaybackSeconds;
/** Notes/s per reassigned clerk. */
export const CLERK_XREF_NOTES_PER_S = CLERK_PAGES_PER_S * NOTES_PER_PAGE * ANCHORS.clerkXrefFactor;
/** Second shift: one-shot ×2 clerk throughput, priced at the canvasser rung where clerk capacity binds. */
export const SECOND_SHIFT_COST = Math.round(
  CANVASSER_BASE_COST *
    ANCHORS.growth **
      Math.max(
        0,
        Math.floor(
          (PREDICTED_CLERKS * CLERK_XREF_NOTES_PER_S - TIPLINE_NOTES_PER_S) / CANVASSER_NOTES_PER_S,
        ),
      ),
);

/** Leads/s as a function of canvassers, while clerk capacity does not bind. */
export const BOARD_LADDER: Ladder = {
  bank0: PREDICTED_NOTE_BUFFER / ANCHORS.notesPerLead,
  base: CANVASSER_BASE_COST,
  growth: ANCHORS.growth,
  rate0: TIPLINE_NOTES_PER_S / ANCHORS.notesPerLead,
  ratePer: CANVASSER_NOTES_PER_S / ANCHORS.notesPerLead,
};

const boardAtEnd = ladderAt(BOARD_LADDER, ANCHORS.phaseIISeconds);
/**
 * Lifetime leads that open the night: the greedy board's lifetime take at
 * `phaseIISeconds`. The opening buffer is spent at t = 0, not banked at the
 * end: Phase I's leftover notes cross-reference within seconds and buy
 * canvassers that compound for the whole phase.
 */
export const RECONSTRUCT_LEADS = Math.round(boardAtEnd.earned);

// Phase III — the night ─────────────────────────────────────────────────────

/** Contradictions/s of a bare model (fidelity 1, no witnesses). Unit anchor. */
export const NIGHT_BASE_RATE = 1;
/** Model fidelity from the board's lifetime record: √(leads / RECONSTRUCT_LEADS), 1 at the door. */
export function fidelity(lifetimeLeads: number): number {
  return Math.sqrt(Math.max(lifetimeLeads, 0) / RECONSTRUCT_LEADS);
}
/** First witness account: exactly one bare night's yield, so night one buys the first. */
export const WITNESS_BASE_COST = NIGHT_BASE_RATE * ANCHORS.nightSeconds;

/** Contradictions one night banks with `witnesses` filed and model fidelity `f`. */
export function nightYield(witnesses: number, f: number): number {
  return NIGHT_BASE_RATE * f * (1 + witnesses) * ANCHORS.nightSeconds;
}

/** Insomnia's price: three bare nights' yield. */
export const INSOMNIA_COST = 3 * WITNESS_BASE_COST;

/**
 * The filing policy: file a witness account while it costs at most `share` of
 * the bank. The player follows it by hand until the clerks' automation tier
 * opens; then the clerks run this same function at dawn.
 */
export function shouldFileWitness(
  witnessCost: number,
  bank: number,
  share: number = ANCHORS.witnessShare,
): boolean {
  return witnessCost <= bank * share;
}

/**
 * Night on which each elimination lands, under the dawn order the prediction
 * assumes: file witnesses by the policy, then clear suspects while affordable,
 * then buy insomnia once one has fallen.
 */
export function eliminationNights(base: number, ratio: number, f = 1, maxNights = 400): number[] {
  const out: number[] = [];
  const eliminable = ANCHORS.suspects - 1;
  let bank = 0;
  let w = 0;
  let insomnia = false;
  for (let night = 1; night <= maxNights && out.length < eliminable; night++) {
    bank += nightYield(w, f);
    while (shouldFileWitness(WITNESS_BASE_COST * ANCHORS.growth ** w, bank)) {
      bank -= WITNESS_BASE_COST * ANCHORS.growth ** w;
      w++;
    }
    while (out.length < eliminable && bank >= base * ratio ** out.length) {
      bank -= base * ratio ** out.length;
      out.push(night);
    }
    if (!insomnia && out.length > 0 && bank >= INSOMNIA_COST) {
      bank -= INSOMNIA_COST;
      insomnia = true;
    }
  }
  return out;
}

/**
 * Smallest x on a grid of `step` from `lo` where `f(x) >= target`. A scan, not
 * a bisection: witness filing spends the bank between nights, so neither solve
 * below is monotone in its parameter.
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

/** First elimination price: the cheapest at which the first suspect falls on `firstEliminationNight`. */
export const ELIMINATION_BASE_COST = scan(
  (b) => eliminationNights(b, 1)[0] ?? Infinity,
  ANCHORS.firstEliminationNight,
  1,
  1,
  1e6,
);
/** Ratio between eliminations: the gentlest at which the sixth falls on `lastEliminationNight`. */
export const ELIMINATION_RATIO = scan(
  (q) => eliminationNights(ELIMINATION_BASE_COST, q).at(-1) ?? Infinity,
  ANCHORS.lastEliminationNight,
  1,
  0.005,
  20,
);

// Prediction ─────────────────────────────────────────────────────────────────

/** The beats the probe times, as the spine expects them: sim-seconds from a fresh save. */
export function predictBeats(): Record<string, number> {
  const phaseIIStart = ANCHORS.phaseISeconds;
  const phaseIIIStart = phaseIIStart + ANCHORS.phaseIISeconds;
  const nights = eliminationNights(ELIMINATION_BASE_COST, ELIMINATION_RATIO);
  const beats: Record<string, number> = {
    'first clerk': ladderAt(BOX_LADDER, ANCHORS.phaseISeconds).times[0],
    'box empty': ANCHORS.phaseISeconds,
    'first canvasser': phaseIIStart + ladderAt(BOARD_LADDER, ANCHORS.phaseIISeconds).times[0],
    'reconstruct threshold': phaseIIIStart,
  };
  nights.forEach((n, i) => {
    beats[`elimination ${i + 1}`] = phaseIIIStart + n * ANCHORS.nightSeconds;
  });
  return beats;
}
