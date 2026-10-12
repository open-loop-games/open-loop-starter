// ─── Skeleton ───
// The apparatus and what goes into it — the Cooldown-Rotation half of the
// identity line, plus the draft pool the Run-Scoped Upgrade Tree draws from
// (`../IDENTITY.md`). Devices fire themselves on their own cadences; reagents
// stack into the modifier chain; a maxed device holding the right reagent
// recombines into a named hybrid.
//
// Pure config. Cardinality is SIZED by the spine, not chosen: ~33 picks per run
// at ~8 levels to max a device and ~4 to stack a reagent puts an evolution at
// ~12 picks, so a run completes 2–3 of six. See § Balance.

export type DeviceShape = 'bolt' | 'pulse' | 'cone' | 'lance';

export interface DeviceDef {
  id: string;
  displayName: string;
  blurb: string;
  /** How it reaches: single target, radial pulse, forward cone, piercing line. */
  shape: DeviceShape;
  /** Damage per activation at level 1, before the modifier chain. */
  baseDamage: number;
  /** Seconds between activations at level 1. The cadence. */
  cooldownSec: number;
  /** Reach in sim units. Bounded by `ARENA_BALANCE.killRadius`. */
  reach: number;
  /** Targets one activation can affect. `1` for single-target shapes. */
  maxTargets: number;
  /** Picks to reach max level — the evolution prerequisite. */
  maxLevel: number;
  /** Whether the operator opens with this device installed. */
  starting?: boolean;
}

/**
 * Four devices on deliberately distinct cadences. Two are single-target
 * (`bolt`, `lance`) and two scale with how many specimens are inside the radius
 * (`pulse`, `cone`) — so the rotation's effective output shifts across the run
 * as density climbs, and "which device is carrying" is a real question rather
 * than a fixed ranking.
 */
export const DEVICES: DeviceDef[] = [
  {
    id: 'arc-lance',
    displayName: 'Arc Lance',
    blurb: 'A tight discharge on a short cycle. Always working, never impressive.',
    shape: 'bolt',
    baseDamage: 6.2,
    cooldownSec: 0.55,
    reach: 180,
    maxTargets: 1,
    maxLevel: 8,
    starting: true,
  },
  {
    id: 'pressure-bell',
    displayName: 'Pressure Bell',
    blurb: 'Discharges outward on a slow swell. Rewards being surrounded.',
    shape: 'pulse',
    baseDamage: 9.5,
    cooldownSec: 3.2,
    reach: 110,
    maxTargets: 24,
    maxLevel: 8,
  },
  {
    id: 'culture-sprayer',
    displayName: 'Culture Sprayer',
    blurb: 'Throws a wedge of reagent along your heading. Kite into it.',
    shape: 'cone',
    baseDamage: 6.0,
    cooldownSec: 1.6,
    reach: 160,
    maxTargets: 5,
    maxLevel: 8,
  },
  {
    id: 'sear-coil',
    displayName: 'Sear Coil',
    blurb: 'Winds up, then opens a line through everything standing in it.',
    shape: 'lance',
    baseDamage: 26,
    cooldownSec: 4.5,
    reach: 180,
    maxTargets: 6,
    maxLevel: 8,
  },
];

export type ReagentEffect = 'cooldown' | 'damage' | 'reach' | 'toughness' | 'collect' | 'moveSpeed';

export interface ReagentDef {
  id: string;
  displayName: string;
  blurb: string;
  effect: ReagentEffect;
  /** Multiplier contributed per stack, folded into the modifier chain. */
  perStack: number;
  /** Picks to fully stack. */
  maxStacks: number;
  /**
   * Whether a pick of this reagent counts against a seat's `defenseShare`
   * (`./seats.ts`) rather than its offensive budget.
   */
  defensive: boolean;
}

/**
 * Six reagents, four stacks each. Three offensive, three defensive — so the
 * guns-versus-butter split a seat declares as `defenseShare` is a choice the
 * draft pool can actually express on any given offer.
 */
