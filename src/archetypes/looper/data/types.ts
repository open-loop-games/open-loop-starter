import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ───
// 4 capabilities (single axis; canonical Level + Talent two-tier role split
// lives module-side); 2 zones as UI grouping only (no content gating); 4
// progressVars (persistent exploration tracks, Wander-shape) coupled via a
// `scales` table to 5 regularVars (per-loop pools whose `total` derives from
// summed `level × perLevel` contributions); ~14 actions discriminated over
// `type: 'progress' | 'regular' | 'basic'` with weight-coupled cost + XP and
// per-action prereq web. Skeleton counts and prereq topology are
// fork-of-skeleton decisions; balance constants live in `balance.ts`; costume
// strings (capability / zone / progressVar / regularVar / action names +
// descriptions) are co-located on each definition entry.

// ─── Costume ───
// Theme-fresh palette: Vigor / Aether / Craft / Lore capabilities; Hearth →
// Wilds zone progression; Roam / Acquaint / Trail / Mark progressVars; Cache /
// Latch / Errand / Wellspring / Forage regularVars. Generic enough to retheme,
// distinct enough to give the demo a recognizable shape — not lifted from any
// single idle-loops exemplar.

export interface CapabilityDef {
  id: string;
  name: string;
  description: string;
}

/**
 * UI grouping only. Zones do NOT gate content in the canonical Looper shape —
 * per-action `prereqs` handle visibility. Forks that want zone-level unlocks
 * layer that on top via additional prereqs on entry actions, not by reviving
 * the `requires` field.
 */
export interface ZoneDef {
  id: string;
  name: string;
  description: string;
}

/**
 * Persistent exploration track — Wander-shape. Survives the loop reset (kept
 * by the retention policy). Each level-up emits a callback that re-totals one
 * or more regularVars (the manapot frame's load-bearing coupling). Reuses
 * `createSkillCategory` engine primitive — same surface as capabilities,
 * different role.
 */
export interface ProgressVarDef {
  id: string;
  name: string;
  description: string;
  zoneId: string;
  /** XP added per completion of any progress-type action targeting this var. */
  expMult: DecimalSource;
  /**
   * Level-up scaling table — which regularVars' totals re-derive on each
   * level gain, and by what additive contribution. Sums when multiple
   * progressVars contribute to the same regularVar (multi-axis scaling:
   * `forage.total = trail.level × 5 + mark.level × 2`).
   */
  scales: Array<{
    regularVarId: string;
    /** Additive contribution = `level × perLevel`. Composes via sum across progressVars. */
    perLevel: DecimalSource;
  }>;
}

/**
 * Per-loop pool with persistent-derived total. `total` is set by progressVar
 * level-up callbacks (sum of all contributing `level × perLevel`); persists
 * across loops as a cached derived value. `checked` and `good` are per-loop
 * counters in `thingsToReset`.
 */
export interface RegularVarDef {
  id: string;
  name: string;
  description: string;
  zoneId: string;
}

/**
 * Per-action visibility predicate over `LooperGameState`. AND across entries
 * within a single action's `prereqs` array. Visibility = `prereqs.every(matched)`.
 *
 * `always` is an explicit no-op variant for entries that want to declare
 * intentional always-visible status (omitting `prereqs` has the same effect;
 * the variant exists for explicit annotation).
 *
 * `capability-tier-level` references the canonical Level + Talent two-tier
 * shape (module-side); data uses the discriminated tier field to address either.
 *
 * `progress-var-level` references a persistent progressVar's level — the
 * cross-loop unlock surface (e.g., `Roam ≥ 5` gates Trek into Wilds).
 */
export type ActionPrereq =
  | { kind: 'action-completion-count'; actionId: string; value: number }
  | {
      kind: 'capability-tier-level';
      capabilityId: string;
      tier: 'level' | 'talent';
      value: number;
    }
  | { kind: 'progress-var-level'; progressVarId: string; value: number }
  | { kind: 'loop-count'; value: number }
  | { kind: 'always' };

