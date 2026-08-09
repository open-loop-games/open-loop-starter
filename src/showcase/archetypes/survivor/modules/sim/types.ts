/**
 * Arena sim state — the continuous, real-time half of Survivor.
 *
 * Real-time entity combat is deliberately absent from the engine
 * (`open-loop-engine/docs/api/INDEX.md`: "combat resolution stays consumer-side"),
 * so this is sanctioned consumer code rather than a bypass. What the engine does
 * supply, and what `../arena.ts` uses, is the spatial layer underneath it.
 *
 * Everything here is plain data with no Vue and no engine imports, because
 * `stepArena` has to be callable identically by the live tick and by a headless
 * probe — the graduated shared-pure-state-function discipline. A reactive proxy
 * in this state would also make the per-tick entity loops far more expensive than
 * they need to be.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Specimen extends Vec2 {
  id: number;
  /** `SpecimenDef.id` from `../../data/specimens`. */
  tierId: string;
  hp: number;
  speed: number;
  /** Cached from the def × the run curves, so the step loop does no lookups. */
  contactDamage: number;
  moteYield: number;
}

export interface Mote extends Vec2 {
  id: number;
  value: number;
  /** Sim-time the mote was dropped. Motes persist; this is for readouts. */
  droppedAt: number;
}

/**
 * A collector pickup — the rare drop that banks the whole field at once.
 *
 * A separate entity rather than an instant effect because routing to it THROUGH
 * your own uncollected field is the decision it exists to create
 * (`../../IDENTITY.md`): it sits where the specimen died, and the walk to it is
 * paid for in contact.
 */
export interface Collector extends Vec2 {
  id: number;
  /** Sim-time it dropped, for the renderer's edge arrow and fade-in. */
  droppedAt: number;
}

/** One installed device's live rotation state. */
export interface DeviceRuntime {
  /** `DeviceDef.id` from `../../data/devices`. */
  defId: string;
  level: number;
  /** Seconds until the next activation. Counts down; re-arms on fire. */
  timer: number;
  /** Set once the device has recombined; changes damage and cadence. */
  evolutionId?: string;
}

export interface OperatorState extends Vec2 {
  hp: number;
  maxHp: number;
  /** Last heading actually taken, kept so steering can penalise thrashing. */
  heading: Vec2;
}

/**
 * Per-device dispatch accounting, keyed by `DeviceDef.id`.
 *
 * Aggregate kills cannot say whether a device is pulling its weight, and the
 * shapes fail in different ways: a `cone` loses targets it could reach to the
 * heading it is not facing, while a `pulse` only ever loses them to `maxTargets`.
 * `reachable` versus `hits` separates those two — it is the count of specimens
 * inside reach at fire time, BEFORE the shape filter and the cap, so the ratio is
 * the shape's capture rate rather than a damage number wearing one.
 */
export interface DeviceStat {
  /** Activations, counting each catch-up fire within one tick. */
  fires: number;
  /** Fires whose shape filter left at least one target. `fires - this` whiffed. */
  firesConnected: number;
  /** Specimens inside reach at fire time, summed — the denominator for capture. */
  reachable: number;
  /** Specimens actually affected, summed — after shape filter and `maxTargets`. */
  hits: number;
  /** Killing blows credited to this device. */
  kills: number;
  /** Effective damage, overkill clamped to the target's remaining hp. */
  damage: number;
}

/** Counters the probes read. Cheap to maintain, and the only run readout. */
export interface ArenaStats {
  kills: number;
  motesDropped: number;
  motesBanked: number;
  /** Motes banked BY a collector pull. A subset of `motesBanked`, not a peer. */
  motesCollectedByCollector: number;
  /** Collector pickups actually taken this run. */
  collectorsTaken: number;
  /** Seconds spent inside contact range. The damage-taken integral's driver. */
  contactSeconds: number;
  damageTaken: number;
  /** Per-device dispatch accounting, lazily keyed by `DeviceDef.id`. */
  devices: Record<string, DeviceStat>;
}

export interface ArenaState {
  /** Run-elapsed sim seconds. */
  time: number;
  operator: OperatorState;
  specimens: Specimen[];
  motes: Mote[];
  /** Collector pickups currently on the floor. Rarely more than one. */
  collectors: Collector[];
  /**
   * Rolled drop times for this run's collectors, ascending, consumed in order.
   * Rolled once at run start so the schedule is fixed by the seed rather than
   * re-rolled per kill — a hazard that re-rolls has no expected count.
   */
  collectorTimes: number[];
  /** How many of `collectorTimes` have already dropped. */
  collectorsDropped: number;
  devices: DeviceRuntime[];
  /** Reagent id → stacks. The draft writes it; the modifier chains read it. */
  reagentStacks: Map<string, number>;
  stats: ArenaStats;
  /** Monotonic entity id source. */
  nextId: number;
  /** Fractional spawn carry, so a sub-one spawn rate still spawns. */
  spawnCarry: number;
}

/**
 * Everything the step needs that is not state: the seat's policy dials, the
 * derived multipliers a run has accumulated, and the injected RNG.
 *
 * Passed in rather than read from module scope so a probe can sweep it and the
 * live tick can hand over exactly what the player's run has earned.
 */
export interface ArenaParams {
  /** Seat dials — `SeatDef` fields the sim actually consumes. */
  engage: number;
  eta: number;
  speedMul: number;
  dpsMul: number;
  toughnessMul: number;
  /** Cross-run survival multiplier (`meta.ts` `maxRunBaseline('survival')`). */
  metaSurvival: number;
  /** Cross-run income multiplier. Scales collect radius and mote value. */
  metaCollect: number;
  metaYield: number;
  /** Seeded, injected — never `Math.random`, so a run is reproducible. */
  random: () => number;
  /**
   * Direct control, for a player-driven seat. Returns the desired unit heading,
   * or `null` for "nothing held" — which means STAND STILL, not coast.
   *
   * Present only for `driver: 'player'` seats; when it is absent the movement
   * policy runs, and that absence is the whole branch. Reading input through a
   * function rather than a field keeps `stepArena` pure over `(state, params)`:
   * the sim never learns what a keyboard is, exactly as it never learns what a
   * draft is.
   */
  control?: () => Vec2 | null;
}