export const REAGENTS: ReagentDef[] = [
  {
    id: 'catalyst',
    displayName: 'Catalyst',
    blurb: 'Everything cycles faster. Nothing hits harder.',
    effect: 'cooldown',
    perStack: 0.88,
    maxStacks: 4,
    defensive: false,
  },
  {
    id: 'reactant-mass',
    displayName: 'Reactant Mass',
    blurb: 'More of it goes in. More of it comes out.',
    effect: 'damage',
    perStack: 1.22,
    maxStacks: 4,
    defensive: false,
  },
  {
    id: 'field-lens',
    displayName: 'Field Lens',
    blurb: 'The apparatus reaches further than it should.',
    effect: 'reach',
    perStack: 1.15,
    maxStacks: 4,
    defensive: false,
  },
  {
    id: 'ablative-plating',
    displayName: 'Ablative Plating',
    blurb: 'It still hurts. It hurts less.',
    effect: 'toughness',
    perStack: 1.2,
    maxStacks: 4,
    defensive: true,
  },
  {
    id: 'kinetic-primer',
    displayName: 'Kinetic Primer',
    blurb: 'Not being there is a defence.',
    effect: 'moveSpeed',
    perStack: 1.09,
    maxStacks: 4,
    defensive: true,
  },
  {
    id: 'reclaimant',
    displayName: 'Reclaimant',
    blurb: 'Motes come to you. A little. Reluctantly.',
    effect: 'collect',
    perStack: 1.18,
    maxStacks: 4,
    defensive: true,
  },
];

export interface EvolutionDef {
  id: string;
  displayName: string;
  blurb: string;
  /** Device that must be at `maxLevel`. */
  deviceId: string;
  /** Reagent that must be present (any stack count). */
  reagentId: string;
  /** Damage multiplier over the base device. */
  damageMul: number;
  /** Cooldown multiplier over the base device. */
  cooldownMul: number;
}

/**
 * Six hybrids over four devices, so most devices have two paths and the reagent
 * you happened to draft decides which. A run completes 2–3, which is what keeps
 * the roster a decision rather than a checklist.
 */
export const EVOLUTIONS: EvolutionDef[] = [
  {
    id: 'continuum-arc',
    displayName: 'Continuum Arc',
    blurb: 'The gap between discharges closes until there is not one.',
    deviceId: 'arc-lance',
    reagentId: 'catalyst',
    damageMul: 1.6,
    cooldownMul: 0.45,
  },
  {
    id: 'lattice-lance',
    displayName: 'Lattice Lance',
    blurb: 'One discharge, forked across the whole approach.',
    deviceId: 'arc-lance',
    reagentId: 'field-lens',
    damageMul: 2.3,
    cooldownMul: 0.9,
  },
  {
    id: 'detonation-bell',
    displayName: 'Detonation Bell',
    blurb: 'The swell stops being a warning.',
    deviceId: 'pressure-bell',
    reagentId: 'reactant-mass',
    damageMul: 2.8,
    cooldownMul: 0.85,
  },
  {
    id: 'harvest-bell',
    displayName: 'Harvest Bell',
    blurb: 'It rings, and the floor gives up its motes.',
    deviceId: 'pressure-bell',
    reagentId: 'reclaimant',
    damageMul: 1.5,
    cooldownMul: 0.8,
  },
  {
    id: 'bloom-vector',
    displayName: 'Bloom Vector',
    blurb: 'The wedge opens into a front you can walk behind.',
    deviceId: 'culture-sprayer',
    reagentId: 'field-lens',
    damageMul: 2.1,
    cooldownMul: 0.75,
  },
  {
    id: 'annihilation-coil',
    displayName: 'Annihilation Coil',
    blurb: 'Whatever the line touches was already over.',
    deviceId: 'sear-coil',
    reagentId: 'reactant-mass',
    damageMul: 3.2,
    cooldownMul: 0.8,
  },
];

/** Nominal DPS of a device at level 1, ignoring density and the modifier chain. */
export function nominalDps(device: DeviceDef): number {
  return device.baseDamage / device.cooldownSec;
}

/** The device the operator opens with. */
export function startingDevice(): DeviceDef {
  const device = DEVICES.find((d) => d.starting);
  if (!device) throw new Error('survivor/devices: no starting device declared');
  return device;
}

