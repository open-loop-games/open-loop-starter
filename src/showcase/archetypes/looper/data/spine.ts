// ─── Skeleton ───
// The spine's home in `data/`. Every economy number in Lights Out is derived here
// from a few named anchors, in plain arithmetic with no engine. Modules read these
// values at their `tunable()` reader sites and never re-author them.
//
// The route's gate durations are not authored at all: `deriveGates()` sizes each
// one from the predicted work capacity of the night its landmark is scheduled to
// fall on. So the planning problem has a solution on schedule by construction.

/** First night's Nerve, in seconds at 1×: one night is a one-minute beat (flow band 30s–2m). */
export const NIGHT_SECONDS = 60;
/** A rep of any training action is a fifteenth of a first night, so night one holds ~15 reps. */
export const REP_SECONDS = NIGHT_SECONDS / 15;
/** A skill trained for one whole first night at base speed ends it at this level. */
export const LEVEL_FROM_ONE_NIGHT = 10;
/** In-night speed multiplier a skill carries at that level (talent: 1 + α·L). */
export const TALENT_AT_ONE_NIGHT_LEVEL = 2;
/** Permanent speed a night ending at the mastery knee leaves behind. */
export const MASTERY_AT_KNEE = 0.1;
/** Talent level past which mastery retention bends to a square root. */
export const MASTERY_KNEE = LEVEL_FROM_ONE_NIGHT;

/**
 * When each landmark should first fall, and what fraction of that night's
 * predicted work capacity the route up to it consumes. Depth 1 falls early on
 * night one (the tutorial beat); the rest land with a margin of training left
 * over. Depth 4 is the wall — the escape.
 */
export const LANDMARK_SCHEDULE = [
  { depth: 1, night: 1, fill: 0.4 },
  { depth: 2, night: 3, fill: 0.8 },
  { depth: 3, night: 5, fill: 0.8 },
  { depth: 4, night: 8, fill: 0.85 },
] as const;

/** Intel a landmark is worth the first night-take, and how much more each deeper one is. */
export const INTEL_BASE = 2;
export const INTEL_RATIO = 3;

// ─── Balance ────────────────────────────────────────────────────────────────
// Rate-function bucket and coverage boundary: `../IDENTITY.md` § Rate-function
// spine. The subsystems, by bucket:
//
// - in-night work: coupled-state deterministic. Talent level raises speed, and
//   speed raises the work that levels talent. `predictNights` integrates it.
// - mastery across nights: piecewise closed form, linear retention to a knee and
//   a square root past it.
// - the route: discrete planning. The gates are sized from predicted capacity.
//
// `balance/looper-projection.ts` prints this file's prediction;
// `balance/arc-probe.ts` measures the shipping game against it.

// ── Skills ──────────────────────────────────────────────────────────────────

/** xp per level², from `L = sqrt(xp / X)` and `LEVEL_FROM_ONE_NIGHT` at NIGHT_SECONDS of work. */
export const XP_PER_LEVEL_SQ = NIGHT_SECONDS / LEVEL_FROM_ONE_NIGHT ** 2;
/** α in talent `1 + α·L`, from TALENT_AT_ONE_NIGHT_LEVEL at LEVEL_FROM_ONE_NIGHT. */
export const TALENT_PER_LEVEL = (TALENT_AT_ONE_NIGHT_LEVEL - 1) / LEVEL_FROM_ONE_NIGHT;
/** ρ in mastery retention `ρ·soft(L)`, linear below the knee, from MASTERY_AT_KNEE. */
export const MASTERY_PER_LEVEL = MASTERY_AT_KNEE / MASTERY_KNEE;

/** Talent level from xp — the same curve the skill categories wire as a Formula. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / XP_PER_LEVEL_SQ));
}
/** Mastery retention for a night ending at level L: identity to the knee, √ past it. */
export function masteryRetention(level: number): number {
  const bent = level <= MASTERY_KNEE ? level : MASTERY_KNEE + Math.sqrt(level - MASTERY_KNEE);
  return MASTERY_PER_LEVEL * bent;
}

// ── Nerve (the run budget) ──────────────────────────────────────────────────

/** Coffee refills a quarter night of Nerve; two cups on the guard desk per night. */
export const COFFEE_NERVE = NIGHT_SECONDS / 4;
export const COFFEE_PER_NIGHT = 2;
/** The laundry hamper is a sixth of a night of held breath; one per night. */
export const HAMPER_NERVE = NIGHT_SECONDS / 6;
/** Steel Nerves raises the night by a quarter of its base per level. */
export const NERVE_PER_LEVEL = NIGHT_SECONDS / 4;

