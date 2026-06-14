// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//            open-loop-research/reference-code/SynergismOfficial/src/Buy.ts
//            open-loop-research/reference-code/SynergismOfficial/src/Variables.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { DecimalSource } from '@open-loop/engine';

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
 * Named additive accumulator chain bound by counter-kind grants. Modeled as
 * `ModifierChain`s whose `apply(0)` returns the sum of bound additive
 * modifiers — coin/transcend modifier closures read `bought + chain.apply(0)`
 * to fold free-X contributions into the canonical totals.
 *
 * - `freeAccelerator` / `freeMultiplier` — coin-tier free purchasable counts.
 * - `freeAccelBoost` — transcend-tier free Accelerator Boost count.
 * - `acceleratorPowerBonus` — additive bump to the canonical Accelerator
 *   power coefficient (`CANONICAL_ACCELERATOR_POWER` in `modules/canonical.ts`).
 */
export type CounterId =
  | 'freeAccelerator'
  | 'freeMultiplier'
  | 'freeAccelBoost'
  | 'acceleratorPowerBonus';

/**
 * Grant contributed by an upgrade or achievement while it is active.
 * Discriminated on `kind`:
 * - `'multiplier'` — multiplicative chain.bind onto producer rateChain(s).
 * - `'counter'` — additive contribution to a named counter chain (free-X
 *   accumulators consumed by coin/transcend modifier closures).
 *
 * Closures resolve the `ScalerGameState` accessor at install time and
 * re-evaluate on every chain read.
 */
export type UpgradeGrant =
  | {
      kind: 'multiplier';
      scope: UpgradeEffectScope;
      /** Active-state multiplier; identity-1 means no contribution. */
      multiplier: (state: ScalerGameState) => DecimalSource;
      /** Description used for chain-binding attribution (workbench / tooltip). */
      description: string;
    }
  | {
      kind: 'counter';
      counter: CounterId;
      /** Additive value contributed while active. */
      value: (state: ScalerGameState) => DecimalSource;
      /** Description used for chain-binding attribution. */
      description: string;
    };

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
// Canonical-port numeric anchors live as inline `const`s at their owning
// module's reader site with citations co-located. Cross-module-shared values
// (acceleratorPower, multiplierPower, acceleratorBoostFreeAccelPerBuy) export
// from `modules/canonical.ts`. The declared-invention surface — first-arc
// deviations from canonical (transcendDivisor / transcendThreshold lowered
// 84 OOMs to bypass unported compounding sources, offeringBaseGain stub) —
// declares at `tunable()` reader sites against `ScalerTuningRegistryKey`
// (`modules/tuning.ts`). See `archetypes/BALANCING.md § Where balance
// constants live`.

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
  /** Cumulative Accelerator Boost purchases — `Buy.ts` calls this `acceleratorBoostBought`. */
  acceleratorBoostBought(): number;
  /** Crystal upgrade level for a position 1..8 (per-cycle, zero post-prestige). */
  crystalLevel(position: number): DecimalSource;
  /** Integer level of a rune (post `updateLevelsFromEXP`). */
  runeLevel(rune: RuneId): number;
  /** Live `offerings` resource value. */
  offeringsValue(): DecimalSource;
  /**
   * Number of prestige conversions completed (canonical `player.prestigeCount`).
   * Increments inside `prestigeConversion.afterConvert`.
   */
  prestigeCount(): number;
  /**
   * Number of transcend conversions completed (canonical `player.transcendCount`).
   * Increments inside `transcendConversion.afterConvert`. Returns 0 pre-leaf 5.
   */
  transcendCount(): number;
  /**
   * Achievement points (canonical `player.achievementPoints`). Inert at
   * first arc — returns 0 until achievements (leaf 7) lands.
   */
  achievementPoints(): number;
  /**
   * Number of completions for a given transcend challenge (1..5). Reads
   * `getChallengesCategory().getChallenge('challenge-{idx}').completions.value`.
   * Returns 0 before challenges module installs.
   */
  challengeCompletions(idx: 1 | 2 | 3 | 4 | 5): number;
  /**
   * True iff any transcend challenge is currently entered. Canonical
   * `player.currentChallenge.transcension !== 0`. Used by prestige + transcend
   * conversion guards to suppress auto-prestige / auto-transcend during a
   * challenge run (Ch5 in particular crushes gain near zero).
   */
  inTranscensionChallenge(): boolean;
}

