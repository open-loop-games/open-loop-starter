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
 * When each landmark should first fall. `position` places the route through it
 * between the predicted capacity of the night before (0) and of its own night
 * (1), so it cannot fall a night early or late within that margin. Night one has
 * no night before: depth 1 takes 0.4 of it, the tutorial beat. Depth 4 is the
 * wall, the edge of the prison. Depth 6 is the freight train — the escape.
 */
export const LANDMARK_SCHEDULE = [
  { depth: 1, night: 1, position: 0.4 },
  { depth: 2, night: 3, position: 0.5 },
  { depth: 3, night: 5, position: 0.5 },
  { depth: 4, night: 8, position: 0.5 },
  { depth: 5, night: 13, position: 0.5 },
  { depth: 6, night: 17, position: 0.5 },
] as const;

/** The landmark that ends the night: on the freight. */
export const ESCAPE_DEPTH = 6;

/** The milk truck's best refill: a whole first night of Nerve, for a ride caught at lights-out. */
export const RIDE_NERVE = NIGHT_SECONDS;
/** Night-clock second the truck leaves the road. A ride is worth less the later it is caught. */
export const RIDE_DEADLINE = 150;
/** Share of Slip the Patrol's duration one kept level of patrol knowledge removes. */
export const PATROL_STEP = 0.02;
/** Levels of patrol knowledge that count: at the cap, the gate takes half its base. */
export const PATROL_CAP = 25;

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

/**
 * The milk truck's refill for a ride caught at night-clock second `t`:
 * `RIDE_NERVE · max(0, 1 − t / RIDE_DEADLINE)`. It couples the zone past the wall
 * to the prison splits: every second saved inside is Nerve gained outside.
 */
export function rideNerve(t: number): number {
  return RIDE_NERVE * Math.max(0, 1 - t / RIDE_DEADLINE);
}

/** Slip the Patrol's duration as a share of its base, at a kept patrol-knowledge level. */
export function patrolFactor(level: number): number {
  return 1 - PATROL_STEP * Math.min(level, PATROL_CAP);
}

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

// ── The route ───────────────────────────────────────────────────────────────

/** Training rep durations and the non-gate route steps, in base-seconds. */
export const ACTION_SECONDS = {
  'push-ups': REP_SECONDS,
  'shadow-walk': REP_SECONDS,
  'bend-wire': REP_SECONDS * 1.5,
  rehearse: REP_SECONDS,
  'learn-patrol': REP_SECONDS * 2.5,
  coffee: REP_SECONDS * 2,
  smokes: REP_SECONDS * 2.5,
  hamper: REP_SECONDS * 3,
  bribe: REP_SECONDS * 4,
  ride: REP_SECONDS * 2,
  padlock: REP_SECONDS * 3,
} as const;

export type GateId =
  | 'pick-cell'
  | 'slip-patrol'
  | 'badge-door'
  | 'cut-fence'
  | 'wall-climb'
  | 'cross-woods'
  | 'board-freight';

/** What a reference plan is written from: the ground known and the patrol already learned. */
export interface PlanContext {
  /** deepest landmark reached before the night begins */
  known: number;
  /** kept patrol-knowledge level at the night's start */
  patrolLevel: number;
}

export interface RouteStep {
  id: keyof typeof ACTION_SECONDS | GateId;
  /** zone the step happens in; it is on the plan once that zone is known */
  zone: number;
  times(k: PlanContext): number;
  /** landmark depth the step reaches */
  opens?: number;
  refill?: 'coffee' | 'hamper' | 'ride';
}

/**
 * The reference policy's route, in order. It makes only what the known ground
 * spends: a second pick once the rail yard's padlock is known, a third pack of
 * smokes once the truck is. It learns the patrol once a night until the cap.
 */
export const REFERENCE_ROUTE: RouteStep[] = [
  { id: 'bend-wire', zone: 0, times: (k) => (k.known >= 5 ? 2 : 1) },
  { id: 'pick-cell', zone: 0, times: () => 1, opens: 1 },
  { id: 'learn-patrol', zone: 1, times: (k) => (k.patrolLevel < PATROL_CAP ? 1 : 0) },
  { id: 'coffee', zone: 1, times: () => COFFEE_PER_NIGHT, refill: 'coffee' },
  { id: 'smokes', zone: 1, times: (k) => (k.known >= 4 ? 3 : 2) },
  { id: 'slip-patrol', zone: 1, times: () => 1, opens: 2 },
  { id: 'hamper', zone: 2, times: () => 1, refill: 'hamper' },
  { id: 'bribe', zone: 2, times: () => 1 },
  { id: 'badge-door', zone: 2, times: () => 1, opens: 3 },
  { id: 'cut-fence', zone: 3, times: () => 1 },
  { id: 'wall-climb', zone: 3, times: () => 1, opens: 4 },
  { id: 'ride', zone: 4, times: () => 1, refill: 'ride' },
  { id: 'cross-woods', zone: 4, times: () => 1, opens: 5 },
  { id: 'padlock', zone: 5, times: () => 1 },
  { id: 'board-freight', zone: 5, times: () => 1, opens: 6 },
];