/** Total picks available in a run — one per draft beat. */
export function draftPoolSize(): number {
  const deviceLevels = DEVICES.reduce((sum, d) => sum + d.maxLevel, 0);
  const reagentStacks = REAGENTS.reduce((sum, r) => sum + r.maxStacks, 0);
  return deviceLevels + reagentStacks;
}

// ─── Balance ────────────────────────────────────────────────────────────────
// ─── Cardinality is sized, not chosen ───
//
// The schedule gives ~33 picks in a run (`./schedule.ts` § Balance). At
// `maxLevel` 8 and `maxStacks` 4, one evolution costs ~12 picks, so a run
// completes 2–3 of the six. The pool is 4·8 + 6·4 = 56 picks against a budget of
// 33, so a run sees ~59% of it: enough that drafting is choosing, not enough that
// two runs look alike. Both halves matter — a pool the run can exhaust makes the
// draft a formality, and a pool far larger than the budget makes it a lottery.
//
// The starting device is the whole opening DPS, and it is solved from the spine
// rather than picked: the flat-TTK condition at t=0 wants
// `spawnRate(0) · engage · HP` = 1.2 · 0.55 · 12 = 7.92.
//
// It carries **deliberate headroom** — 6.2/0.55 = 11.3, about 1.4× the
// requirement. Break-even is the wrong target here, and this was a measured
// correction: an opener sized at exactly 8.0 put the run on a knife edge, because
// the economy is a compounding loop where kills fund the levels that give more
// kills. Any inefficiency the closed form does not model — travel time, target
// selection, a device firing at empty space — pushes the opening under water, and
// under water the loop runs BACKWARDS: fewer kills, less income, fewer levels,
// less DPS. The arena probe read that as three seats spiralling into traversal
// collapse around the fifteen-minute mark with barely half their beats.
//
// The general form, worth carrying to any archetype with a compounding core:
// size the opening with margin, because a self-reinforcing loop has no restoring
// force and the closed form is always an optimistic bound on a real policy.
//
// ─── Cadence is the rotation, and density re-ranks it ───
//
// Nominal DPS at level 1: Arc Lance 8.0, Sear Coil 5.8, Culture Sprayer 3.8,
// Pressure Bell 3.0 — which is deliberately the reverse of their late-run order.
// `bolt` and `lance` are capped by `maxTargets`; `pulse` and `cone` multiply by
// how many specimens are inside the radius, and density climbs ~10× across a run
// (`./arena.ts`). So the Bell opens as the weakest device and ends as the
// strongest, and "which device is carrying" is a question with a different answer
// at 5:00 and at 25:00. A roster whose ranking never changes is four copies of
// one device with different art.
//
// Coupling worth naming: `maxTargets` on the area shapes is a soft cap on that
// re-ranking. Raising it hands the late run to area devices outright; lowering it
// flattens the rotation into single-target arithmetic. It is the tunable that
// decides whether the roster has an arc.
//
// ─── Reagents carry the seat axis ───
//
// Three offensive, three defensive, so `defenseShare` (`./seats.ts`) is
// expressible on a typical offer rather than being a preference the pool cannot
// honour. `reclaimant` is the interesting one: it moves `collect`, which moves η,
// which is the one term the closed form assumes rather than derives
// (`./income.ts` § Balance). It is classed defensive because it gives income
// without adding engagement — the seat that takes it is choosing not to fight for
// its motes.
//
// `catalyst` at 0.88 per stack compounds to 0.60 at four stacks, a 1.66× rate
// gain; `reactant-mass` at 1.22 compounds to 2.22. They are close on purpose, so
// the rate-versus-magnitude choice is a real fork rather than a dominant line.
//
// ─── Known thin ───
//
// Evolution damage and cooldown multipliers are authored, not solved. They should
// fall out of "an evolution is worth roughly the picks it cost" — ~12 picks at
// the per-pick gain — and they are currently eyeballed to sit near that. The
// probe measures whether a run that evolves twice actually outpaces one that
// spread the same picks, and that comparison is what should set these six pairs.
