// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//            open-loop-research/reference-code/SynergismOfficial/src/Buy.ts
//            open-loop-research/reference-code/SynergismOfficial/src/Variables.ts
// First-arc shape per archetypes/scaler.md § 4 (data shape) and § 5 (content scope).
// ─────────────────────────────────────────────────────────────────────────────

import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ───
// Three first-arc tiers (coin / prestige / transcend); leaf 2 lands prestige
// alongside coin. Producer per tier carries a position 1..5 + intra-tier
// cascade. Coin cascade is upgrade-gated (`upgrades[101..105]`, inert at first
// arc); diamond cascade is unconditional canonical (`Synergism.ts:3227-3238`).

export type Tier = 'coin' | 'prestige' | 'transcend';

/**
 * Five producers per tier (coin / diamond / mythos building families per
 * `Buy.ts:336-338`). Geometric base-cost scaling is the engine default for
 * `createProducerCategory.purchase`; overridden costs come from
 * canonical and live in `data/<tier>.ts`.
 */
export interface ProducerDef {
  /** Canonical id mirroring exemplar slot (e.g. `'coin-1'`). */
  id: string;
  name: string;
  tier: Tier;
  /** Intra-tier rank 1..5; drives cascade direction. */
  position: number;
  /** Per-second base rate before any rateChain modifier. Lifted from canonical. */
  baseRate: DecimalSource;
  /** First-purchase cost in this tier's currency. */
  baseCost: DecimalSource;
  /** Geometric cost-scaling multiplier per purchase. */
  costScaling: DecimalSource;
}

/**
 * Cumulative-buy upgrade (Accelerator + Multiplier, per `Buy.ts:26-69` + `:156-197`).
 *
 * Cost is non-geometric — `createScalingPurchasable`'s closed-form geometric
 * scaling doesn't fit the canonical piecewise-with-factorial shape. Modules
 * hand-roll the cost closure with the mirror pattern per `purchasable.ts:672-728`.
 */
export interface CumulativeUpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Tier whose currency funds the buy. */
  tier: Tier;
  /** First-buy base cost; the canonical formula scales from here. */
  baseCost: DecimalSource;
}

/**
 * Crystal upgrade — leveled, super-exponential cost on `prestigeShards`.
 *
 * Canonical cost (`Buy.ts:657-694`):
 * `10^(baseLogCost + costIncrement · ((n - 0.5)² / 2 - 1/8))` where `n` is the
 * next purchase index (current level + 1). Anchors lift verbatim from
 * `Variables.ts:31-32` `G.crystalUpgradesCost` / `G.crystalUpgradeCostIncrement`
 * (the active-cost arrays — distinct from `player.crystalUpgradesCost` at
 * `Synergism.ts:544`, which is initial state and never read for buys).
 *
 * Crystal levels reset per-prestige (`Reset.ts:1442+1449`) — no `keep:` exemption.
 * Forks raising the per-cycle ceiling extend `limit` here.
 */
export interface CrystalUpgradeDef {
  /** Stable id, e.g. `'crystal-1'`. */
  id: string;
  /** 1-indexed position in canonical Crystal grid (1..8). */
  position: number;
  name: string;
  description: string;
  /** Log10 base cost — first row of `Variables.ts:31`. */
  baseLogCost: number;
  /** Quadratic-coefficient log10 increment per level — `Variables.ts:32`. */
  costIncrement: number;
}

/**
 * Per-upgrade rate-effect route into a tier's modifier surface. Canonical
 * Synergism composes `globalCoinMultiplier` + `coinOneMulti..coinFiveMulti`
 * each frame from per-upgrade conditional contributions; the engine analogue
 * is `chain.bind` per producer rateChain via `grants[]` on the upgrade
 * category mapper.
 *
 * `producer-target` and `tier-target` resolve to one or more producer chains
 * at module wiring time — the upgrade module imports the tier category
 * directly (no injection key) and reaches `category.getProducer(id).rateChain`.
 */
export type UpgradeEffectScope =
  | { kind: 'producer'; tier: Tier; producerId: string }
  | { kind: 'tier-global'; tier: Tier };

/**
 * Multiplicative grant contributed by an upgrade while it is active.
 * `multiplier` is a closure over typed game state — modules resolve the
 * `ScalerGameState` accessor at install time and re-bind on tick.
 */
export interface UpgradeGrant {
  scope: UpgradeEffectScope;
  /** Active-state multiplier; identity-1 means no contribution. */
  multiplier: (state: ScalerGameState) => DecimalSource;
  /** Description used for chain-binding attribution (workbench / tooltip). */
  description: string;
}