/**
 * Reward emitted on every Nth check (per `rewardRatio`) of a regular-type
 * action. Mana extends the loop pool; gold accumulates the per-loop currency.
 */
export type RewardEffect =
  | { kind: 'add-mana'; amount: DecimalSource }
  | { kind: 'add-gold'; amount: DecimalSource };

/**
 * Effect applied immediately on completion of a basic-type action. Resolution
 * order in the dispatcher:
 *
 *   1. Snapshot the pre-batch state (mana/gold readings).
 *   2. Resolve every function-form `add-mana` amount against the snapshot
 *      (so `state.gold()` returns the pre-batch gold balance).
 *   3. Apply effects in declaration order.
 *
 * The `Trade` exchange (`[{spend-gold:'all'}, {add-mana: state => state.gold()*50}]`)
 * relies on this order: the `add-mana` amount captures `currentGold × 50`
 * before `spend-gold: 'all'` zeros gold, so `manaAdded = goldSpent × 50`
 * holds (the algebraic identity asserted by the `gold-mana-exchange-correctness`
 * probe in OL-746).
 */
export type CompletionEffect =
  | { kind: 'add-mana'; amount: DecimalSource | ((state: LooperGameState) => DecimalSource) }
  | { kind: 'add-gold'; amount: DecimalSource }
  | { kind: 'spend-gold'; amount: DecimalSource | 'all' };

/** Fields shared across all action-type variants. */
interface ActionDefBase {
  id: string;
  name: string;
  description: string;
  zoneId: string;
  /**
   * Base cost denominated in ticks (1 mana = 1 tick — the engine drains
   * `round(tickRate × dt × ticksAmt)` mana per engine tick, so manaCost is
   * directly comparable to the mana pool). Adjusted at dispatch time:
   *
   * ```
   * costMult = Σ(weights) weight / (1 + level / costDivisor)
   * adjustedTicks = ceil(manaCost × costMult)
   * ```
   */
  manaCost: DecimalSource;
  /** Base XP multiplier folded into the per-completion XP grant formula. */
  expMult: DecimalSource;
  /**
   * Capability weight map. Same weight controls cost contribution AND XP
   * gain — replaces the previous split `baseCost` + `xpGrants` shape. Per
   * canonical (idle-loops-ng/src/modules/action-formulas.ts:48-61):
   *
   * ```
   * adjustedExp = expMult × (manaCost / adjustedTicks)
   * for each (capabilityId, weight) in weights:
   *   xpGain = weight × adjustedExp × talentMult(capabilityId)
   *   level.addXp(xpGain)
   *   talent.addXp(xpGain × talentAccrualRatio)
   * ```
   */
  weights: Record<string, DecimalSource>;
  /**
   * Visibility predicate web. Hides the action from the drawer until every
   * entry matches against `LooperGameState`. Distinct from `canStart`:
   * prereqs gate visibility; canStart gates dispatch (cursor advances past a
   * blocked item rather than holding).
   */
  prereqs?: ActionPrereq[];
  /**
   * Per-action runnability gate the queue dispatcher consults before starting
   * an iteration. Returning `false` resolves to `'never'` in the sequencer's
   * `canRun` — the cursor advances past the item. Reads pass through
   * `LooperGameState`, so data files stay free of module imports.
   */
  canStart?: (state: LooperGameState) => boolean;
}

/**
 * Discriminated action-type union. `type` controls the secondary effect on
 * completion; the capability-XP path is identical across types via `weights`.
 *
 * - `progress` — adds XP to a persistent progressVar (Wander-shape). Drives
 *   long-term content unlock + manapot pool sizing via the progressVar's
 *   level-up callback.
 *
 * - `regular` — checks one item against a per-loop pool (`regularVarId`).
 *   Every `rewardRatio`th check fires `rewardEffects` (typically `add-mana`
 *   or `add-gold`). Pool size derives from progressVar levels.
 *
 * - `basic` — applies `completionEffects` immediately on completion (one-shot
 *   resource manipulation: gold-spend → add-mana, gold-add, etc.). The
 *   gold↔mana exchange is the canonical basic-type frame.
 *
 * The trio is a labelling convention over existing engine primitives — no
 * new engine surface; modules wire each type's secondary path internally.
 */
