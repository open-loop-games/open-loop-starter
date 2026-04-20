import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Definition interfaces shared across all data files. Editing these shapes
// forks the archetype; tuning happens against the balance constants in the
// per-entity data files.
//
// Six structural-fork toggles live on `AutoBattlerProgression`:
//   gridMode          — '2d-hex' (Dota Auto Chess origin) vs '2d-rect' (TFT
//                       / Underlords / Teamfight Manager / Mechabellum) vs
//                       '1d-slot' (Super Auto Pets degenerate).
//   poolMode          — 'shared' (DAC / TFT / Underlords — competitive
//                       acquisition from one pool) vs 'private' (SAP /
//                       Mechabellum — per-player independent shops).
//   combatMode        — 'pvp' (default) vs 'pve' (Hadean Tactics / Dragon
//                       Cliff scripted encounters) vs 'hybrid' (DAC's PvE
//                       creep interrupts; Mechabellum campaign).
//   combineMode       — 'three-tier' (3→2star, 3→3star; DAC / TFT / SAP) vs
//                       'two-tier' (cap at 2-star; Auto Gladiators) vs
//                       'flat' (no combine-up; boundary case).
//   acquisitionMode   — 'shop' (default) vs 'deck-draw' (Storybook Brawl) vs
//                       'hybrid-shop-draw' (The Bazaar).
//   prestigeMode      — 'none' (single match) vs 'run-reset' (trophy /
//                       rank persistence) vs 'continuous-accumulator' (SAP
//                       trophies through wins + losses) vs 'campaign' (node-
//                       map persistent unlocks; Hadean Tactics).

export type GridMode = '2d-hex' | '2d-rect' | '1d-slot';

export type PoolMode = 'shared' | 'private';

export type CombatMode = 'pvp' | 'pve' | 'hybrid';

export type InterestMode = 'standard' | 'streak-bonuses' | 'none';

export type CombineMode = 'three-tier' | 'two-tier' | 'flat';

export type PrestigeMode = 'none' | 'run-reset' | 'continuous-accumulator' | 'campaign';

export type AcquisitionMode = 'shop' | 'deck-draw' | 'hybrid-shop-draw';

export type AbilityTrigger =
  | 'on-attack'
  | 'on-hurt'
  | 'on-kill'
  | 'on-friend-summoned'
  | 'on-sell'
  | 'at-round-start';

export type AbilityTarget =
  | 'self'
  | 'friend-ahead'
  | 'friend-behind'
  | 'random-friend'
  | 'random-enemy'
  | 'all-friends'
  | 'all-enemies';

export interface UnitStats {
  hp: DecimalSource;
  attackDamage: DecimalSource;
  /** Attacks per second. */
  attackSpeed: DecimalSource;
  /** Mana / cooldown required to fire ability. */
  abilityCost?: DecimalSource;
  /** Cells (grid units). */
  range?: number;
}

export interface UnitAbility {
  trigger: AbilityTrigger;
  effect: {
    damage?: DecimalSource;
    heal?: DecimalSource;
    /** Unit ID summoned on trigger. */
    summon?: string;
    buff?: Partial<UnitStats>;
  };
  target?: AbilityTarget;
}

export interface CombineRule {
  /** Copies-to-star-2. Typically 3. */
  copiesToStar2: number;
  /** Star-2-copies-to-star-3. Typically 3. */
  starsToStar3: number;
  /**
   * Per-star damage / HP multiplier. Length 3. Canonical: [1.0, 2.0, 3.5].
   */
  starMultiplier: DecimalSource[];
}

export interface UnitDef {
  id: string;
  name: string;
  /** Shop tier 1–6. Determines pool weighting and cost. */
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  /** Pool cost in gold at purchase (typically = tier). */
  baseCost: DecimalSource;
  /** Species / class / trait tags — each unit carries 1–3 tags. */
  tags: string[];
  baseStats: UnitStats;
  ability?: UnitAbility;
  combineRule?: CombineRule;
}