/**
 * One-time upgrade in the Upgrades-tab grid (positions 1–60). Canonical:
 * `player.upgrades[]` row in `Variables.ts:21-23` (cost-log grid) + `Upgrades.ts`
 * (router `clickUpgrades` :293-340 + per-row `upgradeeffects` :240-291).
 *
 * `costLog` gives base-10 logarithm of canonical cost — coin band 1–20 ranges
 * `[6, 7, 8, 10, 12, 20, 35, 50, 75, 100, 55, 75, 125, 150, 200, 250, 500, 750, 1000, 1500]`
 * per `Variables.ts:28-29`.
 */
export interface UpgradeDef {
  /** Stable id, e.g. `'upgrade-1'`. */
  id: string;
  /** 1-indexed position in the canonical grid (1..60 first arc). */
  position: number;
  /** Tier whose currency funds the buy (`coin` for 1–20, `prestige` for 21–40, `transcend` for 41–60). */
  tier: Tier;
  /** Cost in canonical tier currency = `10 ** costLog`. */
  costLog: number;
  name: string;
  description: string;
  /**
   * Empty when the canonical effect depends on later-arc state that hasn't
   * been ported yet (declared invention deferred to balance leaf per spec § 5).
   * Module wiring expands each entry into one or more `chain.bind` grants.
   */
  effects: UpgradeGrant[];
}

// ─── Balance ───
// Cross-tier numeric anchors. Coin tier lifts `coinBuildingCosts` /
// `acceleratorPower` / `multiplierPower` 1:1 from canonical (see
// `Buy.ts:343` + `Variables.ts:50-58`). Prestige row extends with conversion
// formula anchors + Crystal cost reduction; transcend extends in its leaf.

export interface ScalerBalance {
  /**
   * Canonical `Variables.ts:44` — divides building costs across the corpus.
   * Default 1; later-arc effects modify (Crystal upgrade 5, achievement grants).
   * Inert at leaf 2.
   */
  costDivisor: DecimalSource;
  /**
   * Base offerings credited at the top of every reset (`Reset.ts:406`
   * `resetOfferings()` → `Calculate.ts:114-142` `calculateOfferings`). Canonical
   * computes a base + later-arc multipliers; first-arc port lifts a constant
   * trickle that the SI rune multiplies via `getRuneEffects('SI').offeringMult`.
   */
  offeringBaseGain: DecimalSource;
  /**
   * Per-rune EXP-per-level schedule from `Variables.ts:15` `runeexpbase`.
   * First arc only ports the first 5 entries (runes 6/7 deferred per spec § 5).
   * Currently unused — `RuneDef.costCoefficient` + `levelsPerOOM` already
   * encode the canonical curve; this constant ports as a back-pocket reference
   * for later-arc systems that read `runeexpbase` directly.
   */
  runeexpbase: readonly DecimalSource[];
  /**
   * Accelerator power per `Variables.ts:50` (1.10). Each owned Accelerator
   * contributes `acceleratorPower` × `(totalAccelerator + freeAccelerator)`
   * to the rate boost via `acceleratorEffect`.
   */
  acceleratorPower: DecimalSource;
  /**
   * Multiplier power per `Variables.ts:57` (2). Each owned Multiplier
   * contributes `multiplierPower` ^ `(totalMultiplier + freeMultiplier)`
   * to the global coin multiplier via `multiplierEffect`.
   */
  multiplierPower: DecimalSource;
  /**
   * Prestige conversion divisor per canonical `Synergism.ts:3563-3565`:
   * `prestigePointGain = floor((coinsThisPrestige / prestigeDivisor)^prestigePow)`.
   * Canonical hard-codes `1e12`.
   */
  prestigeDivisor: DecimalSource;
  /**
   * Prestige conversion exponent per canonical (`prestigePow` baseline `1/2`,
   * pre-corruption / pre-deflation modifiers).
   */
  prestigePow: number;
  /**
   * Threshold guard for the prestige button — canonical disjunctive gate
   * `coinsThisPrestige.gte(prestigeThreshold) || prestigePointGain.gte(prestigeGainFloor)`
   * per `Synergism.ts:3620`.
   */
  prestigeThreshold: DecimalSource;
  /** Computed-gain branch of the prestige gate — minimum PP gain to unlock. */
  prestigeGainFloor: DecimalSource;
}

/**
 * Base 5 rune ids, lifted from canonical `Runes.ts:51-57` `indexToRune` minus
 * the later-arc entries. Order is the canonical sacrifice / display order.
 */
export type RuneId = 'speed' | 'duplication' | 'prism' | 'thrift' | 'superiorIntellect';

