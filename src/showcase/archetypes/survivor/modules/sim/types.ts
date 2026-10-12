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
  /**
   * HP this body arrived with. Retained so damage already spent on it can be
   * told apart from damage that produced a kill — a body that leaves the floor
   * wounded took `spawnHp - hp` of effective damage that converted to nothing.
   * See `ArenaStats.damageWasted`.
   */
  spawnHp: number;
  /** Sim-time this body arrived. Drives dwell — see `./step.ts` § despawn. */
  spawnedAt: number;
  /**
   * Whether this body has ever been inside `killRadius`. Splits realized
   * engagement into its two halves — see `ArenaStats.reached`.
   */
  reached: boolean;
}

export interface Mote extends Vec2 {
  id: number;
  value: number;
  /** Sim-time the mote was dropped. Motes stay on the floor; this is for readouts. */
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
  /** Bodies put on the floor. Nothing blocks this — see `./step.ts` § spawn. */
  spawned: number;
  /**
   * Bodies that were ever inside `killRadius`, counted once each.
   *
   * `engage` is DEFINED as the share of spawns brought inside `r_kill`
   * (`../../data/arena.ts` § Density) and was measured as `kills / spawned`,
   * which is that share ONLY IF everything brought in dies. Two different
   * failures wear that one number: a seat that never brings bodies into range,
   * and a seat that brings them in and cannot kill them before they dwell out.
   * `reached / spawned` is the movement half; `kills / reached` is the other.
   */
  reached: number;
  /**
   * Effective damage that produced a kill — summed `spawnHp` over dead bodies.
   *
   * Paired with `damageWasted` below, this splits delivered damage by what it
   * PURCHASED rather than by which device delivered it. `DeviceStat.damage`
   * cannot answer that: it is already overkill-clamped, so it counts damage that
   * landed, and damage landing on a body that then walks away looks identical to
   * damage landing on one that dies.
   */
  damageConverted: number;
  /**
   * Effective damage spent on bodies that left the floor alive — summed
   * `spawnHp - hp` over everything the despawn filter drops wounded.
   *
   * The quantity `kills / reached` hides: a seat can bring bodies into range,
   * hurt all of them, and kill none, and every counter except this one reads
   * that as engagement. Bodies still standing at run end are NOT counted here —
   * they have not finished, and a probe reads them off the live array.
   */
  damageWasted: number;
  /** Wounded bodies that left the floor alive. The `damageWasted` denominator. */
  bodiesWasted: number;
  /**
   * Damage dealt past a target's remaining HP — the other way output fails to
   * become kills, and the one any change to target selection trades against
   * `damageWasted`. Tracked separately because it is invisible in the
   * converted/wasted split: both count effective damage only, so a shape
   * emptying activations into nearly-dead bodies reads as perfectly efficient
   * there. See `../../BALANCING.md` § Couplings for the measured exchange rate.
   */
  damageOverkill: number;
  /**
   * Sim-time of the first contact damage, or `null` if the run was never
   * touched.
   *
   * Survival is measured here by when the run ENDED, which is a single number
   * arriving after every decision that produced it. A seat whose whole thesis is
   * positioning — "never be where it is" — is not described by that: it can be
   * grazed at 0:30 and still last to 25:00 on a deep HP pool, and it can go
   * untouched for ten minutes and then be caught once. Those are different seats
   * and the end time calls them the same.
   */
  firstDamageAt: number | null;
  /**
   * Sim-time the operator first fell below each of `HP_MILESTONES`, or `null`
   * for milestones never reached. Parallel to that array by index.
   *
   * The attrition CURVE rather than its endpoint: how long the operator stayed
   * untouched, then whole, then healthy. A seat that gives up its pool in one
   * late collapse and one that bleeds from the opening reach the same floor.
   */
  hpMilestoneAt: (number | null)[];
}

/**
 * Fractions of max HP the attrition timeline records crossings for.
 *
 * Front-loaded on purpose. The interesting part of a positioning seat's run is
 * the top of the bar — being at 95% says the automated player is holding its distance,
 * where everything below 50% is just the ending arriving.
 */
export const HP_MILESTONES = [0.95, 0.9, 0.75, 0.5] as const;

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
 * Everything the step needs that is not state: the seat's authored policy parameters, the
 * derived multipliers a run has accumulated, and the injected RNG.
 *
 * Passed in rather than read from module scope so a probe can sweep it and the
 * live tick can hand over exactly what the player's run has earned.
 */
export interface ArenaParams {
  /** Seat authored parameters — `SeatDef` fields the sim actually consumes. */
  engage: number;
  eta: number;
  speedMul: number;
  dpsMul: number;
  toughnessMul: number;
  /** Lifetime survival multiplier (`meta.ts` `maxRunBaseline('survival')`). */
  metaSurvival: number;
  /** Lifetime income multiplier. Scales collect radius and mote value. */
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