/** The reference plan's rows for a night: the known route, in order. */
export function referencePlan(k: PlanContext): { id: string; times: number }[] {
  return REFERENCE_ROUTE.filter((s) => s.zone <= k.known)
    .map((s) => ({ id: s.id, times: s.times(k) }))
    .filter((r) => r.times > 0);
}

interface PlannedStep {
  id: string;
  /** base-seconds of work, after the patrol discount */
  work: number;
  /** the discount applied: 1 for every step but Slip the Patrol */
  factor: number;
  opens?: number;
  refill?: RouteStep['refill'];
  learnsPatrol: boolean;
}

/**
 * A night's route as work, one entry per execution. A gate with no derived
 * duration yet counts as zero work. Learning the patrol before slipping it
 * shortens the same night's slip.
 */
function planSteps(k: PlanContext, gates: Partial<Record<GateId, number>>): PlannedStep[] {
  const out: PlannedStep[] = [];
  let level = k.patrolLevel;
  for (const s of REFERENCE_ROUTE) {
    if (s.zone > k.known) continue;
    for (let i = 0; i < s.times(k); i++) {
      const factor = s.id === 'slip-patrol' ? patrolFactor(level) : 1;
      const base =
        s.id in ACTION_SECONDS
          ? ACTION_SECONDS[s.id as keyof typeof ACTION_SECONDS]
          : (gates[s.id as GateId] ?? 0);
      out.push({
        id: s.id,
        work: base * factor,
        factor,
        opens: s.opens,
        refill: s.refill,
        learnsPatrol: s.id === 'learn-patrol',
      });
      if (s.id === 'learn-patrol') level++;
    }
  }
  return out;
}

/** Base-seconds of the reference route through landmark `depth`, for a night planned from `k`. */
export function routeWork(
  k: PlanContext,
  depth: number,
  gates: Partial<Record<GateId, number>> = GATE_SECONDS,
): number {
  const steps = planSteps(k, gates);
  const through = steps.findIndex((s) => s.opens === depth);
  return steps.slice(0, through + 1).reduce((a, s) => a + s.work, 0);
}

// ── The arc ─────────────────────────────────────────────────────────────────

export interface NightPrediction {
  night: number;
  /** deepest landmark the schedule says falls by this night */
  depth: number;
  /** Nerve seconds the night had, the ride's refill included */
  budget: number;
  /** base-seconds of action progress the night delivers (its capacity) */
  work: number;
  /** talent level each of four evenly trained skills ends at */
  endLevel: number;
  /** permanent speed bonus per skill after the night */
  mastery: number;
  /** intel credited at the night's end */
  intel: number;
  /** night-second each landmark fell, keyed by depth; empty while gates are unknown */
  splits: Record<number, number>;
  /** Nerve the milk truck added, 0 when it was not caught */
  ride: number;
  /** patrol-knowledge level after the night */
  patrolLevel: number;
  nerveLevel: number;
  grapevineLevel: number;
}

export interface PredictOptions {
  /** derived gate durations; a missing gate counts as zero work */
  gates?: Partial<Record<GateId, number>>;
  /** end a night on the freight, as the game does */
  endAtEscape?: boolean;
  dt?: number;
}

/**
 * Predict the first `nights` nights under the reference policy: the reference
 * plan runs first, every second after it is training, work spreads evenly over
 * the four skills, and the notes are bought cheapest-first after each night. The
 * arc probe plays the real game with the same plan and buying rule; the work
 * spread is where the two are expected to disagree, because the route leans on a
 * few skills.
 *
 * A night's plan is written from the ground known before it begins, so new ground
 * a night reveals adds nothing to that night's plan.
 */
