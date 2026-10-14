import { CHALLENGERS, type ChallengerId } from './challengers';
import type { ScrollId, TechniqueId } from './dojo';

/**
 * The balance spine for Inkfist Dojo: every economy constant derived from named anchors in
 * plain arithmetic, and a reference walk of the whole arc that places the schedule. No engine
 * construction and no runtime-state read: this module predicts, `../balance/arc-probe.ts`
 * measures, and the diff between them is the check.
 *
 * Coverage (IDENTITY.md § Rate-function spine): the closed core is the student ladder,
 * geometric prices under a compounding multiplier stack. Bouts are the measured remainder.
 * Their length in beats depends on the scroll against the challenger's pattern, and
 * `../balance/bout-probe.ts` measures it per challenger as a distribution over seeded bouts.
 * The walk takes the reference scroll's median (`PAR`) as its input.
 */

// ═══ Anchors ═══════════════════════════════════════════════════════════════
// The hand-picked numbers. Each is a feel decision, said as one.

export const ANCHORS = {
  /** Tier-0 cadence: the student performs one beat every two seconds, slow enough to read. */
  beatSeconds0: 2,
  /** Each executor tier makes the hand a quarter faster. */
  beatShrinkPerTier: 0.75,
  /** Moves a tier-0 scroll holds; each tier adds two. Small enough that line economy binds. */
  scrollLines0: 4,
  scrollLinesPerTier: 2,
  /** A training strike before the dojo earns anything: the first student is bought with fists. */
  strikeKiFloor: 1,
  /** A training strike banks this many seconds of the dojo's income, plus one per Temper. */
  strikeSecondsBase: 1,
  /** The first student costs eight strikes. */
  firstRecruitStrikes: 8,
  /** A student repays its own base price in forty seconds of meditation. */
  studentPaybackSeconds: 40,
  /** A 30-purchase session wanting about 6 doublings: the price doubles every 5 students. */
  studentDoublingPurchases: 5,
  /** A senpai costs what the 25th student costs, and trains one student a minute. */
  senpaiAtStudent: 25,
  senpaiTrainSeconds: 60,
  senpaiDoublingPurchases: 2,
  /** Temper opens at the price of the 10th student and doubles every level. */
  temperAtStudent: 10,
  temperDoublingPurchases: 1,
  /** The economy's techniques sit on the student ladder: each costs that student's price. */
  techniqueAtStudent: { reading: 4, lineage: 20, 'thousand-hands': 45 } as Partial<
    Record<TechniqueId, number>
  >,
  /** An answering technique costs this many seconds of the dojo's income when its challenger arrives. */
  answerSeconds: 90,
  /** Executor tier 1 after this many beats, all time (about four minutes at tier 0). */
  steadyBreathBeats: 120,
  /** Insight = ⌊(run Ki / threshold)^½⌋. */
  insightExponent: 0.5,
  /** Lifetime Insight past this knee counts at its square root toward the Dan multiplier. */
  danKnee: 10,
  danSoftcapPower: 0.5,
  /** Each counted Insight adds ten percent to all Ki. */
  danPerInsight: 0.1,
  /** Each challenger beaten for the first time multiplies all Ki: the dojo's standing. */
  standingPerChallenger: 1.25,
  /** A won bout pays this many training strikes per par beat, scaled by par / beats taken. */
  bountyStrikesPerBeat: 2,
  /** The bounty's speed factor is capped here: a scroll can beat par, but not without limit. */
  bountySpeedCap: 2,
  /** Seconds between one bout's end and the next visitor's arrival. */
  rotationSeconds: 90,
  /** The reference sensei saves for an answer only when it costs less than this many seconds of income. */
  saveHorizonSeconds: 300,
  /** A challenger who wins returns after this many rotations: time to learn the answer. */
  returnAfterLoss: 3,
  /** Seconds a new challenger is announced before it steps through the gate. */
  announceSeconds: 15,
};