export type ActionDef =
  | (ActionDefBase & { type: 'progress'; progressVarId: string })
  | (ActionDefBase & {
      type: 'regular';
      regularVarId: string;
      /** Every Nth check fires rewardEffects (idle-loops `rewardRatio`, vanilla 10). */
      rewardRatio: number;
      rewardEffects: RewardEffect[];
    })
  | (ActionDefBase & {
      type: 'basic';
      /** Optional. Applied on completion. Gold-spend → mana, gold-add, etc. */
      completionEffects?: CompletionEffect[];
    });

// ─── Balance ───

export interface LooperBalance {
  /**
   * Mana pool size at loop start, denominated in ticks. Vanilla canonical 250
   * (~12.5 sim-seconds at the engine's 20 TPS — the "short snappy first loop"
   * texture). Pool resets to this value on every loop restart. The pool can
   * extend mid-loop via regular-action `rewardEffects` (manapot harvests) and
   * basic-action `completionEffects` (gold→mana exchanges); cross-loop the
   * budget always resets to `initialMana` (mana does NOT compound across
   * loops — cross-loop persistence is on capabilities, progressVars, and
   * regularVar `total`).
   */
  initialMana: DecimalSource;
  /**
   * Cost-reduction divisor on capability Level. Per-capability cost
   * contribution is `weight / (1 + level / costDivisor)`. Vanilla canonical
   * 100 (`1 + level / 100`).
   */
  costDivisor: DecimalSource;
  /**
   * Fraction of every Level XP gain that accrues to Talent XP. Vanilla
   * canonical 0.01 (1%). Talent does NOT directly reduce cost — it multiplies
   * XP-gain rate, so cross-loop compounding flows through faster Level
   * training in subsequent runs (canonical role separation).
   */
  talentAccrualRatio: DecimalSource;
  /**
   * Default `true` — the loop reset *is* the retention/prestige tier; toggling
   * off makes the demo a one-loop game.
   */
  loopResetEnabled: boolean;
}

/**
 * Typed read view of module state, exposed to predicate closures (per-action
 * prereqs, `canStart` gates, `CompletionEffect` function-form amounts).
 * Methods encapsulate Decimal comparisons / reads so `data/*.ts` never imports
 * the engine runtime. Modules implement helpers over live injection-key refs.
 */
export interface LooperGameState {
  /** Current mana remaining ≥ amount. */
  manaAtLeast(amount: DecimalSource): boolean;
  /** Current gold ≥ amount. */
  goldAtLeast(amount: DecimalSource): boolean;
  /**
   * Raw current gold — read by function-form `CompletionEffect.add-mana`
   * amounts so the `Trade` exchange can compute `gold × exchangeRate` from a
   * pre-batch snapshot.
   */
  gold(): DecimalSource;
  /** Capability tier Level (resets per loop) or Talent (persistent) ≥ n. */
  capabilityLevelAtLeast(capabilityId: string, tier: 'level' | 'talent', n: number): boolean;
  /** ProgressVar level (persistent across loops) ≥ n. */
  progressVarLevelAtLeast(progressVarId: string, n: number): boolean;
  /** Action's persistent timesCompleted counter ≥ count. */
  actionCompletedAtLeast(actionId: string, count: number): boolean;
  /** Persistent loop counter ≥ n (1-indexed; n=1 means "after first loop end"). */
  loopCountAtLeast(n: number): boolean;
}

export interface LooperData {
  capabilities: CapabilityDef[];
  zones: ZoneDef[];
  progressVars: ProgressVarDef[];
  regularVars: RegularVarDef[];
  actions: ActionDef[];
  balance: LooperBalance;
}