export function predictNights(nights: number, opts: PredictOptions = {}): NightPrediction[] {
  const { gates = {}, endAtEscape = false, dt = 0.05 } = opts;
  const out: NightPrediction[] = [];
  let mastery = 0;
  let intel = 0;
  let patrolLevel = 0;
  const ids = Object.keys(NOTE_PRICES) as NoteId[];
  const owned = Object.fromEntries(ids.map((k) => [k, 0])) as Record<NoteId, number>;
  for (let night = 1; night <= nights; night++) {
    const depth = LANDMARK_SCHEDULE.filter((l) => l.night <= night).length;
    const known = LANDMARK_SCHEDULE.filter((l) => l.night < night).length;
    const steps = planSteps({ known, patrolLevel }, gates);
    let budget = NIGHT_SECONDS + NERVE_PER_LEVEL * owned['steel-nerves'];
    for (const s of steps) {
      if (s.refill === 'coffee') budget += COFFEE_NERVE;
      if (s.refill === 'hamper') budget += HAMPER_NERVE;
    }
    const global = 1 + GRAPEVINE_PER_LEVEL * owned.grapevine;
    let work = 0;
    let next = 0;
    let stepEnd = steps[0]?.work ?? Infinity;
    let ride = 0;
    let learned = 0;
    const splits: Record<number, number> = {};
    for (let t = 0; t < budget; t += dt) {
      const level = Math.sqrt(work / 4 / XP_PER_LEVEL_SQ);
      work += (1 + TALENT_PER_LEVEL * level) * (1 + mastery) * global * dt;
      let escaped = false;
      while (next < steps.length && work >= stepEnd) {
        const s = steps[next];
        if (s.refill === 'ride') {
          ride = rideNerve(t + dt);
          budget += ride;
        }
        if (s.learnsPatrol) learned++;
        if (s.opens !== undefined) splits[s.opens] = t + dt;
        if (s.opens === ESCAPE_DEPTH && endAtEscape) escaped = true;
        next++;
        stepEnd += steps[next]?.work ?? Infinity;
      }
      if (escaped) break;
    }
    patrolLevel += learned;
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
      splits,
      ride,
      patrolLevel,
      nerveLevel: owned['steel-nerves'],
      grapevineLevel: owned.grapevine,
    });
  }
  return out;
}

// ── Gate durations ──────────────────────────────────────────────────────────

/** Gates that share one stage, and the share of the stage's work each takes. */
const STAGE_GATES: Record<number, [GateId, number][]> = {
  1: [['pick-cell', 1]],
  2: [['slip-patrol', 1]],
  3: [['badge-door', 1]],
  4: [
    ['cut-fence', 0.4],
    ['wall-climb', 0.6],
  ],
  5: [['cross-woods', 1]],
  6: [['board-freight', 1]],
};

/**
 * Size the gates of landmark `d` so the route through it sits at its `position`
 * between the predicted capacity of the night before and of its own night. The
 * route's other steps, refills included, count against it; the patrol discount
 * is divided out.
 */
function sizeStage(
  d: number,
  arc: NightPrediction[],
  gates: Partial<Record<GateId, number>>,
): void {
  const l = LANDMARK_SCHEDULE.find((x) => x.depth === d)!;
  const patrolLevel = l.night > 1 ? arc[l.night - 2].patrolLevel : 0;
  const steps = planSteps({ known: d - 1, patrolLevel }, gates);
  const through = steps.findIndex((s) => s.opens === d);
  const others = steps.slice(0, through + 1).reduce((a, s) => a + s.work, 0);
  const before = l.night > 1 ? arc[l.night - 2].work : 0;
  const target = before + l.position * (arc[l.night - 1].work - before);
  const remainder = target - others;
  for (const [id, share] of STAGE_GATES[d]) {
    const factor = steps.find((s) => s.id === id)?.factor ?? 1;
    gates[id] = Math.round((remainder * share) / factor);
  }
}

/**
 * Derive every gate from the arc. The prison's gates come from nights before the
 * wall, which no ride reaches. The zone past the wall depends on when the wall
 * falls, so its gates come from a second prediction with the prison sized.
 */
export function deriveGates(): Record<GateId, number> {
  const gates: Partial<Record<GateId, number>> = {};
  const wall = LANDMARK_SCHEDULE.find((l) => l.depth === 4)!.night;
  const prison = predictNights(wall);
  for (const d of [1, 2, 3, 4]) sizeStage(d, prison, gates);
  const last = Math.max(...LANDMARK_SCHEDULE.map((l) => l.night));
  const outside = predictNights(last, { gates });
  for (const d of [5, 6]) sizeStage(d, outside, gates);
  return gates as Record<GateId, number>;
}

export const GATE_SECONDS = deriveGates();

/** The arc as the game plays it: derived gates, nights ending on the freight. */
export function predictArc(nights: number): NightPrediction[] {
  return predictNights(nights, { gates: GATE_SECONDS, endAtEscape: true });
}