/**
 * When each challenger first steps through the gate, in seconds of play: a challenger every
 * 10–15 minutes once the first four have taught the opening, and the Envoy at two hours.
 */
export const SLOTS: Readonly<Record<ChallengerId, number>> = {
  post: 45,
  ren: 300,
  bao: 720,
  wen: 1260,
  gang: 2100,
  ma: 3000,
  twins: 3900,
  lu: 4920,
  redgate: 6000,
  envoy: 7200,
};

/** The first graduation pays two Insight at this slot: the threshold is a quarter of the run's Ki here. */
export const FIRST_GRADUATION_SLOT = 1800;
/** Flowing Form opens at the Ki earned, all time, by this slot. */
export const FLOWING_FORM_SLOT = 600;

// ═══ The student ladder ════════════════════════════════════════════════════

const A = ANCHORS;

/** Cost ratio per purchase that doubles the price every `d` purchases: 2^(1/d). */
export const ratioForDoubling = (d: number) => Math.pow(2, 1 / d);

/** The first student: eight bare strikes. */
export const studentBaseCost = A.strikeKiFloor * A.firstRecruitStrikes;
export const studentGrowth = ratioForDoubling(A.studentDoublingPurchases);
/** Ki per second per student: base price / payback. */
export const studentRate = studentBaseCost / A.studentPaybackSeconds;
export const studentCost = (n: number) => studentBaseCost * Math.pow(studentGrowth, n);

export const senpaiBaseCost = studentCost(A.senpaiAtStudent);
export const senpaiGrowth = ratioForDoubling(A.senpaiDoublingPurchases);
/** Students one senpai trains per second. */
export const senpaiTrainRate = 1 / A.senpaiTrainSeconds;

export const temperBaseCost = studentCost(A.temperAtStudent);
export const temperGrowth = ratioForDoubling(A.temperDoublingPurchases);

/** Seconds per beat at an executor tier. */
export const beatSeconds = (tier: number) => A.beatSeconds0 * Math.pow(A.beatShrinkPerTier, tier);
/** Moves a scroll holds at an executor tier, before Old Master's Ink. */
export const scrollLines = (tier: number) => A.scrollLines0 + A.scrollLinesPerTier * tier;

/** The Dan multiplier over lifetime Insight: 1 + 0.1 × softcap(x; knee 10, ^½). */
export function danMultiplier(insightEarned: number): number {
  const x =
    insightEarned <= A.danKnee
      ? insightEarned
      : A.danKnee + Math.pow(insightEarned - A.danKnee, A.danSoftcapPower);
  return 1 + A.danPerInsight * x;
}

/** The old master's scrolls: Insight price c·g^level, the effect per level and the level cap. */
export const META: Readonly<
  Record<ScrollId, { base: number; growth: number; effect: number; limit: number }>
> = {
  'ancestral-breath': { base: 1, growth: 2, effect: 1.5, limit: Infinity },
  'old-masters-ink': { base: 2, growth: 3, effect: 2, limit: 3 },
  'remembered-forms': { base: 3, growth: 1, effect: 1, limit: 1 },
  'founding-students': { base: 1, growth: 3, effect: 5, limit: 5 },
};

// ═══ Bouts ═════════════════════════════════════════════════════════════════
// The rules' numbers. A challenger's health is counted in blows of the student's fist, so a
// bout's length in beats depends on the scroll and the pattern, not on Temper — except
// Ox-Hide Ren's hide, which takes a fixed bite of every blow.