export interface SynergyThreshold {
  /** Activation count (e.g., 2, 4, 6). */
  count: number;
  /** Effect applied to all units carrying this tag at this threshold. */
  effect: {
    damageMul?: DecimalSource;
    hpMul?: DecimalSource;
    armor?: DecimalSource;
    attackSpeedMul?: DecimalSource;
  };
  /** Optional unique effect applied to all friendly units. */
  globalEffect?: {
    damageMul?: DecimalSource;
    hpMul?: DecimalSource;
  };
}

export interface SynergyDef {
  tag: string;
  /** Thresholds sorted ascending by count. */
  thresholds: SynergyThreshold[];
}

export interface ShopConfig {
  /** Shop offer count per round by shop tier. Length = max shop tier. */
  slotsPerTier: number[];
  /** Base reroll cost (constant in most variants). */
  rerollCost: DecimalSource;
  /** Within-round reroll escalation, if any (Backpack Battles: [1, 2, 3]). */
  rerollCostSchedule?: DecimalSource[];
  /** Sell-back value as fraction of purchase price + per-star-tier bonus. */
  sellValueFraction: DecimalSource;
  sellStarBonus: DecimalSource;
  /** XP required to reach player-level N (level-up cost schedule). */
  levelUpXpGates: number[];
  /** Pool depth by unit tier. Ignored when poolMode === 'private'. */
  sharedPoolDepthByTier?: number[];
}

export interface InterestConfig {
  mode: InterestMode;
  /** Interest rate: +1 gold per N gold held; ignored when mode === 'none'. */
  goldPerInterestUnit: DecimalSource;
  /** Max interest per round. */
  cap: DecimalSource;
  /** Win-streak bonus schedule; only when mode === 'streak-bonuses'. */
  winStreakSchedule?: DecimalSource[];
  lossStreakSchedule?: DecimalSource[];
}

export interface RoundEscalation {
  /** Round-indexed HP-damage-on-loss curve. Length = max match round count. */
  hpDamagePerRound: DecimalSource[];
  /** Per-round base gold income (before interest). */
  goldPerRound: DecimalSource[];
  startingHp: DecimalSource;
  startingGold: DecimalSource;
  /** Round-type schedule — PvE / PvP / boss flags per round. */
  roundTypeSchedule: Array<{
    round: number;
    type: 'pve' | 'pvp' | 'boss';
  }>;
  /** Prep-phase duration in seconds. Typically 30. */
  prepDurationSec: DecimalSource;
  /** Combat-phase soft cap — combat ends if elapsed without winner. */
  combatSoftCapSec: DecimalSource;
}

export interface AutoBattlerBalance {
  /** Star-tier multiplier curve. Default [1.0, 2.0, 3.5]. */
  starMultiplier: DecimalSource[];
  /** Max player level. Gates the field-limit unit count. Canonical: 10. */
  maxPlayerLevel: number;
  /** Max shop tier. Canonical: 6. */
  maxShopTier: number;
  /** Shop-tier unlock schedule by player-level. */
  shopTierUnlockLevel: number[];
  /** Elimination HP threshold. Typically 0. */
  eliminationHp: DecimalSource;
}

export interface AutoBattlerProgression {
  gridMode: GridMode;
  poolMode: PoolMode;
  combatMode: CombatMode;
  combineMode: CombineMode;
  acquisitionMode: AcquisitionMode;
  prestigeMode: PrestigeMode;
  /** 0 when prestigeMode === 'none'. */
  metaUnlockNodeCount: number;
  /** 1 when fork ships without hero selection. */
  heroCount: number;
}

export interface AutoBattlerData {
  units: UnitDef[];
  synergies: SynergyDef[];
  shop: ShopConfig;
  interest: InterestConfig;
  rounds: RoundEscalation;
  progression: AutoBattlerProgression;
  balance: AutoBattlerBalance;
}
