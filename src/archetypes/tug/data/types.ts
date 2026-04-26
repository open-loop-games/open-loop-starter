import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ───
// 6 unit archetypes; 6×6 counter matrix; 3 income upgrade tiers; 2 spendable
// abilities (artillery + reinforcement); per-side fortress HP; 30 min match
// time limit. Cardinality is the skeleton baseline per OL-703 leaf-2 handoff;
// editing any of these counts forks the skeleton, not tunes it.
//
// `archetypeTag` on UnitDef is the engineering tag used to construct the
// counter matrix's rock-paper-scissors+2-axis structure (see § 8). Runtime
// matrix lookup is index-keyed: leaf 3 builds a `Map<id, idx>` from the
// `units: UnitDef[]` order at module construction; the order in `units.ts`
// is therefore load-bearing and must match `counterMatrix` row/column order.

/** Engineering tag fixing each unit's slot in the counter-matrix axes. */
export type UnitArchetypeTag =
  | 'light' // light infantry — fast, low HP, weak to splash
  | 'fast' // fast skirmish — high walk-speed, weak to area
  | 'siege' // siege artillery — splash damage, weak to fast
  | 'air' // air — bypasses ground positioning, weak to anti-air
  | 'capital' // capital ship — high HP/damage, weak to swarms
  | 'special'; // special ability — utility, neutral to most

export interface UnitDef {
  id: string;
  /** Display name (costume). */
  name: string;
  /** Display label for the role column (costume). */
  role: string;
  /** Counter-matrix axis tag — fixes role in the counter cycles. */
  archetypeTag: UnitArchetypeTag;
  cost: DecimalSource;
  /** Seconds between successive sends of this archetype, per side. */
  sendCooldownSec: number;
  damagePerHit: number;
  hp: number;
  /** Lane units per second — front-line drift rate. */
  walkSpeed: number;
  /** Optional refs into `data/abilities.ts`. Empty in skeleton baseline. */
  abilityRefs?: string[];
}

export interface IncomeUpgradeDef {
  id: string;
  /** Display name (costume). */
  name: string;
  cost: DecimalSource;
  /** Multiplicative income bonus stacked on top of prior tiers. */
  multiplier: number;
}

export type AbilityEffect =
  | { kind: 'artillery'; damage: DecimalSource; radius: number }
  | { kind: 'reinforcement'; archetypeId: string; count: number };

export interface AbilityDef {
  id: string;
  /** Display name (costume). */
  label: string;
  cost: DecimalSource;
  /** Cooldown between successive activations, seconds. */
  cooldownSec: number;
  effect: AbilityEffect;
}

/** `counterMatrix[attackerIdx][defenderIdx]` = damage multiplier (data-table lookup, not chain). */
export type CounterMatrix = number[][];

// ─── Balance ───

export interface TugBalance {
  /** Per-side per-second mineral accrual at default income tier. */
  baseIncomeRate: DecimalSource;
  /** Per-side starting fortress HP; match ends when either side hits 0. */
  fortressHp: DecimalSource;
  /** 0 = no time limit (Direct Strike); >0 = score resolution at limit. */
  matchTimeLimitMinutes: number;
  /** 1.0 = symmetric; primary leaf-6 tuning knob. */
  aiIncomeMultiplier: number;
  /** Seconds between AI symmetric-mirror enqueue ticks. */
  aiSendCadenceSec: number;
  /** Cross-match meta-progression layer (faction unlocks, ladder). */
  metaProgressionEnabled: boolean;
  /** Off-map spendable abilities (artillery, reinforcement). */
  spendableAbilitiesEnabled: boolean;
  /** 'pure-routing' (default) = Direct Strike; 'with-placement-grid' = Legion TD 2 hybrid. */
  spatialMode: 'pure-routing' | 'with-placement-grid';
  /** 1 = corpus-typical Direct Strike shape; 2–3 = Warfare 1944 flanks. */
  laneCount: number;
  /** AI policy mode. `'off'` valid only when `matchMode === 'pvp'`. */
  aiOpponentMode: 'symmetric-mirror' | 'counter-aware' | 'off';
  matchMode: 'pvp' | 'pve' | 'campaign';
  /** Length of the unit roster; matrix is `unitArchetypeCount × unitArchetypeCount`. */
  unitArchetypeCount: number;
  /** Length of `incomeUpgrades`. */
  incomeUpgradeTiers: number;
}

// ─── Costume ───
// Theme C SciFi Armada bake; see units.ts and counter-matrix.ts for the
// per-entry costume strings. Faction labels live as a top-level field for
// UI consumers; modules read them off `TugData.theme`.

export interface TugTheme {
  resourceName: { singular: string; plural: string };
  factionNames: [string, string];
  fortressName: string;
}

/**
 * Typed read view of module state, exposed to data-side predicates.
 * Methods encapsulate Decimal comparisons so data files never import the
 * engine runtime. Modules implement helpers over live injection-key refs
 * (per-side fortress HP, sequencer state, counter-pivot tracker).
 */
export interface TugGameState {
  playerFortressHpAtLeast(amount: DecimalSource): boolean;
  aiFortressHpAtLeast(amount: DecimalSource): boolean;
  unitsSentByPlayerAtLeast(archetypeId: string, n: number): boolean;
  counterPivotsThisMatchAtLeast(n: number): boolean;
  factionsUnlockedAtLeast(n: number): boolean;
  matchOutcomeIs(outcome: 'player-win' | 'ai-win' | 'time-limit' | null): boolean;
  /** Sim-time seconds since the active match started. Resets on match boundary. */
  secondsSinceMatchStart(): number;
  /** Cumulative sim-time seconds across the current arc (multi-match). */
  secondsSinceArcStart(): number;
}

export interface TugData {
  units: UnitDef[];
  incomeUpgrades: IncomeUpgradeDef[];
  abilities: AbilityDef[];
  counterMatrix: CounterMatrix;
  balance: TugBalance;
  theme: TugTheme;
}