export const RULES = {
  chiMax: 100,
  /** Chi the student's breath returns every beat of a bout. */
  chiRegen: 3,
  /** Chi each move costs; breathe gives it back. */
  chiCost: { strike: 4, kick: 4, palm: 4, sweep: 8, breathe: -35, parry: 0 } as Readonly<
    Record<string, number>
  >,
  /** A bout's incense: past this many beats the challenger leaves unbeaten. */
  clock: 80,
  /** Fist points Ren's hide turns aside from every blow. */
  hideArmor: 2,
  /** Old Bao: the first blow of a line lands at this share. */
  wallGlance: 0.15,
  /** Sister Wen: chi sapped each of her beats; blows she mends while not struck. */
  craneSap: 4,
  craneMend: 0.5,
  hammer: {
    idle: [2, 4] as const,
    winds: 3,
    downBeats: 3,
    downChi: 20,
    parryBeats: 2,
    stagger: 2,
    openMult: 2,
  },
  shell: { shell: [3, 5] as const, open: 3, jabChi: 8, openMult: 2, jarBeats: 2, jarChi: 6 },
  twinsHold: [2, 4] as const,
  /** Master Lu: how many past blows he remembers, and the chi his answer costs. */
  mirrorMemory: 2,
  mirrorAnswerChi: 10,
  redgate: { count: 3, every: 4, hitChi: 5, sweepMult: 0.7 },
  /** A sweep against a single challenger lands at this share. */
  sweepSingle: 0.5,
  gauntlet: { count: 4, blowsShare: 0.5, clock: 140 },
};

/**
 * Median beats per bout under the reference template for each challenger (for the Envoy,
 * the dispatcher). Measured: `balance/bout-probe.ts 300`, at `REFERENCE_TEMPER`.
 */
export const PAR: Readonly<Record<ChallengerId, number>> = {
  post: 8,
  ren: 17,
  bao: 16,
  wen: 39,
  gang: 29,
  ma: 40,
  twins: 47,
  lu: 30,
  redgate: 30,
  envoy: 74,
};

/** A bout's incense, in beats: the Gauntlet's burns longer. */
export function clockFor(id: ChallengerId): number {
  return CHALLENGERS.find((c) => c.id === id)!.pattern === 'gauntlet'
    ? RULES.gauntlet.clock
    : RULES.clock;
}

/** A won bout's bounty, in training strikes: rate × par × min(cap, par / beats). */
export function bountyStrikes(id: ChallengerId, beats: number): number {
  const speed = Math.min(A.bountySpeedCap, PAR[id] / Math.max(1, beats));
  return A.bountyStrikesPerBeat * PAR[id] * speed;
}

// ═══ The reference walk ════════════════════════════════════════════════════
// One pass over the arc under the reference sensei: buy a technique the moment it is
// affordable (saving for an unbeaten challenger's answer when it is within reach), promote,
// recruit and temper whenever the purse allows, beat each challenger at par once its answer
// is learned, and graduate once a run pays at least half the Insight ever earned (never
// less than two) and no challenger at the gate is still unbeaten.
// The gates are recorded at their slots in the same pass, so the engine meets the
// schedule when it plays like the walk.

export interface WalkEvent {
  at: number;
  text: string;
}

export interface Walk {
  /** Lifetime Ki at each challenger's slot: its arrival gate. */
  arrivalGates: Record<ChallengerId, number>;
  /** Each answering technique's Ki price: its seconds of income at arrival. */
  answerPrices: Partial<Record<TechniqueId, number>>;
  graduationThreshold: number;
  flowingFormKi: number;
  /** Seconds of play at each first win. */
  firstWins: Partial<Record<ChallengerId, number>>;
  /** Seconds of play at each graduation, with the Insight it paid. */
  graduations: { at: number; insight: number }[];
  /** Ki banked by source over the walk: training strikes, bout bounties, students' meditation. */
  shares: { training: number; bouts: number; students: number };
  events: WalkEvent[];
}

const ORDER = CHALLENGERS.map((c) => c.id);
const ANSWER: Partial<Record<ChallengerId, TechniqueId>> = Object.fromEntries(
  CHALLENGERS.filter((c) => c.answer).map((c) => [c.id, c.answer as TechniqueId]),
);

/** The economy techniques' prices: the student each is anchored to. */
export function economyTechniqueCost(id: TechniqueId): number | undefined {
  const at = A.techniqueAtStudent[id];
  return at === undefined ? undefined : Math.round(studentCost(at));
}

