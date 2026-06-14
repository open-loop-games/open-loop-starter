import type { DecimalSource } from '@open-loop/engine';

// 10 resources, 10 buildings, 4 jobs, 6 sciences, 6 crafts. Arc-1 scope is
// Kittens Game pre-paragon, through `architecture` science + first megalith.
//
// All numeric constants lift from `open-loop-research/reference-code/kittensgame/js/`
// (current checkout). Kittens runs at 5 ticks/sec (tick = 0.2s); per-tick source
// values are converted to per-second at the data reader site. The conversion is
// documented per-constant where the source uses per-tick.

// ─── Ids ──────────────────────────────────────────────────────────────────

// Umbrella OL-1056 description listed 10 resources but referenced scaffold as
// both a craft output AND an input to quarry. Adding scaffold here as the 11th
// resource keeps the craft-output graph well-formed; the quarry substitute price
// reads through it. Phase 5 close-out PR-amends the umbrella's count.
export type ResourceId =
  | 'catnip'
  | 'wood'
  | 'minerals'
  | 'iron'
  | 'science'
  | 'kittens'
  | 'beam'
  | 'slab'
  | 'plate'
  | 'scaffold'
  | 'megalith';

export type BuildingId =
  | 'field'
  | 'pasture'
  | 'hut'
  | 'library'
  | 'mine'
  | 'quarry'
  | 'smelter'
  | 'workshop'
  | 'barn'
  | 'warehouse'
  | 'lumberMill';

export type JobId = 'woodcutter' | 'farmer' | 'scholar' | 'miner';

export type ScienceId =
  | 'calendar'
  | 'agriculture'
  | 'mining'
  | 'metal'
  | 'construction'
  | 'architecture';

export type CraftId = 'wood' | 'beam' | 'slab' | 'plate' | 'scaffold' | 'megalith';

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

// ─── Data shapes ──────────────────────────────────────────────────────────

export interface ResourceSpec {
  id: ResourceId;
  /** Display label (costume). */
  name: string;
  /** Base storage cap before building grants. `null` = uncapped (science, kittens
   *  by Kittens canon). The capped resources have base 0; barn / warehouse /
   *  hut / library / pasture push grants onto the per-resource max-chain. */
  baseCapacity: DecimalSource | null;
  /** Whether the resource appears in the crafts panel as a craftable. */
  craftable: boolean;
  /** Cap semantics when the max-chain is empty (no storage building yet).
   *  `false`/absent → canon stockpile (`resources.js` `addRes`: `maxValue ||
   *  MAX_VALUE`, so a zero max is UNCAPPED until a barn/warehouse grants a
   *  finite cap). `true` → hard cap, a zero max means zero room — used for
   *  population (kittens), whose only housing is hut grants (canon `maxKittens`,
   *  base 0). */
  hardCap?: boolean;
}

export interface BuildingPrice {
  resource: ResourceId;
  baseCost: DecimalSource;
}

/** A per-building grant. Pushed onto the named max-chain or rate-chain on
 *  purchase; deactivated on sell. The chain id encodes the target — `<resourceId>-max`
 *  for storage caps; `<resourceId>-rate` for production-rate modifiers. */
export interface BuildingGrant {
  chainId: string;
  /** Multiplicative or additive grant per building owned. */
  kind: 'add' | 'mul';
  /** Magnitude applied per `count`. Multiplicative grants compose as
   *  `(1 + value)^count` via the chain; additive grants as `value × count`. */
  value: number;
  /** Free-form description threaded to UI tooltip. */
  description: string;
}

export interface BuildingSpec {
  id: BuildingId;
  /** Display label. */
  name: string;
  /** Multi-resource purchase cost. */
  prices: BuildingPrice[];
  /** Cost-scaling ratio per building owned. `cost(n) = baseCost × ratio^n`. */
  priceRatio: number;
  /** Per-building grants pushed onto rate/cap chains. */
  grants: BuildingGrant[];
  /** Science id this building requires for visibility. `null` = visible from start
   *  (canonical Kittens `defaultUnlockable: true`). */
  unlockedByScience: ScienceId | null;
}

export interface JobSpec {
  id: JobId;
  /** Display label. */
  name: string;
  /** Resource this job's modifier feeds. */
  resource: ResourceId;
  /** Per-kitten-assigned production rate, in units/sec. Source values are
   *  per-tick (Kittens 5 ticks/sec); convert at the reader site by × 5. */
  baseRatePerSecond: number;
  /** Science id required to unlock job visibility. `null` = not science-gated. */
  unlockedByScience: ScienceId | null;
  /** Building whose presence (count ≥ 1) unlocks job visibility, matching
   *  canon's "job threads through a building" pattern (scholar ← library).
   *  `undefined` = not building-gated. A job is visible when its science gate
   *  (if any) AND its building gate (if any) are both satisfied. */
  unlockedByBuilding?: BuildingId;
}

