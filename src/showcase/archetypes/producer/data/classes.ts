import type { ProbeClassDef, ProbeClassId, ProbeScale } from './types';
import { classBaseCost, classBaseRate } from './curve';

// ─── Skeleton ───
// 8 probe classes on one shared ladder. Costume below, balance generated: the
// table carries only names and reveal points, and `baseCost` / `baseRate` come
// from the ladder generators in `./curve.ts` at map time. Writing the values
// longhand would let them drift from the rule that is supposed to produce
// them. A class carries no cost ratio of its own — `m` is shared.

// ─── Costume ───
// A self-replicating probe swarm. The ladder is a scale ladder — dust, then
// asteroid, then moon, then planet, then star — so each name is a magnitude
// marker before it is a noun. `revealAtFleetSize` is visibility only; what
// actually gates a class is whether you can afford it.

interface ProbeClassCostume {
  id: ProbeClassId;
  scale: ProbeScale;
  name: string;
  description: string;
  revealAtFleetSize?: number;
}

const COSTUME: ProbeClassCostume[] = [
  {
    id: 'seed',
    scale: 'dust',
    name: 'Seed',
    description: 'One probe, hand-launched, chewing interplanetary dust.',
  },
  {
    id: 'drone',
    scale: 'dust',
    name: 'Drone',
    description: 'A working replicator. It builds copies without being asked.',
    revealAtFleetSize: 5,
  },
  {
    id: 'foundry',
    scale: 'asteroid',
    name: 'Foundry',
    description: 'An asteroid hollowed into a smelter.',
    revealAtFleetSize: 15,
  },
  {
    id: 'hauler',
    scale: 'asteroid',
    name: 'Hauler',
    description: 'Moves belt mass to where the foundries are.',
    revealAtFleetSize: 30,
  },
  {
    id: 'ring',
    scale: 'moon',
    name: 'Ring',
    description: 'A moon disassembled into an orbital band.',
    revealAtFleetSize: 50,
  },
  {
    id: 'lathe',
    scale: 'planet',
    name: 'Lathe',
    description: 'Takes a planet apart from the crust inward.',
    revealAtFleetSize: 75,
  },
  {
    id: 'swarm',
    scale: 'star',
    name: 'Swarm',
    description: 'Collectors thick enough to dim the star they orbit.',
    revealAtFleetSize: 105,
  },
  {
    id: 'shell',
    scale: 'star',
    name: 'Shell',
    description: 'The star is enclosed. Nothing it emits leaves unused.',
    revealAtFleetSize: 140,
  },
];

export const PROBE_CLASSES: ProbeClassDef[] = COSTUME.map((costume, index) => ({
  ...costume,
  baseCost: classBaseCost(index),
  baseRate: classBaseRate(index),
}));

// ─── Balance ────────────────────────────────────────────────────────────────
// Generated from `./curve.ts`. For class index i (0-based):
//
//   a_i = OPENING_CLASS_COST · CLASS_COST_STEP^i = 15  · 10^i
//   r_i = OPENING_CLASS_RATE · CLASS_RATE_STEP^i = 0.1 ·  8^i
//
// which realizes as:
//
//   class     a_i            r_i          a_i/r_i (s of self-payback)
//   seed              15            0.1        150
//   drone            150            0.8        188
//   foundry        1_500            6.4        234
//   hauler        15_000           51.2        293
//   ring         150_000          409.6        366
//   lathe      1_500_000        3_276.8        458
//   swarm     15_000_000       26_214.4        572
//   shell    150_000_000      209_715.2        715
//
// The two anchors are the only authored magnitudes on the ladder, and
// `OPENING_CLASS_COST` is load-bearing twice: it also sets the opening beat
// against the click yield (`./curve.ts` § Couplings, 1).
//
// Self-payback climbs ×1.25 per class, so a class's opener is ALWAYS worse than
// the class below it at count zero. It prices past only once the class below
// has climbed `m^n` far enough — n = ln(1.25)/ln(m) ≈ 1.6 units, in isolation.
//
// That number is deliberately NOT the realized handoff depth, and what sets
// the depth is whether the buyer may save. A buyer offered only what it can
// afford keeps a class in service for tens of units, because the next one is
// unaffordable at current income: it spends where it can rather than where it
// would rather, and walks a steep descending ladder. A buyer that may hold
// cash for the next class spends where it would rather, and the ladder comes
// out nearly flat — 76/74/73/71/70/68/66/65 under the shipping ladder, whose
// managed rung saves (`balance/arc-probe.ts`, 8h). Neither shape is authored.
//
// MEASURED. Affordability versus payback is this archetype's decision surface,
// and saving is nearly all of it: across the three rules the frontier moves
// 3.61×, `hybrid` barred from waiting matches `cheapest` on every row, and the
// whole spread is the wait term (`balance/allocation-probe.ts`). The
// combinatorial-selection edge in `../IDENTITY.md` § Where the closed form
// stops is load-bearing, and it is load-bearing through the decision to save.
//
// Re-tune targets: to lengthen the arc, raise CLASS_COST_STEP (steeper walls
// between classes); to make later classes feel stronger, raise
// CLASS_RATE_STEP. Moving either alone shifts every handoff — `./curve.ts`
// § Couplings, 3.
//
// `revealAtFleetSize` carries NO balance weight. It is spaced to reveal a class
// a little before it is affordable, so the ladder reads as a ladder; if a probe
// shows a class revealed long before or after it is first bought, this is the
// constant to move and nothing downstream cares.
