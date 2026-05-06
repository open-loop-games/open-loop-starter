import type { DecimalSource, Gate } from 'open-loop-engine';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Definition interfaces shared across all scaler data files. Editing these
// shapes forks the archetype; tuning happens against the per-tier data files
// and the balance constants below. Mirrors `producer/data/types.ts` adapted
// for 3-tier scaler structure.

export type Tier = 'antimatter' | 'prestige' | 'transcend';

export type ProducerPosition = 1 | 2 | 3 | 4 | 5;

/**
 * Per-tier producer. Synergism slim-slice uses 5 producers per tier with
 * cascading production (producer N feeds producer N-1's generation).
 *
 * - Antimatter producers cost `coins`, generate intermediate coin tiers.
 * - Prestige (Diamonds) producers cost `prestigePoints`, generate
 *   `prestigeShards` cascading down the diamond ladder.
 * - Transcend (Mythos) producers cost `transcendPoints`, generate
 *   `transcendShards` cascading down the mythos ladder.
 */
export interface ProducerDef {
  id: string;
  name: string;
  tier: Tier;
  position: ProducerPosition;
  baseCost: DecimalSource;
}

/**
 * Antimatter tier upgrade — Synergism's Accelerator and Multiplier.
 * Cumulative-buy: each purchase increases `bought` count and the running
 * cost; the rate-effect compounds against the count. See `Buy.ts:26`
 * (getCostAccelerator) + `Buy.ts:156` (getCostMultiplier).
 */
export interface AntimatterUpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Initial cost in `coins`. */
  baseCost: DecimalSource;
}

/**
 * Prestige tier crystal upgrade — Synergism's `crystalUpgrades[0..7]`.
 * Quadratic cost on `log10(prestigeShards)`: cost rises as a function of
 * the upgrade level, so each subsequent purchase is more expensive than the
 * last by a level-dependent factor. See `Buy.ts:657` (calculateCrystalBuy).
 */
export interface CrystalUpgradeDef {
  id: string;
  name: string;
  description: string;
  position: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** Synergism `G.crystalUpgradesCost[u]` — log10 of starting cost. */
  baseLogCost: number;
  /** Synergism `G.crystalUpgradeCostIncrement[u]` — quadratic coefficient. */
  costIncrement: number;
}

/**
 * Transcend tier upgrade — Synergism's Accelerator Boost (costs
 * prestigePoints, layered cost source) plus a slim-slice subset of named
 * `buyUpgrades` entries gated on transcendPoints.
 */
export interface TranscendUpgradeDef {
  id: string;
  name: string;
  description: string;
  baseCost: DecimalSource;
  /** Layered-cost shape: Acc Boost costs prestigePoints despite living at
   * Transcend tier. See `Reset.ts:498-499`, `Buy.ts:705`. */
  costCurrency: 'prestigePoints' | 'transcendPoints';
}

/**
 * Transcend-tier challenge — Synergism's `challengecompletions[1..5]`.
 * Active during a Transcend run; nerfs production / cost / available
 * mechanics; completion grants a stacking multiplier feeding the headline
 * chain via Synergism's `CalcECC` formula (`Challenges.ts:541`).
 */
export interface ChallengeDef {
  id: string;
  name: string;
  position: 1 | 2 | 3 | 4 | 5;
  /** Player-facing description of the in-challenge nerf. */
  effect: string;
  /** Player-facing description of the completion reward. */
  reward: string;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** Tier that unlocks this achievement; informs visibility / grouping. */
  tier: Tier;
  hidden?: boolean;
  /**
   * Engine-typed declarative requirement. Aggregate predicates (own all
   * five challenges, etc.) compose via `all`/`any` Gate combinators at
   * content-authoring time using the structural ID lists in `data/`.
   * Predictor reads this directly via `timeUntilGateFlip` for the
   * cumulative/resource-bearing kinds; opaque-predicate kinds (count-gte,
   * unlock) flush imperatively when the underlying category fires.
   */
  requirement: Gate;
  /** Headline-chain multiplicative reward. Defaults to
   * `balance.achievementMultiplier`. */
  rewardMultiplier?: DecimalSource;
}

/**
 * Cross-tier balance constants. Per-tier numeric anchors live in their
 * tier's data file; this shape only holds the cross-cutting knobs.
 */
export interface ScalerBalance {
  /** Synergism `Calculate.ts:2454` — log10 base for prestigePoints
   * conversion: `prestigePoints += floor(log_{1e25}(coins+1))` per
   * production tick when accumulating from coins. */
  prestigeConversionLog: number;
  /** Synergism `Calculate.ts:2460` — log10 base for transcendPoints
   * conversion: `transcendPoints += floor(log_{10}(prestigeShards+1))`. */
  transcendConversionLog: number;
  /** Default per-achievement multiplicative grant into the headline chain. */
  achievementMultiplier: DecimalSource;
  /** Default per-challenge-completion multiplicative grant (Synergism's
   * `CalcECC` linear-then-softcap at N completions). */
  challengeCompletionMultiplier: DecimalSource;
}

/**
 * Per-tier content payload. Exported by each tier's data file
 * (antimatter.ts / prestige.ts / transcend.ts) and gathered in index.ts.
 */
export interface AntimatterTierData {
  producers: ProducerDef[];
  upgrades: AntimatterUpgradeDef[];
}

export interface PrestigeTierData {
  producers: ProducerDef[];
  crystalUpgrades: CrystalUpgradeDef[];
}

export interface TranscendTierData {
  producers: ProducerDef[];
  upgrades: TranscendUpgradeDef[];
  challenges: ChallengeDef[];
}

/**
 * Aggregate data shape. `DEFAULT_SCALER_DATA` (in `index.ts`) is the
 * authored slim-port; `applyScalerOverrides` shallow-merges balance
 * tweaks on top.
 */
export interface ScalerData {
  antimatter: AntimatterTierData;
  prestige: PrestigeTierData;
  transcend: TranscendTierData;
  achievements: AchievementDef[];
  balance: ScalerBalance;
}
