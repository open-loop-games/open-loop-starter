// ─── Spec contract ────────────────────────────────────────────────────────────
// Role: typed contract for the producer archetype's data layer. Concrete
//       values land in sibling data/* files; modules read these shapes.
// ─────────────────────────────────────────────────────────────────────────────

import type { Decimal, DecimalSource } from '@open-loop/engine';

/**
 * Producer definition — covers both the manual-trigger click activity and
 * the continuous-trigger building tiers. `purchase` is absent on the click
 * producer; present on buildings (cursor through final pre-ascension tier).
 *
 * Canonical sources:
 *   - click activity: `main.js:4988` (`Game.ClickCookie`)
 *   - building tier constructor: `main.js:7982` (`Game.Object`)
 *   - cursor through final tier definitions: `main.js:8979–9302`
 */
export interface ProducerDef {
  /** Stable id; used as save key and category-entry identifier. */
  id: string;
  /** Display name (costume). */
  name: string;
  /** Activity vs continuous emission. */
  trigger: 'continuous' | 'manual';
  /** Per-second for continuous; per-activation for manual. */
  baseRate: DecimalSource;
  /** Absent on the click producer. */
  purchase?: {
    /** Tier-1 first-unit cost. */
    baseCost: DecimalSource;
    /** Per-purchase geometric multiplier (Cookie Clicker default 1.15). */
    costScaling: DecimalSource;
  };
}

/**
 * Common upgrade fields. Concrete shapes (`MultiplierUpgradeDef` /
 * `CrossBuildingClickBonusUpgradeDef`) extend this with a discriminator
 * and kind-specific payload.
 */
interface UpgradeDefBase {
  id: string;
  name: string;
  description: string;
  cost: DecimalSource;
}

/**
 * Per-building tiered multiplier (`Game.MakeTiered` / `Game.TieredUpgrade`,
 * `main.js:10145–10155`) and global headline multipliers. `multiplier`
 * binds as a multiplicative modifier on the target chain(s).
 *
 * `targetProducerId` resolution:
 *   - `string`        → that producer's rate chain
 *   - `string[]`      → multiple producer chains (e.g. cursor tier upgrades
 *                       bind to both the click chain and the cursor's
 *                       passive-CPS chain, since the canonical text reads
 *                       "the mouse and cursors are twice as efficient")
 *   - `null`          → every producer's rate chain (headline-wide)
 */
export interface MultiplierUpgradeDef extends UpgradeDefBase {
  kind: 'multiplier';
  targetProducerId: string | string[] | null;
  multiplier: DecimalSource;
}

/**
 * The Thousand fingers cross-building series (`main.js:10239–10243`,
 * `:10246–10914` extensions). Each tier adds a flat additive bonus to the
 * click producer's rate, scaling with non-cursor building count:
 *   bonus = perNonCursorBuilding × count(non-cursor buildings)
 *
 * Declared invention: canonical Cookie Clicker computes finger-series
 * contribution as `0.1 × non-cursor-count × ∏(owned-finger-multipliers)`
 * — a single bind whose multiplier grows multiplicatively with each new
 * finger upgrade. First-arc port stages each tier as an independent
 * additive bind with `perNonCursorBuilding` set to the delta against
 * the prior tier, so owned-in-order stacking sums to the canonical
 * max-tier bonus. Cross-tier multiplicative composition graduates if a
 * second consumer needs the same shape (candidate-primitive per
 * spec § 7).
 */
export interface CrossBuildingClickBonusUpgradeDef extends UpgradeDefBase {
  kind: 'cross-building-click-bonus';
  /** Additive bonus per non-cursor building owned. Stacks with prior
   *  finger-series tiers as a sum (delta-staged per declared-invention). */
  perNonCursorBuilding: DecimalSource;
}

export type UpgradeDef = MultiplierUpgradeDef | CrossBuildingClickBonusUpgradeDef;

/**
 * Achievement definition — first-arc port covers the production-total
 * series (`main.js:12994+` `BankAchievement`), CPS-rate series
 * (`main.js:13005+` `CpsAchievement`), click-count series
 * (`main.js:13058+`), and per-building-count tiers (inline `Game.Win`
 * calls in building callbacks per `main.js:9019+`). Per-building tiers
 * land via `modules/milestones.ts` against `producer.count`; cross-cutting
 * achievements (bank/cps/click) land via `modules/achievements.ts`
 * against `ProducerGameState` reads.
 *
 * First-arc declared invention: per-achievement direct multiplier replaces
 * the canonical milk/kitten chain (`main.js:5240`, `:5256–5271`) per
 * spec § 5. Full chain ports if kitten upgrades enter first-arc scope.
 */
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  hidden?: boolean;
  /** State predicate — true when the achievement's trigger condition is met. */
  requirement: (state: ProducerGameState) => boolean;
  /** Headline multiplicative reward. Default carries via the
   *  `balance/achievementRewardMultiplier` tunable in
   *  `modules/achievements.ts`. */
  rewardMultiplier?: DecimalSource;
}

/**
 * Live read-view of producer state exposed to achievement predicates.
 * Snapshot semantics — predicates evaluate against the current frame,
 * not a frozen copy. Modules construct this by closing over their live
 * accessors at install time.
 */
export interface ProducerGameState {
  /** Current primary-resource balance (cookies). */
  cookies: Decimal;
  /** Cumulative primary-resource earned across the arc (canonical
   *  `Game.cookiesEarned`, `main.js:2134`). */
  cookiesEarned: Decimal;
  /** Current headline rate (CPS = headline-chain output). */
  cps: Decimal;
  /** Cumulative click count across the arc. */
  clicks: Decimal;
  /** Owned count per producer id (continuous tiers only). */
  producerCounts: Record<string, Decimal>;
}

/**
 * Composed data bag — the unit `applyProducerOverrides` deep-merges over
 * and modules close over at install time. Sim tests and the workbench
 * perturb this object directly via the `createProducerEngine` factory.
 * Balance constants live at their `tunable()` reader sites under
 * `modules/`; perturbation routes through the producer module's
 * `TuningRegistry` scope, not this data bag.
 */
export interface ProducerData {
  producers: ProducerDef[];
  upgrades: UpgradeDef[];
  achievements: AchievementDef[];
}
