import type { DecimalSource } from '@open-loop/engine';

// 4 tower archetypes (Dart / Tack / Bomb / Ice); 4 bloon types (Red / Blue /
// Green / Yellow) on a 1-HP shedding ladder; 10 rounds; one Monkey-Lane path
// on a 20×15 lane-unit grid. These counts are the arc-1 baseline skeleton;
// editing any of them forks the skeleton, not tunes it.
//
// All numeric constants lift verbatim from
// `open-loop-research/reference-code/bloons-td-1/scripts/` (decompiled AS).
// Time units convert frames → seconds at 30fps at the reader site; lane-unit
// space stays as BTD1's lane units. Wave compositions are scaffolding (verbatim
// from `BloonsTD.as:574+ BuildLevels()`); per-tower/per-bloon stats and the
// economy constants are tunable.

export type TowerId = 'dart' | 'tack' | 'bomb' | 'ice';
export type BloonId = 'red' | 'blue' | 'green' | 'yellow';

export interface TowerDef {
  id: TowerId;
  /** Display name (costume). */
  name: string;
  /** Base purchase cost. */
  baseCost: DecimalSource;
  /** Targeting radius in lane units. */
  rangeLaneUnits: number;
  /** Time between successive shots, in seconds. */
  attackCooldownSec: number;
  /** Projectile travel speed in lane-units per second. 0 = range-only (Ice). */
  projectileSpeedLaneUnitsPerSec: number;
  /** Max bloons a single projectile pops before despawning. */
  pierceMax: number;
  /** Splash radius for AoE on hit, lane units. Bomb only. */
  splashRadiusLaneUnits?: number;
  /** Freeze duration applied to bloons in range, seconds. Ice only. */
  freezeDurationSec?: number;
  /** Number of projectiles in a spread volley. Tack only. */
  volleyCount?: number;
  /** If true, this tower fires `volleyCount` projectiles in a radial spread
   *  rather than a single targeted shot. Tack only. */
  isSpread?: boolean;
}

export interface BloonDef {
  id: BloonId;
  /** BTD1 internal rank; drives lives-on-leak cost (BloonsTD.as:1151). */
  rank: 1 | 2 | 3 | 4;
  /** Walk speed in lane-units per second. */
  speedLaneUnitsPerSec: number;
  /** BTD1 bloons all have 1 HP; the shedding ladder does the work. */
  hp: 1;
  /** Bloon spawned at the same path position when this one pops.
   *  Red → none; Blue → red; Green → blue; Yellow → green. */
  spawnsOnPop?: BloonId;
  /** Whether Ice towers can freeze this bloon. Arc-1 all true; ranks 6+ immune
   *  in later BTD1 content. */
  freezable: boolean;
  /** Money awarded when popped. BTD1 ships flat 1 per pop. */
  moneyOnPop: number;
  /** Lives lost when this bloon reaches the path exit. Equals rank per
   *  BloonsTD.as:1151 ("a blue bloon costs you two lives, a green three"). */
  livesOnLeak: number;
}

export interface WaveStreamSpec {
  bloonId: BloonId;
  count: number;
  /** Delay between successive spawns of THIS stream, in seconds. Hand-derived
   *  from BTD1's per-frame counter+bloonInterval pattern at
   *  `BloonsTD.as:1071-1082`; arc-1 default ~0.5s. Tunable target for the
   *  Phase 5 balance pass once gameplay is observable. */
  spawnIntervalSec: number;
}

export interface WaveDef {
  /** 1-indexed round number; arc 1 covers rounds 1–10. */
  round: number;
  /** Streams run sequentially — stream N+1 starts after stream N's last
   *  spawn. Each `ABSTL(count, level, type)` call in BTD1's `BuildLevels()`
   *  maps to one `WaveStreamSpec`. */
  streams: WaveStreamSpec[];
  /** Money bonus on round clear. BTD1 formula: `101 - round`
   *  (BloonsTD.as:1174-1175). */
  cashReward: DecimalSource;
}

export interface EconomyConfig {
  /** Starting cash at game begin (BloonsTD.as:824 STARTING_MONEY = 650). */
  startingMoney: DecimalSource;
  /** Max lives before defeat (BloonsTD.as:825 MAX_LIVES = 40). */
  maxLives: number;
  /** Sell-back rate: fraction of purchase cost recovered (0–1).
   *  BloonsTD.as:826 SELL_RATE = 0.8. */
  sellRate: number;
  /** Money awarded per bloon pop (BloonsTD.as:1142 = 1). */
  moneyPerPop: number;
}

export interface PathDef {
  /** Ordered [x, y] waypoints in **cell** coordinates on a
   *  `gridWidth × gridHeight` placement grid. Hand-authored approximation
   *  of BTD1 Monkey Lane — the actual BTD1 path lives in SWF MovieClip
   *  animation, not AS source. Integer cell coords feed the Bresenham
   *  path raster; bloon world position interpolates linearly between
   *  waypoints (in pixels — see `cellSizePixels`). */
  waypoints: ReadonlyArray<readonly [number, number]>;
  /** Placement grid width in cells. Tower placement is one-tower-per-cell. */
  gridWidth: number;
  /** Placement grid height in cells. */
  gridHeight: number;
  /** Cell size in BTD1 pixels. The placement grid is a coarse game-feel
   *  abstraction; range / speed / distance arithmetic happens in BTD1
   *  pixel-space so the verbatim source numbers (`towers/<id>/rangeLaneUnits`
   *  = 60–120 px, `bloons/<id>/speedLaneUnitsPerSec`) carry the source's
   *  balance. `gridWidth × cellSizePixels` matches BTD1 stage width
   *  (640 px from SWF DOMDocument.xml); same for height (480 px). */
  cellSizePixels: number;
}

export interface DefenderData {
  towers: TowerDef[];
  bloons: BloonDef[];
  waves: WaveDef[];
  economy: EconomyConfig;
  path: PathDef;
}

/**
 * Typed read view of module state, exposed to data-side predicates. Methods
 * encapsulate Decimal comparisons + injection-key access so data files never
 * import the engine runtime. Modules implement helpers over live refs.
 */
export interface DefenderGameState {
  currentRound(): number;
  moneyAtLeast(amount: DecimalSource): boolean;
  livesAtLeast(n: number): boolean;
  towersPlacedAtLeast(n: number): boolean;
  towersPlacedOfType(towerId: TowerId): number;
  bloonsInFlight(): number;
  matchOutcomeIs(outcome: 'in-progress' | 'victory' | 'defeat' | null): boolean;
  /** Sim-time seconds since the active round started. Resets on round boundary. */
  secondsSinceRoundStart(): number;
  /** Cumulative sim-time seconds across the current arc. */
  secondsSinceArcStart(): number;
}

/** Runtime placed-tower record. Module owns the array via `persistent()`. */
export interface TowerInstance {
  instanceId: string;
  defId: TowerId;
  /** Grid-cell coordinate. */
  cell: { x: number; y: number };
  /** Cooldown countdown, seconds. Reaches 0 → eligible to fire next tick. */
  cooldownRemaining: number;
}

/** Runtime in-flight bloon record. Module owns the array via `persistent()`. */
export interface BloonInstance {
  instanceId: string;
  defId: BloonId;
  /** Distance along path in lane units; 0 = spawn waypoint, pathTotalLength = exit. */
  distanceAlongPath: number;
  /** Frozen-state countdown, seconds. 0 means not frozen. */
  frozenRemainingSec: number;
}