/**
 * Walk the arc.
 *
 * @param seconds - how far to walk
 * @returns the gates recorded at their slots and the walk's own timeline
 */
export function walkArc(seconds = 9000): Walk {
  let ki = 0,
    kiCum = 0,
    runKi = 0,
    beats = 0;
  let students = 0,
    trained = 0,
    senpai = 0,
    temper = 0;
  let insight = 0,
    insightCum = 0,
    grads = 0;
  const known = new Set<TechniqueId>();
  const meta: Record<ScrollId, number> = {
    'ancestral-breath': 0,
    'old-masters-ink': 0,
    'remembered-forms': 0,
    'founding-students': 0,
  };
  const arrived = new Set<ChallengerId>();
  const beaten = new Set<ChallengerId>();
  const out: Walk = {
    arrivalGates: {} as Record<ChallengerId, number>,
    answerPrices: {},
    graduationThreshold: Infinity,
    flowingFormKi: Infinity,
    firstWins: {},
    graduations: [],
    shares: { training: 0, bouts: 0, students: 0 },
    events: [],
  };
  let bout: { id: ChallengerId; until: number; won: boolean } | null = null;
  let nextVisit = Infinity;
  let rotation = 0;
  const say = (at: number, text: string) => out.events.push({ at, text });

  const tier = () =>
    Math.min(
      4,
      (beats >= A.steadyBreathBeats ? 1 : 0) +
        (kiCum >= out.flowingFormKi ? 1 : 0) +
        (grads >= 1 ? 1 : 0) +
        (grads >= 3 ? 1 : 0),
    );
  const mult = () =>
    danMultiplier(insightCum) *
    Math.pow(META['ancestral-breath'].effect, meta['ancestral-breath']) *
    Math.pow(A.standingPerChallenger, beaten.size);
  const rate = () => (students + trained) * studentRate * mult();
  const strikeValue = () => A.strikeKiFloor + (A.strikeSecondsBase + temper) * rate();
  const earn = (x: number, src: keyof Walk['shares']) => {
    ki += x;
    kiCum += x;
    runKi += x;
    out.shares[src] += x;
  };

  function buy(t: number) {
    let saving = false;
    for (const id of ORDER) {
      const tech = ANSWER[id];
      if (!tech || !arrived.has(id) || known.has(tech)) continue;
      const price = out.answerPrices[tech]!;
      if (ki >= price) {
        ki -= price;
        known.add(tech);
      } else if (
        !beaten.has(id) &&
        price <= A.saveHorizonSeconds * (rate() + strikeValue() / beatSeconds(tier()))
      )
        saving = true;
    }
    if (saving) return;
    for (const tech of ['reading', 'lineage', 'thousand-hands'] as TechniqueId[]) {
      const price = economyTechniqueCost(tech)!;
      const ready =
        tech === 'reading' ||
        (tech === 'lineage'
          ? known.has('reading') && known.has('iron-body')
          : known.has('lineage'));
      if (!known.has(tech) && ready && ki >= price) {
        ki -= price;
        known.add(tech);
        if (grads === 0) say(t, `learned ${tech}`);
      }
    }
    const many = known.has('thousand-hands') ? Infinity : 1;
    for (
      let i = 0;
      i < many && known.has('lineage') && ki >= senpaiBaseCost * Math.pow(senpaiGrowth, senpai);
      i++
    ) {
      ki -= senpaiBaseCost * Math.pow(senpaiGrowth, senpai);
      senpai++;
    }
    for (let i = 0; i < many && ki >= studentCost(students); i++) {
      ki -= studentCost(students);
      students++;
    }
    if (known.has('iron-body') && ki >= temperBaseCost * Math.pow(temperGrowth, temper)) {
      ki -= temperBaseCost * Math.pow(temperGrowth, temper);
      temper++;
    }
  }

  function graduate(t: number) {
    const gain = Math.floor(Math.pow(runKi / out.graduationThreshold, A.insightExponent));
    insight += gain;
    insightCum += gain;
    grads++;
    out.graduations.push({ at: t, insight: gain });
    ki = 0;
    runKi = 0;
    students = META['founding-students'].effect * meta['founding-students'];
    trained = 0;
    senpai = 0;
    temper = 0;
    if (!meta['remembered-forms']) known.clear();
    for (const id of Object.keys(META) as ScrollId[]) {
      const m = META[id];
      while (meta[id] < m.limit && insight >= m.base * Math.pow(m.growth, meta[id])) {
        insight -= m.base * Math.pow(m.growth, meta[id]);
        meta[id]++;
      }
    }
  }

  for (let t = 0; t < seconds; t++) {
    const b = beatSeconds(tier());
    if (t === FLOWING_FORM_SLOT) out.flowingFormKi = kiCum;
    for (const id of ORDER) {
      if (arrived.has(id) || t < SLOTS[id]) continue;
      arrived.add(id);
      out.arrivalGates[id] = kiCum;
      const tech = ANSWER[id];
      if (tech)
        out.answerPrices[tech] = Math.max(
          1,
          Math.round((rate() + strikeValue() / b) * A.answerSeconds),
        );
      say(t, `${id} arrives`);
      if (!bout) nextVisit = Math.min(nextVisit, t + A.announceSeconds);
    }
    if (!bout && t >= nextVisit) {
      const unbeaten = ORDER.find((id) => arrived.has(id) && !beaten.has(id));
      const pool = [...beaten];
      const id = unbeaten ?? pool[rotation++ % Math.max(1, pool.length)];
      if (id) {
        const won = !ANSWER[id] || known.has(ANSWER[id]!);
        bout = { id, until: t + (won ? PAR[id] : clockFor(id)) * b, won };
      }
    }
    beats += 1 / b;
    if (bout) {
      if (t >= bout.until) {
        if (bout.won) {
          earn(bountyStrikes(bout.id, PAR[bout.id]) * strikeValue(), 'bouts');
          if (!beaten.has(bout.id)) {
            beaten.add(bout.id);
            out.firstWins[bout.id] = t;
            say(t, `first win over ${bout.id}`);
          }
        }
        nextVisit = t + A.rotationSeconds * (bout.won ? 1 : A.returnAfterLoss);
        bout = null;
      }
    } else earn(strikeValue() / b, 'training');
    earn(rate(), 'students');
    trained += senpai * senpaiTrainRate;
    buy(t);
    if (t === FIRST_GRADUATION_SLOT && grads === 0) out.graduationThreshold = runKi / 4;
    const pending =
      runKi >= out.graduationThreshold
        ? Math.floor(Math.pow(runKi / out.graduationThreshold, A.insightExponent))
        : 0;
    const lesson = ORDER.some((id) => arrived.has(id) && !beaten.has(id));
    if (!bout && !lesson && pending >= Math.max(2, Math.floor(0.5 * insightCum))) graduate(t);
  }
  return out;
}

// ═══ Gates ═════════════════════════════════════════════════════════════════

export const WALK = walkArc();
export const ARRIVAL_GATES = WALK.arrivalGates;
export const GRADUATION_THRESHOLD = WALK.graduationThreshold;
export const FLOWING_FORM_KI = WALK.flowingFormKi;

/** A technique's Ki price: its student anchor, or its seconds of income at its challenger's arrival. */
export function techniqueCost(id: TechniqueId): number {
  const price = economyTechniqueCost(id) ?? WALK.answerPrices[id];
  if (price === undefined) throw new Error(`spine: no price for technique "${id}"`);
  return price;
}

/** Insight a run pays: ⌊(run Ki / threshold)^½⌋. */
export function insightFor(runKi: number): number {
  if (runKi < GRADUATION_THRESHOLD) return 0;
  return Math.floor(Math.pow(runKi / GRADUATION_THRESHOLD, A.insightExponent));
}
