import type { DecimalSource } from '@open-loop/engine';

// 6 unit archetypes; 6×6 counter matrix; 3 income upgrade tiers; 2 spendable
// abilities (artillery + reinforcement); per-side fortress HP; 30 min match
// time limit. These counts are the skeleton baseline; editing any of them
// forks the skeleton, not tunes it.
//
// `archetypeTag` on UnitDef is the engineering tag used to construct the
// counter matrix's rock-paper-scissors+2-axis structure. Runtime matrix
// lookup is index-keyed: `lane.ts` builds a `Map<id, idx>` from the
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
  displayName: string;
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
  displayName: string;
  cost: DecimalSource;
  /** Multiplicative income bonus stacked on top of prior tiers. */
  multiplier: number;
}

/**
 * Fortress definition. Modeled as an immobile unit at each side's lane
 * endpoint — opposing units engage it like any other opposing unit (stop +
 * fight) once within `ENGAGE_RADIUS`. Damage from attacking units is scaled
 * by `resistance` (per attacker `archetypeTag`); fortress return-fire (if
 * `damagePerHit > 0`) bypasses the unit counter-matrix.
 *
 * SC2 Direct Strike variants ship per-archetype-tag resistance and base
 * damage; this shape supports both. The skeleton default is pure damage-
 * sponge (`damagePerHit: 0`, `resistance: {}` — all 1.0); forks toggle into
 * armored/return-fire variants by populating those fields.
 */
export interface FortressDef {
  /** Per-side starting HP. Both fortresses spawn with this value. */
  hp: DecimalSource;
  /** Damage dealt per second to each opposing unit in engagement range.
   *  0 means no return fire — pure damage sponge. */
  damagePerHit: DecimalSource;
  /** Per-archetype-tag damage multiplier applied to incoming damage from
   *  units of that tag. Missing keys default to 1.0 (no resistance).
   *  Mirrors SC2 armor-type / damage-type interaction. */
  resistance: Partial<Record<UnitArchetypeTag, number>>;
}

export type AbilityEffect =
  | { kind: 'artillery'; damage: DecimalSource; radius: number }
  | { kind: 'reinforcement'; archetypeId: string; count: number };

export interface AbilityDef {
  id: string;
  /** Display name (costume). */
  displayName: string;
  cost: DecimalSource;
  /** Cooldown between successive activations, seconds. */
  cooldownSec: number;
  effect: AbilityEffect;
}

/** `counterMatrix[attackerIdx][defenderIdx]` = damage multiplier (data-table lookup, not chain). */
export type CounterMatrix = number[][];

/**
 * Believability calibration bundle. Per `composition-cookbook/
 * parameterized-personality.md` § Believability-calibration discipline:
 * separate from `Persona` because the design semantics differ — personas
 * say *what the AI opponent wants to do*; believability says *how precisely it
 * executes*. Production = 0/0 (deterministic, predictable for the human
 * player); headless-run defaults > 0 break parameterized-vs-parameterized mirror
 * stalemates without manufacturing the answer.
 */
export interface TugBelievability {
  /** Probability per decision of picking second-best instead of optimal.
   *  Cookbook range 0–40%; headless-run default 0.20. */
  suboptimalityRate: number;
  /** ±fraction of multiplicative noise on the cadence threshold. 0 = no
   *  jitter; headless-run default 0.25 (±25% of the persona-scaled cadence). */
  cadenceJitterScale: number;
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
  fortress: FortressDef;
}