/**
 * Effect map per rune. Mirrors canonical `RuneTypeMap` (`Runes.ts:65-110`)
 * for the base 5 only; later-arc runes (infiniteAscent / antiquities /
 * horseShoe / finiteDescent) are out of scope. Keys match canonical so the
 * effect closures port verbatim.
 */
export interface RuneEffectMap {
  speed: {
    acceleratorPower: number;
    multiplicativeAccelerators: number;
    globalSpeed: number;
  };
  duplication: {
    multiplierBoosts: number;
    multiplicativeMultipliers: number;
    taxReduction: number;
  };
  prism: {
    productionLog10: number;
    costDivisorLog10: number;
  };
  thrift: {
    costDelay: number;
    salvage: number;
    taxReduction: number;
  };
  superiorIntellect: {
    offeringMult: number;
    obtainiumMult: number;
    antSpeed: number;
  };
}

/**
 * Per-rune definition. Numeric anchors lift verbatim from canonical
 * `Runes.ts:357-560` rune objects: `costCoefficient` + `levelsPerOOM` drive
 * the EXP-per-level curve. `effects(level)` ports the canonical effect closure
 * for the rune; the level argument is the *effective* level (post
 * `firstFiveEffectiveRuneLevelMult`, which is identity-1 at first arc).
 */
export interface RuneDef<K extends RuneId = RuneId> {
  /** Stable id, matching the canonical key in `runes` (`Runes.ts:353`). */
  id: K;
  /** Display name shown in UI. */
  displayName: string;
  /**
   * Canonical EXP-per-level curve coefficient. Total EXP to reach level L is
   * `costCoefficient × (10^(L / levelsPerOOM) − 1)` (`Runes.ts:791-794`
   * `computeEXPToLevel`).
   */
  costCoefficient: DecimalSource;
  /** Levels per order-of-magnitude in the EXP curve. */
  levelsPerOOM: number;
  /**
   * Effect closure lifted from canonical. Returns the per-effect-key map
   * for this rune at the given effective level.
   */
  effects(level: number): RuneEffectMap[K];
}

/**
 * Typed read view of module state, exposed to predicate / multiplier closures
 * inside `data/upgrades.ts` (and `data/prestige.ts` for Crystal effects).
 * The shared accessor at `composables/scaler-game-state.ts` fills the methods
 * over live engine refs so data files stay engine-runtime-free.
 *
 * Each method named here resolves to a single-arg accessor over the relevant
 * tier category or resource. Per-tier methods dispatch on `tier`; cross-tier
 * resource ids resolve through `resourceValue`.
 */
export interface ScalerGameState {
  /** Owned count of a producer (purchasable amount only — not extraCount). */
  producerOwned(tier: Tier, producerId: string): DecimalSource;
  /** Sum of owned counts across all producers in a tier — canonical `calculateTotal{Coin,Diamond,...}Owned`. */
  totalOwned(tier: Tier): DecimalSource;
  /**
   * Resource lookup by id. Live in leaf 2 for: `prestigePoints` (cumulative),
   * `prestigeShards` (per-cycle), `coinsThisPrestige` (per-cycle). Returns 0
   * for unported resource ids (e.g. `transcendPoints`, `transcend-shards`).
   */
  resourceValue(id: string): DecimalSource;
  /** Whether an Upgrades-tab entry has been bought (latch on `purchasable.active`). */
  upgradeBought(position: number): boolean;
  /** Cumulative Accelerator purchases — `Buy.ts` calls this `totalAccelerator`. */
  acceleratorBought(): DecimalSource;
  /** Cumulative Multiplier purchases — `Buy.ts` calls this `totalMultiplier`. */
  multiplierBought(): DecimalSource;
  /** Crystal upgrade level for a position 1..8 (per-cycle, zero post-prestige). */
  crystalLevel(position: number): DecimalSource;
  /** Integer level of a rune (post `updateLevelsFromEXP`). */
  runeLevel(rune: RuneId): number;
  /** Live `offerings` resource value. */
  offeringsValue(): DecimalSource;
}

/** Aggregate type for the archetype's data tree, consumed by `boot.ts`. */
export interface ScalerData {
  producers: {
    coin: ProducerDef[];
    prestige: ProducerDef[];
  };
  cumulativeUpgrades: {
    accelerator: CumulativeUpgradeDef;
    multiplier: CumulativeUpgradeDef;
  };
  upgrades: {
    coin: UpgradeDef[];
    prestige: UpgradeDef[];
  };
  crystalUpgrades: CrystalUpgradeDef[];
  balance: ScalerBalance;
}