export interface ScienceSpec {
  id: ScienceId;
  /** Display label. */
  name: string;
  /** Science cost (only requirement in canonical Kittens for arc-1 sciences;
   *  architecture's `compedium` requirement is dropped — see overview.md). */
  baseCost: DecimalSource;
  /** Prerequisite science id, or `null` for the first-tier (calendar). */
  prerequisite: ScienceId | null;
}

export interface CraftInput {
  resource: ResourceId;
  amount: DecimalSource;
}

export interface CraftSpec {
  id: CraftId;
  /** Display label. */
  name: string;
  /** Multi-input recipe. Single-input for tier-1 crafts (wood/beam/slab/plate);
   *  scaffold consumes beam; megalith consumes beam+slab+plate. */
  inputs: CraftInput[];
  /** Output resource id. Canonical Kittens crafts produce 1 of the named
   *  craftable; the `outputAmount` field exists for future per-craft yield
   *  perturbation but defaults to 1 in arc 1. */
  outputResource: ResourceId;
  outputAmount: number;
  /** Science id that gates craft visibility. `null` = visible from workshop
   *  unlock (e.g., raw `wood` craft visible immediately on workshop purchase). */
  unlockedByScience: ScienceId | null;
}

export interface SeasonSpec {
  id: SeasonId;
  name: string;
  /** Multiplier applied to catnip production while this season is active.
   *  Source: `calendar.js` season `modifiers.catnip` (spring 1.5, summer 1.0,
   *  autumn 1.0, winter 0.25). */
  catnipMultiplier: number;
}

export interface InterlockerData {
  resources: ResourceSpec[];
  buildings: BuildingSpec[];
  jobs: JobSpec[];
  sciences: ScienceSpec[];
  crafts: CraftSpec[];
  /** Season cycle in calendar order (spring → winter). */
  seasons: SeasonSpec[];
  /** Days per season (canon `calendar.js:218 daysPerSeason: 100`). */
  daysPerSeason: number;
  /** Real seconds per in-game day (canon 10 ticks/day ÷ 5 ticks/sec = 2). */
  secondsPerDay: number;
  /** Per-kitten catnip consumption per second. Source: `village.js:9`
   *  `catnipPerKitten: -0.85 per tick` × 5 ticks/sec = -4.25/sec. */
  catnipPerKittenPerSec: number;
  /** Base kitten growth rate per second while the colony is fed. Source:
   *  `village.js:7` `kittensPerTickBase: 0.01 per tick` × 5 = 0.05/sec. The
   *  village module accumulates this into a sub-kitten progress counter, and
   *  suspends it while the catnip balance is negative (canon `sim.update(0)`,
   *  village.js:367) — so growth is gated by the sign of the catnip balance,
   *  not by a fixed threshold. */
  kittenGrowthRatePerSec: number;
}

// ─── Typed read view (data-side predicates avoid engine runtime imports) ──

/** Typed read view of module state exposed to data-side predicates (visibility
 *  cascades, predicate-gated effects). Methods encapsulate Decimal comparisons
 *  + injection-key access so data files never import the engine runtime. */
export interface InterlockerGameState {
  /** Whether the named science has been researched. Drives building, craft,
   *  and science-prereq visibility cascades from one mechanism. */
  scienceCompleted(id: ScienceId): boolean;
  /** Whether a building is owned (count > 0). Some unlocks key on this
   *  (e.g., crafts category visible once `workshop` is owned). */
  buildingOwned(id: BuildingId): boolean;
  /** Total population. Job-assignment write-sites consume this. */
  kittensCount(): number;
  /** Sum of currently assigned kittens across all jobs. */
  assignedKittensCount(): number;
  /** Whether a resource bag holds at least `amount` of `id`. */
  resourceAtLeast(id: ResourceId, amount: DecimalSource): boolean;
}

// ─── Runtime instance + event types (cross-module contracts) ──────────────

export interface KittenDiedEvent {
  /** Sim-time when death occurred. */
  simTime: number;
  /** Job the kitten was demoted from (`null` = was unassigned). */
  demotedFromJob: JobId | null;
}

export interface BuildingPurchasedEvent {
  buildingId: BuildingId;
  /** Count after purchase. */
  newCount: number;
}

export interface JobCountChangedEvent {
  jobId: JobId;
  previousCount: number;
  newCount: number;
}

export interface ScienceCompletedEvent {
  scienceId: ScienceId;
  simTime: number;
}

export interface CraftedEvent {
  craftId: CraftId;
  outputResource: ResourceId;
  outputAmount: number;
}
