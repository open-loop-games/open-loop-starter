// ─── Skeleton ───
// Tactical-sim config — the continuous 2D field, the base, and the unit roster.
// Pure config; the module (`modules/tactical-sim.ts`) owns the Side-keyed
// geometry so this layer stays free of module imports (data → modules is
// one-way).

export interface UnitTypeDef {
  /** Health; unit is removed at hp ≤ 0. */
  hp: number;
  /** Damage per attack. */
  damage: number;
  /** Distance within which it can attack a target. */
  attackRange: number;
  /** Distance within which it will break off toward an enemy unit rather than
   *  advancing on the enemy base. */
  aggroRange: number;
  /** Field units per game-second. */
  speed: number;
  /** Seconds between attacks. */
  attackCooldownSec: number;
  /** Supply cost to spawn. */
  cost: number;
}

/** Continuous play-field extent (field units, not pixels — the renderer scales). */
export const FIELD = { width: 100, height: 40 } as const;

/** Base health; a side loses when its base reaches 0. */
export const BASE_HP = 100;

/** Supply accrued per side per game-second — the spawn economy (placeholder;
 *  the economy bone formalizes this). */
export const SUPPLY_RATE = 10;

// ─── Balance ───
// One unit type for the first cut — enough to exercise move / target / attack /
// die. Multiple types + a counter-matrix are a later bone (tug seed carries the
// shape). Numbers are crude-but-decisive placeholders so bot-vs-bot converges to
// a base kill inside the time limit; the real spine arrives with the economy /
// counter bones. Kept here so the lens → probe → lock pipeline has a home.
export const TROOPER: UnitTypeDef = {
  hp: 10,
  damage: 3,
  attackRange: 3,
  aggroRange: 12,
  speed: 8,
  attackCooldownSec: 0.5,
  cost: 10,
};
