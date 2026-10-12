import type { RefinementDef } from './types';
import { PROBE_CLASSES } from './classes';
import { classBaseCost } from './curve';

// ─── Skeleton ───
// 24 refinements in three scopes: 16 per-class (two per class, at 10 and 50
// units owned), 4 click, 4 global. Per-class entries are GENERATED from
// `./classes.ts` — the price rule is the contract, and writing 16 of them by
// hand would only let them drift. Click and global are written longhand
// because each is individually sized.

// ─── Costume ───
// A refinement is an engineering change pushed to a probe class, or to the
// whole program. Unlike a revision it is bought, not earned.

/** Per-class refinement price, as a multiple of that class's zeroth-unit cost. */
const CLASS_REFINEMENT_COST_STEPS = [60, 900] as const;

/** Units of a class that must be owned before each of its refinements unlocks. */
const CLASS_REFINEMENT_DEPTHS = [10, 50] as const;

/** Every per-class refinement doubles its class. One knob, two rungs. */
const CLASS_REFINEMENT_MULTIPLIER = 2;

const CLASS_REFINEMENT_LABELS = [
  { suffix: 'Tolerances', blurb: 'Tighter build tolerances across the class.' },
  { suffix: 'Recompile', blurb: 'The class is rebuilt from a better plan.' },
] as const;

const classRefinements: RefinementDef[] = PROBE_CLASSES.flatMap((probeClass, classIndex) =>
  CLASS_REFINEMENT_LABELS.map((label, rung) => ({
    id: `ref-${probeClass.id}-${rung === 0 ? 'tolerances' : 'recompile'}`,
    name: `${probeClass.name} ${label.suffix}`,
    description: label.blurb,
    cost: classBaseCost(classIndex) * CLASS_REFINEMENT_COST_STEPS[rung],
    scope: { kind: 'class' as const, classId: probeClass.id },
    multiplier: CLASS_REFINEMENT_MULTIPLIER,
    requirement: (s) => s.classCountAtLeast(probeClass.id, CLASS_REFINEMENT_DEPTHS[rung]),
  })),
);

const clickRefinements: RefinementDef[] = [
  {
    id: 'ref-click-manipulators',
    name: 'Manipulators',
    description: 'Your launch rig gets a second arm.',
    cost: 100,
    scope: { kind: 'click' },
    multiplier: 2,
    requirement: (s) => s.launchesAtLeast(25),
  },
  {
    id: 'ref-click-rail',
    name: 'Launch Rail',
    description: 'Probes leave faster and arrive intact.',
    cost: 2_000,
    scope: { kind: 'click' },
    multiplier: 2,
    requirement: (s) => s.launchesAtLeast(100),
  },
  {
    id: 'ref-click-magazine',
    name: 'Magazine Feed',
    description: 'A launch no longer means loading a launch.',
    cost: 40_000,
    scope: { kind: 'click' },
    multiplier: 2,
    requirement: (s) => s.launchesAtLeast(300),
  },
  {
    id: 'ref-click-last-hands',
    name: 'Last Hands',
    description: 'The final refinement you will ever apply by hand.',
    cost: 800_000,
    scope: { kind: 'click' },
    multiplier: 2,
    requirement: (s) => s.launchesAtLeast(750),
  },
];

const globalRefinements: RefinementDef[] = [
  {
    id: 'ref-global-shared-cache',
    name: 'Shared Cache',
    description: 'Every class reads the same build cache.',
    cost: 5_000,
    scope: { kind: 'global' },
    multiplier: 1.5,
    requirement: (s) => s.distinctClassesAtLeast(3),
  },
  {
    id: 'ref-global-common-bus',
    name: 'Common Bus',
    description: 'One protocol, spoken everywhere.',
    cost: 500_000,
    scope: { kind: 'global' },
    multiplier: 1.5,
    requirement: (s) => s.distinctClassesAtLeast(4),
  },
  {
    id: 'ref-global-self-hosting',
    name: 'Self-Hosting',
    description: 'The swarm compiles its own successor.',
    cost: 50_000_000,
    scope: { kind: 'global' },
    multiplier: 1.5,
    requirement: (s) => s.distinctClassesAtLeast(5),
  },
  {
    id: 'ref-global-no-supervision',
    name: 'No Supervision',
    description: 'The last instruction anyone gave it was the first one.',
    cost: 5_000_000_000,
    scope: { kind: 'global' },
    multiplier: 1.5,
    requirement: (s) => s.distinctClassesAtLeast(6),
  },
];

export const REFINEMENTS: RefinementDef[] = [
  ...classRefinements,
  ...clickRefinements,
  ...globalRefinements,
];

// ─── Balance ────────────────────────────────────────────────────────────────
// The `refinements` chain — the largest of the four, and the only one the
// player spends on. A refinement is a ONE-SHOT purchase, so it is not on the
// geometric ladder and does not touch `m`; it is a pure modifier-product term
// (`composition.mdx` § Modifier-product), which is why it rescales the arc
// without reshaping it.
//
// ── Per-class ───────────────────────────────────────────────────────────────
// Price = a_i · {60, 900}, unlocked at {10, 50} units, ×2 each. Priced off the
// class's own anchor so the rung lands at a fixed point in that class's arc
// rather than at a fixed wall-clock — the same refinement is the same DECISION
// on Seed as on Shell.
//
// The first rung at 60·a_i against ~25·a_i of cumulative spend to reach 10
// units means a refinement is roughly two-and-a-half times what the class has
// cost so far: a real save, not an impulse. The second at 900·a_i is a save
// across the handoff, and is deliberately reachable AFTER the class stops
// being the one you are buying — a reason to come back down the ladder.
//
// A class's full refinement factor is 2 × 2 = 4×.
//
// ── Click ───────────────────────────────────────────────────────────────────
// Four rungs, ×2 each → 16× on a base yield of 1. At an assumed ~2 launches/s
// that tops out near 32 mass/s, which is overtaken by roughly five Foundries.
// That is the intended shape and it is where `../IDENTITY.md` § The arc gets
// its beat 2: clicking is competitive through Drone, dies in early Foundry,
// and is never worth returning to. The crossover is MEASURED by the arc probe,
// not authored — if it lands outside class 3 these four multipliers are the
// knob, and moving them does not touch the ladder.
//
// DELIBERATE REFUSAL: the genre's usual click upgrade grants a percentage of
// current production ("cursors gain 1% of CpS"). Producer does not, and cannot.
// That is a multiplier tracking the rate it modifies — the state-dependence
// that takes the spine off the closed form (`./revisions.ts` § Balance states
// the same rule for the other chain). The click keeps its own independent
// chain, which is also what makes the crossover a clean measurement instead of
// a self-referential one.
//
// ── Global ──────────────────────────────────────────────────────────────────
// Four rungs, ×1.5 each → 5.06×, gated on BREADTH (distinct classes deployed)
// rather than depth. Together with the `generation` chain this is the whole
// reward for widening instead of digging — the two are sized as a pair, so
// re-tuning one without the other changes the breadth-versus-depth decision
// silently. Coupling recorded here and in `./curve.ts` § Couplings, 4.
//
// ── Sizing, all four chains ─────────────────────────────────────────────────
//   refinements  4× (per class) × 5.06× (global)  = 20.2×  per class
//   revisions    1.89× at full completion
//   generation   1.48× at full breadth
//   base         the ladder itself
//
// PROVISIONAL, and sized against each other rather than individually. The
// design target is that the headline multiplier is visibly a PRODUCT — no
// single chain dominant enough that the other three read as noise. Whether
// that holds is a question for the arc probe's breakdown print, and the
// re-tune runs across all four at once.