/**
 * Transcend challenge definition. Canonical sites:
 * - Definitions: `Challenges.ts:209-236` (challenge1..5 effect coefficients)
 * - i18n strings: `translations/en.json` `challenges.{1..5}.{name,flavor,restrictions,goal}`
 * - baseRequirement: `Variables.ts:121` `challengeBaseRequirements[0..4]`
 * - Auto-completion gate: `Synergism.ts:3407, 3427, 3447, 3467, 3487` —
 *   continuous goal-met-on-tick (`coins >= challengeRequirement(i, completions)`),
 *   independent of transcending. Engine `goal + registerTick` matches semantics.
 * - Per-completion ECC reward magnitudes: `Challenges.ts:223-255` per-challenge
 *   `current{1,2,3}` display values.
 *
 * Restriction shapes (full-fidelity port; some routes flagged TODO(expansion)):
 * - Ch1: multiplierPower = 1; acceleratorEffect reads totalAccelerator + totalMultiplier.
 *   Algebraic neutralization via two `restricts` Grants — see comment in
 *   `data/challenges.ts`.
 * - Ch2: pure multiplicative — multiplierPower → 1.25, acceleratorPower → 1.
 * - Ch3: pure multiplicative — acceleratorPower above 1 reduced 50%; mythos /
 *   crystal shard production halted.
 * - Ch4: cost-side restriction — Accelerator + Multiplier costs inflate
 *   super-exponentially past 1000 purchases (canonical `1.25^(n - 1000)`).
 *   Coin / diamond producer cost inflation is `TODO(expansion)` — engine
 *   `createProducerCategory.purchase.costScaling` is static numeric.
 * - Ch5: cross-tier exponent crush — prestigePow → 0.01/(1+completions),
 *   transcendPow → 0.001 while active. Coordinated with the deferred-from-leaf-5
 *   in-challenge transcend guard on prestige + transcend conversions.
 */
export interface ScalerChallengeDef {
  /** Stable id, matching the canonical 1-indexed slot (`'challenge-1'`..`'challenge-5'`). */
  id: 'challenge-1' | 'challenge-2' | 'challenge-3' | 'challenge-4' | 'challenge-5';
  /** Canonical 1-indexed challenge slot. Indexes `challengeBaseRequirements` and `current{1,2,3}` arms. */
  index: 1 | 2 | 3 | 4 | 5;
  name: string;
  flavor: string;
  /** Free-form restriction summary (lifted from canonical i18n `challenges.N.restrictions`). */
  restrictions: string;
  /** Canonical first-arc cap, 25 (`getMaxChallenges(i ≤ 5)` baseline). */
  completionLimit: number;
}

/**
 * First-arc achievement group ids per `Achievements.ts:2479+ groupedAchievementData`.
 * Filtered to groups whose `displayCondition` resolves true at default state with
 * `prestigeCount > 0` or `transcendCount > 0` (`hasResetAtOrAboveLevel` of
 * `prestige` / `transcension`). Reincarnation+ groups are excluded; rows from
 * canonical groups outside this set port as fork-extension territory.
 *
 * The literal `'ungrouped'` slot is the canonical receipt for ungrouped rows
 * (`Achievements.ts:2685+ ungroupedAchievementData`).
 */
export type AchievementGroupId =
  | 'firstOwnedCoin'
  | 'secondOwnedCoin'
  | 'thirdOwnedCoin'
  | 'fourthOwnedCoin'
  | 'fifthOwnedCoin'
  | 'prestigeCount'
  | 'prestigePointGain'
  | 'accelerators'
  | 'multipliers'
  | 'acceleratorBoosts'
  | 'transcensionCount'
  | 'transcendPointGain'
  | 'challenge1'
  | 'challenge2'
  | 'challenge3'
  | 'challenge4'
  | 'challenge5'
  | 'ungrouped';

/**
 * First-arc achievement definition. Canonical sites:
 * - Row array: `Achievements.ts:516-2479` (`achievements: Achievement[]`).
 * - Grouped definitions: `Achievements.ts:3077+ groupedAchievementData`.
 * - Ungrouped definitions: `Achievements.ts:3360+ ungroupedAchievementData`
 *   (filtered to those whose `displayCondition` resolves at prestige/
 *   transcension reset levels).
 *
 * Per spec § 5: predicate flip awards the achievement, binds its grants into
 * the relevant rateChain(s), and contributes `pointValue` into the global AP
 * curve. Achievement state is not in any `resetModules` and persists across
 * all first-arc resets without explicit `keep:`.
 */
export interface AchievementDef {
  /** Stable id, lifted from canonical `Achievement[]` row index (e.g. `'ach-1'`). */
  id: string;
  /** Display name. Lifted from canonical `i18next` keys at first-arc port. */
  name: string;
  /** Display description. */
  description: string;
  /** Canonical group slot (`'ungrouped'` for the loose-set rows). */
  group: AchievementGroupId;
  /** Tier whose rateChain receives multiplicative grants. Derived from the group's reset level. */
  tier: Tier;
  /** Achievement points awarded on earn — fold into the global AP curve. */
  pointValue: number;
  /** Hide tile until earned. */
  hidden?: boolean;
  /**
   * Predicate over typed game state. Vue `watch` auto-completes the
   * achievement when this transitions to `true`.
   */
  requirement: (state: ScalerGameState) => boolean;
  /**
   * Grants applied while the achievement is earned. Multiplier grants bind
   * into producer rateChain(s); counter grants contribute additively to the
   * named free-X chains. Closures over `ScalerGameState` re-evaluate live.
   */
  effects: UpgradeGrant[];
}

/** Aggregate type for the archetype's data tree, consumed by `boot.ts`. */
export interface ScalerData {
  producers: {
    coin: ProducerDef[];
    prestige: ProducerDef[];
    transcend: ProducerDef[];
  };
  cumulativeUpgrades: {
    accelerator: CumulativeUpgradeDef;
    multiplier: CumulativeUpgradeDef;
  };
  upgrades: {
    coin: UpgradeDef[];
    prestige: UpgradeDef[];
    transcend: UpgradeDef[];
  };
  crystalUpgrades: CrystalUpgradeDef[];
  challenges: ScalerChallengeDef[];
  achievements: AchievementDef[];
}
