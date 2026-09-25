import type { DecimalSource } from '@open-loop/engine';

// ─── Skeleton ───
// 8 probe classes on one shared geometric ladder; 24 refinements (16 per-class,
// 4 click, 4 global); 19 revisions (7 fleet-count, 8 per-class, 4 lifetime-mass).
// The skeleton counts are a fork-of-skeleton decision. The one derived balance
// number — the cost ratio `m` — lives in `./curve.ts`, which is the spine's home
// in `data/`.
//
// Four modifier chains multiply into every rate, per `../IDENTITY.md`
// § Rate-function spine: base × refinements × revisions × generation. Each is
// state-INDEPENDENT within an achievement band, which is what keeps the
// composition closed — see the coupling note in `./revisions.ts`.

/** The eight probe classes, in ladder order. Ids are the ladder's identity. */
export type ProbeClassId =
  | 'seed'
  | 'drone'
  | 'foundry'
  | 'hauler'
  | 'ring'
  | 'lathe'
  | 'swarm'
  | 'shell';

/**
 * Magnitude band a class works at. Costume, but load-bearing costume: the
 * ladder is a *scale* ladder, and the UI reads this to name what the frontier
 * has reached. Several classes share a band — the bands are coarser than the
 * ladder on purpose.
 */
export type ProbeScale = 'dust' | 'asteroid' | 'moon' | 'planet' | 'star';

export interface ProbeClassDef {
  id: ProbeClassId;
  /** Magnitude band (costume). */
  scale: ProbeScale;
  /** Display name (costume). */
  name: string;
  /** Flavour line (costume). */
  description: string;
  /**
   * Cost of this class's zeroth unit — `a_i` in `c_i(n) = a_i · m^n`. The
   * per-purchase ratio `m` is shared across every class and lives in
   * `./curve.ts`; a class does not carry its own.
   */
  baseCost: DecimalSource;
  /** Mass per second per unit, before any modifier chain — `r_i`. */
  baseRate: DecimalSource;
  /**
   * Fleet-wide unit count that reveals this class. Undefined means visible on
   * cold boot. Visibility only — affordability is the real gate.
   */
  revealAtFleetSize?: number;
}

/** What a refinement multiplies. Scope decides which chain it joins. */
export type RefinementScope =
  | { kind: 'class'; classId: ProbeClassId }
  | { kind: 'global' }
  | { kind: 'click' };

export interface RefinementDef {
  id: string;
  /** Display name (costume). */
  name: string;
  description: string;
  /** One-shot purchase price in mass. Not laddered — a refinement buys once. */
  cost: DecimalSource;
  scope: RefinementScope;
  /** Multiplicative factor contributed to its chain while owned. */
  multiplier: DecimalSource;
  /** Purchasable only once this predicate holds. Visibility and gate, both. */
  requirement: (s: ProducerGameState) => boolean;
}

export interface RevisionDef {
  id: string;
  /** Display name (costume). */
  name: string;
  description: string;
  /**
   * Global multiplicative reward, applied to every class's rate at once — the
   * swarm-wide firmware push. Falls back to the revisions module's default
   * when omitted.
   */
  multiplier?: DecimalSource;
  /**
   * MUST be a discrete step on a count or a lifetime total, never a function
   * of current production. See `./revisions.ts` § Balance for why the spine
   * depends on it.
   */
  requirement: (s: ProducerGameState) => boolean;
}

/**
 * Typed read view of module state, exposed to `data/*.ts` predicates. Methods
 * encapsulate Decimal comparisons so data files never import the engine
 * runtime. Modules implement these over live injection-key refs.
 *
 * Every method here is a *count* or a *lifetime total* — deliberately. A
 * predicate that could read current mass-per-second would let a fork write a
 * revision whose multiplier tracks the rate it modifies, which is the one
 * composition the spine cannot absorb.
 */
export interface ProducerGameState {
  /** Units owned of one class. */
  classCountAtLeast(id: ProbeClassId, count: number): boolean;
  /** Units owned across every class. */
  fleetSizeAtLeast(count: number): boolean;
  /** Distinct classes with at least one unit — the `generation` chain's input. */
  distinctClassesAtLeast(count: number): boolean;
  /** Mass produced ever, not mass currently held. Spending must not un-earn. */
  lifetimeMassAtLeast(amount: DecimalSource): boolean;
  /** Hand-launches performed. */
  launchesAtLeast(count: number): boolean;
}

export interface ProducerData {
  classes: ProbeClassDef[];
  refinements: RefinementDef[];
  revisions: RevisionDef[];
}
