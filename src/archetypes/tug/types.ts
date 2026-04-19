/**
 * Tug archetype — vars types.
 *
 * The canonical type contract for a Tug-archetype game. Mirrors the vars
 * schema in archetypes/tug.md § 5. Games under src/modules/mods/<game>/vars/
 * implement these interfaces.
 */
import type { DecimalSource } from 'open-loop-engine';

/**
 * Skeleton shape of the Tug game. Forks rarely edit these; diverging here
 * constitutes "forking the skeleton" rather than tuning. `spatialMode` is
 * the most structurally consequential — toggles the Placement-Adjacency
 * secondary axis (Legion TD 2 shape) without changing the Routing-Traversal
 * spine.
 */
export interface TugArchetypeVars {
  /**
   * 'pure-routing' (default): Direct Strike / Age of War / Warfare 1917 shape.
   * 'with-placement-grid': Legion TD 2 shape — adds Placement-Adjacency as a
   * secondary spatial axis. Grid geometry lives in a companion fork config.
   */
  spatialMode: 'pure-routing' | 'with-placement-grid';
  /** Number of parallel lanes. 1 = corpus-typical; 2–3 = Warfare 1944-style flanks. */
  laneCount: number;
  matchMode: 'pvp' | 'pve' | 'campaign';
  /**
   * 'symmetric-mirror' (default): AI income and cooldowns mirror player state.
   * 'counter-aware': AI reads player composition and biases toward counters (fork extension).
   * 'off': valid only when matchMode === 'pvp'.
   */
  aiOpponentMode: 'symmetric-mirror' | 'counter-aware' | 'off';
  /** Number of unit archetypes participating in the counter matrix. 4 minimal; 6–8 corpus-typical. */
  unitArchetypeCount: number;
  /** Cross-match meta-progression (faction unlocks, ladder tiers, campaign missions). */
  metaProgressionEnabled: boolean;
  /** Off-map spendable abilities (artillery, reinforcement). */
  spendableAbilitiesEnabled: boolean;
  /** Number of match-internal income upgrade tiers. */
  incomeUpgradeTiers: number;
}

/**
 * Costume over the skeleton. Zero mechanical impact — faction names, unit
 * names, flavour copy, optional campaign mission titles.
 */
export interface TugThemeVars {
  resourceName: { singular: string; plural: string };
  factionNames: [string, string];
  fortressName: string;
  /** Length must equal TugArchetypeVars.unitArchetypeCount. */
  unitNames: string[];
  /** Counter-matrix role labels shown in the shop UI. Length must equal unitArchetypeCount. */
  unitRoles: string[];
  abilityLabels: { artillery?: string; reinforcement?: string };
  matchEndMessage: { victory: string; defeat: string };
  /** Optional campaign-mission titles when matchMode === 'campaign'. */
  missionTitles?: string[];
}

/**
 * Mechanical overrides — the tuning surface. Beat timing is a function of
 * these values; changes here must be validated against § 6 probe tolerances.
 */
export interface TugBalanceVars {
  baseIncomeRate: DecimalSource;
  /** Upgrade multipliers applied sequentially as each income tier is purchased. Length must equal incomeUpgradeTiers. */
  incomeUpgradeMultipliers: number[];
  /** Cost of each income upgrade tier. Length must equal incomeUpgradeTiers. */
  incomeUpgradeCosts: DecimalSource[];
  /** Per-unit-archetype purchase cost. Length must equal unitArchetypeCount. */
  unitCosts: DecimalSource[];
  /**
   * counterMatrix[attacker][defender] = damage multiplier.
   * Square matrix with side length = unitArchetypeCount. Diagonal 1.0 by convention.
   * Strong counter 1.5–2.0; weak 0.5–0.7; neutral 1.0.
   */
  counterMatrix: number[][];
  fortressHp: DecimalSource;
  sendCooldownSeconds: number;
  /** 0 = no time limit (Direct Strike shape); >0 = score-based resolution when reached. */
  matchTimeLimitMinutes: number;
  /** 1.0 = symmetric; >1 scales AI difficulty. */
  aiIncomeMultiplier: number;
  abilityCosts?: { artillery?: DecimalSource; reinforcement?: DecimalSource };
  /** Match-win thresholds for meta-progression unlocks. Consulted only when metaProgressionEnabled. */
  metaProgressionThresholds?: number[];
}

/**
 * The merged shape a game loads at runtime. `loadTugVars` deep-merges
 * archetype → theme → balance in that order.
 */
export interface TugVars {
  archetype: TugArchetypeVars;
  theme: TugThemeVars;
  balance: TugBalanceVars;
}

/** Deep-partial override shape accepted by `loadTugVars`. */
export type TugVarsOverride = {
  archetype?: Partial<TugArchetypeVars>;
  theme?: Partial<TugThemeVars>;
  balance?: DeepPartial<TugBalanceVars>;
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<U>
      : DeepPartial<T[K]>
    : T[K];
};
