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

/** Counters the probes read. Cheap to maintain, and the only run readout. */
export interface ArenaStats {
  kills: number;
  motesDropped: number;
  motesBanked: number;
  motesCollectedByCollector: number;
  /** Seconds spent inside contact range. The damage-taken integral's driver. */
  contactSeconds: number;
  damageTaken: number;
}

export interface ArenaState {
  /** Run-elapsed sim seconds. */
  time: number;
  operator: OperatorState;
  specimens: Specimen[];
  motes: Mote[];
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