// ── Intel and the notes ─────────────────────────────────────────────────────

/** Intel a landmark pays at the night's end (credited once per night reached). */
export function intelForDepth(depth: number): number {
  return INTEL_BASE * INTEL_RATIO ** (depth - 1);
}
/** One corridor night's take — the unit every price below is quoted in. */
export const COST_UNIT = intelForDepth(1);
/** Global speed per Grapevine level: a tenth, so ten levels match one night-level of talent. */
export const GRAPEVINE_PER_LEVEL = TALENT_PER_LEVEL;
/** Game-speed ladder Déjà Vu unlocks, level by level. */
export const SPEED_STEPS = [1, 2, 3, 5] as const;

export interface NotePrice {
  /** cost of the first level */
  base: number;
  /** cost ratio per level owned */
  ratio: number;
  /** levels on sale; Infinity for an open ladder */
  limit: number;
}

export type NoteId = 'steel-nerves' | 'grapevine' | 'routine' | 'discipline' | 'deja-vu';

/**
 * Prices in COST_UNITs. Steel Nerves doubles per level against a take that
 * triples per landmark, so each new landmark buys about one more level. The two
 * automation unlocks cost a laundry night and a yard night respectively.
 */
export const NOTE_PRICES: Record<NoteId, NotePrice> = {
  'steel-nerves': { base: 2 * COST_UNIT, ratio: 2, limit: Infinity },
  grapevine: { base: 3 * COST_UNIT, ratio: 2, limit: Infinity },
  routine: { base: intelForDepth(1) + intelForDepth(2), ratio: 1, limit: 1 },
  discipline: { base: intelForDepth(1) + intelForDepth(2) + intelForDepth(3), ratio: 1, limit: 1 },
  'deja-vu': { base: 4 * COST_UNIT, ratio: INTEL_RATIO, limit: SPEED_STEPS.length - 1 },
};
export function noteCost(id: NoteId, level: number): number {
  const p = NOTE_PRICES[id];
  return p.base * p.ratio ** level;
}

// ── The arc ─────────────────────────────────────────────────────────────────

export interface NightPrediction {
  night: number;
  /** deepest landmark the schedule says falls by this night */
  depth: number;
  /** Nerve seconds available, base + Steel Nerves + refills on the route */
  budget: number;
  /** base-seconds of action progress the night delivers (its capacity) */
  work: number;
  /** talent level each of four evenly trained skills ends at */
  endLevel: number;
  /** permanent speed bonus per skill after the night */
  mastery: number;
  /** intel credited at the night's end */
  intel: number;
  /** night-seconds to go over the wall, when the night's capacity covers the route */
  escapeSeconds: number | null;
  nerveLevel: number;
  grapevineLevel: number;
}

/**
 * Predict the first `nights` nights under a reference policy: every second is
 * spent working, work spreads evenly over the four skills, every refill on
 * ground known before the night began is taken, and the notes are bought
 * cheapest-first after each night. The arc probe plays the real game with the
 * same buying rule; the work spread is where the two are expected to disagree,
 * because the route leans on a few skills.
 *
 * Refills count only on ground known before the night begins: a night's plan is
 * written before that night reveals new ground, so its refills are not on it.
 *
 * With `escapeWork` (the route's total base-seconds), a night whose capacity
 * reaches it ends there, as the game ends a night on the wall. Past the first
 * escape the quantity to read is escape time, not work, which stays pinned at
 * the route's length.
 */
