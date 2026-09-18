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

/** Base health; a side loses when its base reaches 0. Sized to 50 trooper HP
 *  equivalents so a base requires sustained siege rather than melting on
 *  contact; brings matches nearer the 1.5–2.1m crossover. */
export const BASE_HP = 500;

// ─── Balance ───
// One unit type for the first cut — enough to exercise move / target / attack /
// die. Multiple types + a counter-matrix are a later bone (tug seed carries the
// shape).
//
// `cost` is the army half of the guns-versus-butter split — see `./economy.ts`
// § Balance, which owns the closed form and the `c > unitCost` coupling. This
// number and `workerCost` move together: their ratio is how many troopers a
// worker is worth, and it is the price of every investment decision in the game.
//
// The combat constants are crude-but-decisive placeholders chosen so bot-vs-bot
// converges to a base kill inside the time limit. They are what the attrition
// half of the spine measures rather than projects — `hp/damage/attackCooldownSec`
// set the Lanchester exchange rate, and `speed/aggroRange` set how much of an
// army is in contact at once, which is the term the closed form cannot carry.
export const TROOPER: UnitTypeDef = {
  hp: 10,
  damage: 3,
  attackRange: 3,
  aggroRange: 12,
  speed: 8,
  attackCooldownSec: 0.5,
  cost: 10,
};
