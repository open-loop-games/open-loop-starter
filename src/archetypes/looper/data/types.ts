import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ───
// 4 capabilities (single axis; canonical Level + Talent two-tier role split
// lives module-side); 4 zones as UI grouping only (no content gating); 16
// actions with weight-coupled cost + XP and per-action prereq web. Skeleton
// counts and prereq topology are fork-of-skeleton decisions; balance constants
// live in `balance.ts`; costume strings (capability / zone / action names +
// descriptions) are co-located on each definition entry.

// ─── Costume ───
// Theme-fresh palette: Vigor / Aether / Craft / Lore capabilities; Hearth →
// Wilds → Market → Spire zone progression. Generic enough to retheme, distinct
// enough to give the demo a recognizable shape — not lifted from any single
// idle-loops exemplar.

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
 * Per-action visibility predicate over `LooperGameState`. AND across entries
 * within a single action's `prereqs` array. Visibility = `prereqs.every(matched)`.
 *
 * `always` is an explicit no-op variant for entries that want to declare
 * intentional always-visible status (omitting `prereqs` has the same effect;
 * the variant exists for explicit annotation).
 *
 * `capability-tier-level` references the canonical Level + Talent two-tier
 * shape (module-side); data uses the discriminated tier field to address either.
 */
export type ActionPrereq =
  | { kind: 'action-completion-count'; actionId: string; value: number }
  | {
      kind: 'capability-tier-level';
      capabilityId: string;
      tier: 'level' | 'talent';
      value: number;
    }
  | { kind: 'loop-count'; value: number }
  | { kind: 'always' };

export interface ActionDef {
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
   * Mana added on completion, extending the current loop's pool. Tracked
   * separately as `manaAdded` so display can show `INITIAL_MANA + manaAdded`
   * as the total budget. Resets to 0 on loop restart. Omit for mana-neutral /
   * mana-negative actions.
   */
  manaGrant?: DecimalSource;
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

// ─── Balance ───

export interface LooperBalance {
  /**
   * Mana pool size at loop start, denominated in ticks. Vanilla canonical 250
   * (~12.5 sim-seconds at the engine's 20 TPS — the "short snappy first loop"
   * texture). Pool resets to this value on every loop restart. The pool can
   * extend mid-loop via per-action `manaGrant`; cross-loop the budget is
   * always reset to `initialMana` (mana does NOT compound across loops —
   * cross-loop persistence is on capabilities, not budget).
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
 * prereqs, `canStart` gates). Methods encapsulate Decimal comparisons so
 * `data/*.ts` never imports the engine runtime. Modules implement helpers
 * over live injection-key refs.
 */
export interface LooperGameState {
  /** Current mana remaining ≥ amount. */
  manaAtLeast(amount: DecimalSource): boolean;
  /** Capability tier Level (resets per loop) or Talent (persistent) ≥ n. */
  capabilityLevelAtLeast(capabilityId: string, tier: 'level' | 'talent', n: number): boolean;
  /** Action's persistent timesCompleted counter ≥ count. */
  actionCompletedAtLeast(actionId: string, count: number): boolean;
  /** Persistent loop counter ≥ n (1-indexed; n=1 means "after first loop end"). */
  loopCountAtLeast(n: number): boolean;
}

export interface LooperData {
  capabilities: CapabilityDef[];
  zones: ZoneDef[];
  actions: ActionDef[];
  balance: LooperBalance;
}