export function predictNights(nights: number, escapeWork?: number, dt = 0.05): NightPrediction[] {
  const out: NightPrediction[] = [];
  let mastery = 0;
  let intel = 0;
  const ids = Object.keys(NOTE_PRICES) as NoteId[];
  const owned = Object.fromEntries(ids.map((k) => [k, 0])) as Record<NoteId, number>;
  for (let night = 1; night <= nights; night++) {
    const depth = LANDMARK_SCHEDULE.filter((l) => l.night <= night).length;
    const known = LANDMARK_SCHEDULE.filter((l) => l.night < night).length;
    const budget =
      NIGHT_SECONDS +
      NERVE_PER_LEVEL * owned['steel-nerves'] +
      (known >= 1 ? COFFEE_NERVE * COFFEE_PER_NIGHT : 0) +
      (known >= 2 ? HAMPER_NERVE : 0);
    const global = 1 + GRAPEVINE_PER_LEVEL * owned.grapevine;
    let work = 0;
    let escapeSeconds: number | null = null;
    for (let t = 0; t < budget; t += dt) {
      const level = Math.sqrt(work / 4 / XP_PER_LEVEL_SQ);
      work += (1 + TALENT_PER_LEVEL * level) * (1 + mastery) * global * dt;
      if (escapeWork !== undefined && work >= escapeWork) {
        escapeSeconds = t + dt;
        break;
      }
    }
    const endLevel = levelFromXp(work / 4);
    mastery += masteryRetention(endLevel);
    let take = 0;
    for (let d = 1; d <= depth; d++) take += intelForDepth(d);
    intel += take;
    for (;;) {
      const open = ids.filter((k) => owned[k] < NOTE_PRICES[k].limit);
      const cheapest = open.sort((a, b) => noteCost(a, owned[a]) - noteCost(b, owned[b]))[0];
      if (!cheapest || noteCost(cheapest, owned[cheapest]) > intel) break;
      intel -= noteCost(cheapest, owned[cheapest]);
      owned[cheapest]++;
    }
    out.push({
      night,
      depth,
      budget,
      work,
      endLevel,
      mastery,
      intel: take,
      escapeSeconds,
      nerveLevel: owned['steel-nerves'],
      grapevineLevel: owned.grapevine,
    });
  }
  return out;
}

// ── Route durations ─────────────────────────────────────────────────────────

/** Training rep durations and the non-gate route steps, in base-seconds. */
export const ACTION_SECONDS = {
  'push-ups': REP_SECONDS,
  'shadow-walk': REP_SECONDS,
  'bend-wire': REP_SECONDS * 1.5,
  rehearse: REP_SECONDS,
  coffee: REP_SECONDS * 2,
  smokes: REP_SECONDS * 2.5,
  hamper: REP_SECONDS * 3,
  bribe: REP_SECONDS * 4,
} as const;

/** Mandatory non-gate work inside each stage (the steps the gate needs first). */
const STAGE_PREREQS: Record<number, number> = {
  1: ACTION_SECONDS['bend-wire'],
  2: ACTION_SECONDS.smokes * 2,
  3: ACTION_SECONDS.bribe,
  4: 0,
};
/** Share of the final stage spent cutting the fence before the climb. */
const FENCE_SHARE = 0.4;

export type GateId = 'pick-cell' | 'slip-patrol' | 'badge-door' | 'cut-fence' | 'wall-climb';

/**
 * Gate durations, sized so the cumulative route through landmark d consumes
 * `fill` of the predicted capacity of the night it is scheduled to fall on.
 * Refills on the route cost work too; they are counted inside the fill.
 */
export function deriveGates(): Record<GateId, number> {
  const arc = predictNights(Math.max(...LANDMARK_SCHEDULE.map((l) => l.night)));
  const routeThrough = LANDMARK_SCHEDULE.map((l) => l.fill * arc[l.night - 1].work);
  const stage = (d: number) =>
    routeThrough[d - 1] - (d > 1 ? routeThrough[d - 2] : 0) - STAGE_PREREQS[d];
  const final = stage(4);
  return {
    'pick-cell': Math.round(stage(1)),
    'slip-patrol': Math.round(stage(2)),
    'badge-door': Math.round(stage(3)),
    'cut-fence': Math.round(final * FENCE_SHARE),
    'wall-climb': Math.round(final * (1 - FENCE_SHARE)),
  };
}

export const GATE_SECONDS = deriveGates();

/**
 * Base-seconds of the whole escape route: every gate, every step it needs, and
 * the refills the reference policy takes on the way (both coffees, the hamper).
 */
export const ESCAPE_ROUTE_WORK =
  Object.values(GATE_SECONDS).reduce((a, b) => a + b, 0) +
  Object.values(STAGE_PREREQS).reduce((a, b) => a + b, 0) +
  ACTION_SECONDS.coffee * COFFEE_PER_NIGHT +
  ACTION_SECONDS.hamper;

/** The arc with nights ending on the wall once they can reach it. */
export function predictArc(nights: number): NightPrediction[] {
  return predictNights(nights, ESCAPE_ROUTE_WORK);
}
