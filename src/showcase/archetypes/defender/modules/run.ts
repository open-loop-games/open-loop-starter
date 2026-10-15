import {
  DIAGONAL_OFFSETS,
  Decimal,
  addResource,
  createSpatialGrid,
  hasResource,
  shallowRef,
  subtractResource,
  type DecimalSource,
  type Resource,
  type SpatialGrid,
} from '@open-loop/engine';
import {
  ARMOUR,
  FORM_VS_ARMOUR,
  MAX_LEVEL,
  REFUND_RATE,
  SPEED_MULT,
  composeWave,
  nightKind,
  levelMultiplier,
  upgradeCost,
  victoryScore,
  waveIncome,
  waveScore,
  wavesIn,
  type Armour,
  type Form,
  type PestKind,
  type PestSpec,
  type PlantId,
  type PlantSpec,
  type PlotDef,
  type SpineAnchors,
} from '../data';

/**
 * One plot run: the board, the route, the plants, the wave in flight.
 *
 * Real-time combat is consumer-side by the engine's own scope (api/INDEX.md
 * § Task → API tier), so movement, targeting and shots are written here over a
 * `SpatialGrid` that owns the board and its routing field. A run is not saved:
 * leaving the page abandons it, as a GemCraft field does.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type Terrain = 'open' | 'stone' | 'gap' | 'seedbed';

export interface Cell {
  terrain: Terrain;
  /** Id of the plant growing here, or null. */
  plantId: number | null;
}

export interface Plant {
  id: number;
  def: PlantId;
  x: number;
  y: number;
  level: number;
  /** Compost sunk into it, for the refund and the value read. */
  spent: number;
  cooldown: number;
}

export interface Pest {
  id: number;
  kind: PestKind;
  /** Continuous position in cell units; a cell's centre is (x + 0.5, y + 0.5). */
  px: number;
  py: number;
  /** Cell it is walking toward. */
  tx: number;
  ty: number;
  hp: number;
  maxHp: number;
  armour: Armour;
  /** A flyer crosses the beds in a straight line, over hedges and stone. */
  flying: boolean;
  /**
   * Damage already in flight toward this pest. A plant's gather skips a pest
   * whose marks cover its HP, so two thrushes do not both spend a shot on one
   * kill. Minted when a shot is fired, released when it lands or its target dies.
   */
  incoming: number;
  speed: number;
  bounty: number;
  leak: number;
  alive: boolean;
}

export interface Shot {
  id: number;
  plantId: number;
  /** Target pest for a homing shot; null for a release aimed at a point. */
  targetId: number | null;
  px: number;
  py: number;
  /** Fixed aim point for a release. */
  ax: number;
  ay: number;
  /** Damage before the target's armour. */
  damage: number;
  form: Form;
  speed: number;
  splash: number;
  /** Whether this shot minted a reservation mark that its landing must release. */
  marked: boolean;
}

/** `held`: the last night is seen off and the run waits for the gardener: call it a night, or go on into the dark. */
export type RunPhase = 'build' | 'wave' | 'held' | 'won' | 'lost';

/** One night ahead: the kind it sends and the pests it is composed of. */
export interface Night {
  wave: number;
  kind: PestKind;
  pests: PestSpec[];
}

export type RunEvent =
  | { type: 'build'; wave: number }
  | { type: 'launch'; wave: number; early: boolean; bonus: number }
  | { type: 'cleared'; wave: number; leaks: number; score: number }
  | { type: 'held'; score: number }
  | { type: 'leak'; wave: number; kind: PestKind; seedlings: number }
  | { type: 'planted'; def: PlantId; x: number; y: number }
  | { type: 'upgraded'; def: PlantId; level: number }
  | { type: 'dug-up'; def: PlantId; refund: number }
  | { type: 'end'; outcome: 'won' | 'lost'; score: number };

/** What a wave did, for the probe's spine diff. */
export interface WaveLog {
  wave: number;
  /** Compost planted on the board when the wave launched. */
  boardValue: number;
  /** Compost held when the wave launched. */
  heldCompost: number;
  /** Route length gap → seedbed, in cells, at launch. */
  pathLength: number;
  pests: number;
  /** Effective HP at baseline speed, the quantity the spine sizes (Σ hp × speed ratio). */
  hpPool: number;
  /** Mean fraction of the route a pest had walked when it was seen off. */
  killDepth: number;
  kills: number;
  leaks: number;
  damageDealt: number;
  /** Shots skipped because marks already covered every pest in range. */
  reservedSkips: number;
  /** Σ damage per second of the hunting plants at launch, all multipliers in. */
  dps: number;
  /** Fraction of hunting-plant time spent with a pest in range. */
  utilization: number;
  /** Mean seconds a baseline-speed pest walking the route spends inside one hunting plant's range. */
  exposure: number;
  duration: number;
}

export interface RunParams {
  anchors: SpineAnchors;
  specs: Record<PlantId, PlantSpec>;
  /** The almanac and everything else on the shared damage chain. */
  damageMult: () => number;
  /** Additive reach bonus for hunting plants. */
  rangeBonus: () => number;
  /** Multiplier on what calling it a day pays. */
  earlyCallMult: () => number;
  isUnlocked: (id: PlantId) => boolean;
}

// ─── Board ──────────────────────────────────────────────────────────────────

function parseMap(def: PlotDef) {
  const height = def.map.length;
  const width = def.map[0].length;
  let gap = { x: 0, y: 0 };
  let seedbed = { x: 0, y: 0 };
  const grid = createSpatialGrid<Cell>({
    width,
    height,
    initializer: (x, y) => {
      const ch = def.map[y][x];
      if (ch === 'S') gap = { x, y };
      if (ch === 'G') seedbed = { x, y };
      const terrain: Terrain =
        ch === '#' ? 'stone' : ch === 'S' ? 'gap' : ch === 'G' ? 'seedbed' : 'open';
      return { terrain, plantId: null };
    },
  });
  return { grid, gap, seedbed };
}

/** Cost to enter a cell for routing: stone and plants block. */
function routeCost(cell: Cell): number {
  return cell.terrain === 'stone' || cell.plantId !== null ? Infinity : 1;
}

/** The board as the companion evaluator reads it. */
export interface CompanionView {
  plants(): Iterable<Plant>;
  /** The plant growing in a cell, or null. */
  plantAt(x: number, y: number): Plant | null;
  /** The cells a plant in this cell touches: its 8-ring, inside the board. */
  touching(x: number, y: number): Iterable<{ x: number; y: number }>;
}

/** The live board as a companion view. */
export function companionView(
  grid: SpatialGrid<Cell>,
  plants: ReadonlyMap<number, Plant>,
): CompanionView {
  return {
    plants: () => plants.values(),
    plantAt: (x, y) => {
      const id = grid.at(x, y).plantId;
      return id === null ? null : plants.get(id)!;
    },
    touching: (x, y) => grid.neighbors(x, y, DIAGONAL_OFFSETS),
  };
}

/** A view of the board with one more plant in it, for a preview. */
export function withPlant(view: CompanionView, plant: Plant): CompanionView {
  return {
    *plants() {
      yield* view.plants();
      yield plant;
    },
    plantAt: (x, y) => (x === plant.x && y === plant.y ? plant : view.plantAt(x, y)),
    touching: view.touching,
  };
}

/**
 * Damage multiplier each plant receives from marigolds touching it: the
 * strongest boost, once, as an aura that does not stack. Pure over the board,
 * recomputed on planting rather than per tick.
 */
export function evaluateCompanions(
  view: CompanionView,
  specs: Record<PlantId, PlantSpec>,
): Map<number, number> {
  const amp = new Map<number, number>();
  for (const t of view.plants()) {
    let best = 0;
    for (const n of view.touching(t.x, t.y)) {
      const p = view.plantAt(n.x, n.y);
      if (p) best = Math.max(best, specs[p.def].amp);
    }
    amp.set(t.id, 1 + best);
  }
  return amp;
}

// ─── Run ────────────────────────────────────────────────────────────────────

export interface PlotRun {
  readonly plotIndex: number;
  readonly def: PlotDef;
  readonly grid: SpatialGrid<Cell>;
  readonly gap: { x: number; y: number };
  readonly seedbed: { x: number; y: number };
  readonly totalWaves: number;
  /** Bumped on every step and every board change: the renderer's redraw signal. */
  readonly version: { value: number };
  /** The board as the companion evaluator reads it. */
  readonly companions: CompanionView;
  phase: RunPhase;
  /** The wave in flight, or the next wave during a build phase (1-based). */
  wave: number;
  /** The first wave waits for the gardener; later ones run on the build timer. */
  held: boolean;
  /** Whether the run went on past the plot's last night, into the dark. */
  tail: boolean;
  /** Nights seen off past the plot's last. */
  depth: number;
  buildTimer: number;
  buildDuration: number;
  score: number;
  elapsed: number;
  plants: Map<number, Plant>;
  pests: Pest[];
  shots: Shot[];
  waveLogs: WaveLog[];
  /** Routing distance to the seedbed per cell, row-major. */
  field: Float64Array;

  canPlant(def: PlantId, x: number, y: number): { ok: boolean; reason?: string };
  /**
   * What planting `def` at a cell would change, for the hand to weigh: the
   * route's length before and after, and the hunting plants it would newly
   * boost (a marigold) or whether it would be boosted (a hunter).
   */
  plantPreview(
    def: PlantId,
    x: number,
    y: number,
  ): { pathBefore: number; pathAfter: number; boosts: number; boosted: boolean };
  plant(def: PlantId, x: number, y: number): boolean;
  upgrade(plantId: number): boolean;
  digUp(plantId: number): boolean;
  upgradePrice(plantId: number): number | null;
  /** Compost calling it a day would pay right now. */
  earlyCallBonus(): number;
  /** Call it a day: the next wave comes now, paying for the build time given up. */
  callEarly(): boolean;
  /** At the hold: call it a night, and end the run with the plot held. */
  finish(): boolean;
  /**
   * At the hold: go on into the dark, night after night, until the seedbed is
   * eaten. Refused when the dark would never end: HP must outgrow bounty.
   */
  goOn(): boolean;
  step(dt: number): void;
  plantDamage(t: Plant): number;
  plantRange(t: Plant): number;
  /** Cells of the current route from the gap to the seedbed. */
  route(): { x: number; y: number }[];
  /** Points a cell apart on a flyer's straight line from the gap to the seedbed. */
  flightLine(): { x: number; y: number }[];
  /** The next `nights` nights from the one in flight or next: as far as the plot's last, or on into the dark. */
  preview(nights: number): Night[];
  boardValue(): number;
  on(fn: (e: RunEvent) => void): void;
}

export function createPlotRun(
  plotIndex: number,
  def: PlotDef,
  params: RunParams,
  compost: Resource<DecimalSource>,
  seedlings: Resource<DecimalSource>,
): PlotRun {
  const { grid, gap, seedbed } = parseMap(def);
  const a = params.anchors;
  const listeners: ((e: RunEvent) => void)[] = [];
  const emit = (e: RunEvent) => listeners.forEach((fn) => fn(e));
  const version = shallowRef(0);
  const plants = new Map<number, Plant>();

  let nextId = 1;
  let amp = new Map<number, number>();
  let spawnQueue: ReturnType<typeof composeWave> = [];
  let waveClock = 0;
  let log: WaveLog | null = null;
  let meter = { plantTime: 0, busyTime: 0 };

  const run: PlotRun = {
    plotIndex,
    def,
    grid,
    gap,
    seedbed,
    totalWaves: wavesIn(a, plotIndex),
    version,
    companions: companionView(grid, plants),
    phase: 'build',
    wave: 1,
    held: true,
    tail: false,
    depth: 0,
    buildTimer: a.buildSeconds,
    buildDuration: a.buildSeconds,
    score: 0,
    elapsed: 0,
    plants,
    pests: [],
    shots: [],
    waveLogs: [],
    field: new Float64Array(grid.width * grid.height),

    canPlant(id, x, y) {
      if (run.phase !== 'build') return { ok: false, reason: 'Only between waves' };
      if (!params.isUnlocked(id)) return { ok: false, reason: 'Not learned yet' };
      const cell = grid.tryAt(x, y);
      if (!cell || cell.terrain !== 'open') return { ok: false, reason: 'Nothing grows here' };
      if (cell.plantId !== null) return { ok: false, reason: 'Already planted' };
      if (!hasResource(compost, params.specs[id].cost))
        return { ok: false, reason: 'Not enough compost' };
      // A planting may lengthen the route but never seal it.
      const probe = grid.distanceField([seedbed], (c, cx, cy) =>
        cx === x && cy === y ? Infinity : routeCost(c),
      );
      if (!Number.isFinite(probe[gap.y * grid.width + gap.x])) {
        return { ok: false, reason: 'Would seal the path' };
      }
      return { ok: true };
    },

    plantPreview(id, x, y) {
      const pathBefore = run.field[gap.y * grid.width + gap.x];
      const probe = grid.distanceField([seedbed], (c, cx, cy) =>
        cx === x && cy === y ? Infinity : routeCost(c),
      );
      const pathAfter = probe[gap.y * grid.width + gap.x];
      // The boost is only worth weighing on a plant that hunts.
      const hunts = (p: Plant) => params.specs[p.def].form !== null;
      const t: Plant = { id: nextId, def: id, x, y, level: 1, spent: 0, cooldown: 0 };
      const after = evaluateCompanions(withPlant(run.companions, t), params.specs);
      let boosts = 0;
      for (const p of run.plants.values())
        if (hunts(p) && after.get(p.id)! > amp.get(p.id)!) boosts++;
      const boosted = hunts(t) && after.get(t.id)! > 1;
      return { pathBefore, pathAfter, boosts, boosted };
    },

    plant(id, x, y) {
      if (!run.canPlant(id, x, y).ok) return false;
      const cost = params.specs[id].cost;
      if (!subtractResource(compost, cost)) return false;
      const t: Plant = { id: nextId++, def: id, x, y, level: 1, spent: cost, cooldown: 0 };
      run.plants.set(t.id, t);
      grid.set(x, y, { ...grid.at(x, y), plantId: t.id });
      boardChanged();
      emit({ type: 'planted', def: id, x, y });
      return true;
    },

    upgradePrice(plantId) {
      const t = run.plants.get(plantId);
      if (!t || params.specs[t.def].damage === 0 || t.level >= MAX_LEVEL) return null;
      return upgradeCost(a, params.specs[t.def].cost, t.level);
    },

    upgrade(plantId) {
      if (run.phase !== 'build') return false;
      const t = run.plants.get(plantId);
      const price = run.upgradePrice(plantId);
      if (!t || price === null) return false;
      if (!subtractResource(compost, price)) return false;
      t.level += 1;
      t.spent += price;
      bump();
      emit({ type: 'upgraded', def: t.def, level: t.level });
      return true;
    },

    digUp(plantId) {
      if (run.phase !== 'build') return false;
      const t = run.plants.get(plantId);
      if (!t) return false;
      const refund = Math.floor(t.spent * REFUND_RATE);
      addResource(compost, refund);
      run.plants.delete(plantId);
      grid.set(t.x, t.y, { ...grid.at(t.x, t.y), plantId: null });
      boardChanged();
      emit({ type: 'dug-up', def: t.def, refund });
      return true;
    },

    earlyCallBonus() {
      if (run.phase !== 'build' || run.held) return 0;
      const given = run.buildTimer / run.buildDuration;
      return Math.floor(
        a.earlyCallShare * waveIncome(a, run.wave) * given * params.earlyCallMult(),
      );
    },

    callEarly() {
      if (run.phase !== 'build') return false;
      const bonus = run.earlyCallBonus();
      if (bonus > 0) addResource(compost, bonus);
      run.held = false;
      launch(true, bonus);
      return true;
    },

    finish() {
      if (run.phase !== 'held') return false;
      run.phase = 'won';
      emit({ type: 'end', outcome: 'won', score: run.score });
      return true;
    },

    goOn() {
      if (run.phase !== 'held' || !(a.tailDivergence > 1)) return false;
      run.tail = true;
      nextNight();
      return true;
    },

    step(dt) {
      if (run.phase === 'won' || run.phase === 'lost' || run.phase === 'held') return;
      run.elapsed += dt;
      if (run.phase === 'build') {
        if (!run.held) run.buildTimer -= dt;
        if (run.buildTimer <= 0) launch(false, 0);
        bump();
        return;
      }
      waveClock += dt;
      spawnPests();
      movePests(dt);
      if (run.phase !== 'wave') return bump();
      measure(dt);
      fire(dt);
      moveShots(dt);
      if (spawnQueue.length === 0 && run.pests.every((u) => !u.alive)) resolveWave();
      run.pests = run.pests.filter((u) => u.alive);
      bump();
    },

    plantDamage(t) {
      const spec = params.specs[t.def];
      return spec.damage * levelMultiplier(a, t.level) * params.damageMult() * (amp.get(t.id) ?? 1);
    },

    plantRange(t) {
      const spec = params.specs[t.def];
      if (spec.range === 0) return 0;
      return spec.range + 0.25 * (t.level - 1) + (spec.damage > 0 ? params.rangeBonus() : 0);
    },

    route() {
      const cells: { x: number; y: number }[] = [];
      let c = { ...gap };
      for (let guard = 0; guard < grid.width * grid.height; guard++) {
        cells.push(c);
        if (c.x === seedbed.x && c.y === seedbed.y) break;
        const next = descend(c.x, c.y);
        if (!next) break;
        c = next;
      }
      return cells;
    },

    flightLine() {
      const dx = seedbed.x - gap.x;
      const dy = seedbed.y - gap.y;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      const out: { x: number; y: number }[] = [];
      for (let i = 0; i <= steps; i++)
        out.push({ x: gap.x + (dx * i) / steps, y: gap.y + (dy * i) / steps });
      return out;
    },

    preview(nights) {
      const out: Night[] = [];
      // At the hold the nights ahead are the dark's, if the gardener goes on.
      const from = run.phase === 'held' ? run.wave + 1 : run.wave;
      const last = run.tail || run.phase === 'held' ? Infinity : run.totalWaves;
      for (let w = from; w < from + nights && w <= last; w++)
        out.push({
          wave: w,
          kind: nightKind(a, plotIndex, w),
          pests: composeWave(a, plotIndex, w),
        });
      return out;
    },

    boardValue() {
      let v = 0;
      for (const t of run.plants.values()) v += t.spent;
      return v;
    },

    on(fn) {
      listeners.push(fn);
    },
  };

  function bump() {
    version.value++;
  }

  function boardChanged() {
    grid.distanceField([seedbed], routeCost, run.field);
    amp = evaluateCompanions(run.companions, params.specs);
    bump();
  }

  /** The neighbour one step closer to the seedbed; ties break by neighbourhood order. */
  function descend(x: number, y: number): { x: number; y: number } | null {
    const here = run.field[y * grid.width + x];
    let best: { x: number; y: number } | null = null;
    let bestD = here;
    for (const n of grid.neighbors(x, y)) {
      const d = run.field[n.y * grid.width + n.x];
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  /** Remaining distance to the seedbed for a pest, used to rank targets nearest the seedbed. */
  function remaining(u: Pest): number {
    if (u.flying) return Math.hypot(seedbed.x + 0.5 - u.px, seedbed.y + 0.5 - u.py);
    const d = run.field[u.ty * grid.width + u.tx];
    return d + Math.hypot(u.tx + 0.5 - u.px, u.ty + 0.5 - u.py);
  }

  // The wave lifecycle is phases inside one run, so it is consumer-side by the engine's own
  // INDEX (§ Reserved names: Cycle, Sequencer): a build phase on a timer the gardener may cut
  // short, then a wave that resolves as a batch.
  function launch(early: boolean, bonus: number) {
    spawnQueue = composeWave(a, plotIndex, run.wave);
    waveClock = 0;
    run.phase = 'wave';
    log = {
      wave: run.wave,
      boardValue: run.boardValue(),
      heldCompost: num(compost.value),
      pathLength: run.route().length - 1,
      pests: spawnQueue.length,
      hpPool: spawnQueue.reduce((s, u) => s + u.hp * SPEED_MULT[u.kind], 0),
      killDepth: 0,
      kills: 0,
      leaks: 0,
      damageDealt: 0,
      reservedSkips: 0,
      dps: [...run.plants.values()].reduce((s, t) => {
        const spec = params.specs[t.def];
        return spec.damage === 0 ? s : s + run.plantDamage(t) / spec.cooldown;
      }, 0),
      utilization: 0,
      exposure: routeExposure(),
      duration: 0,
    };
    meter = { plantTime: 0, busyTime: 0 };
    emit({ type: 'launch', wave: run.wave, early, bonus });
  }

  function resolveWave() {
    const gained = waveScore(plotIndex, run.wave);
    run.score += gained;
    closeLog();
    emit({ type: 'cleared', wave: run.wave, leaks: log?.leaks ?? 0, score: gained });
    if (run.tail) run.depth += 1;
    else if (run.wave >= run.totalWaves) {
      // The plot is held here, whatever the dark does after.
      run.score += victoryScore(plotIndex, num(seedlings.value));
      run.phase = 'held';
      emit({ type: 'held', score: run.score });
      return;
    }
    nextNight();
  }

  function nextNight() {
    run.wave += 1;
    run.phase = 'build';
    run.buildTimer = a.buildSeconds;
    run.buildDuration = a.buildSeconds;
    emit({ type: 'build', wave: run.wave });
  }

  function spawnPests() {
    while (spawnQueue.length > 0 && spawnQueue[0].at <= waveClock) {
      const s = spawnQueue.shift()!;
      run.pests.push({
        id: nextId++,
        kind: s.kind,
        px: gap.x + 0.5,
        py: gap.y + 0.5,
        tx: gap.x,
        ty: gap.y,
        hp: s.hp,
        maxHp: s.hp,
        armour: ARMOUR[s.kind],
        flying: ARMOUR[s.kind] === 'wing',
        incoming: 0,
        speed: s.speed,
        bounty: s.bounty,
        leak: s.leak,
        alive: true,
      });
    }
  }

  function slowAt(px: number, py: number): number {
    let slow = 0;
    for (const t of run.plants.values()) {
      const spec = params.specs[t.def];
      if (spec.slow === 0) continue;
      if (Math.hypot(t.x + 0.5 - px, t.y + 0.5 - py) <= run.plantRange(t))
        slow = Math.max(slow, spec.slow);
    }
    return slow;
  }

  function movePests(dt: number) {
    for (const u of run.pests) {
      if (!u.alive) continue;
      let budget = u.speed * (1 - slowAt(u.px, u.py)) * dt;
      if (u.flying) {
        const cx = seedbed.x + 0.5;
        const cy = seedbed.y + 0.5;
        const d = Math.hypot(cx - u.px, cy - u.py);
        if (d > budget) {
          u.px += ((cx - u.px) / d) * budget;
          u.py += ((cy - u.py) / d) * budget;
        } else {
          u.px = cx;
          u.py = cy;
          leak(u);
        }
        if (run.phase === 'lost') return;
        continue;
      }
      while (budget > 0) {
        const cx = u.tx + 0.5;
        const cy = u.ty + 0.5;
        const d = Math.hypot(cx - u.px, cy - u.py);
        if (d > budget) {
          u.px += ((cx - u.px) / d) * budget;
          u.py += ((cy - u.py) / d) * budget;
          break;
        }
        u.px = cx;
        u.py = cy;
        budget -= d;
        if (u.tx === seedbed.x && u.ty === seedbed.y) {
          leak(u);
          break;
        }
        const next = descend(u.tx, u.ty);
        if (!next) break;
        u.tx = next.x;
        u.ty = next.y;
      }
      if (run.phase === 'lost') return;
    }
  }

  function leak(u: Pest) {
    u.alive = false;
    if (log) log.leaks += 1;
    const left = Math.max(0, num(seedlings.value) - u.leak);
    seedlings.value = left;
    emit({ type: 'leak', wave: run.wave, kind: u.kind, seedlings: left });
    if (left <= 0) {
      run.phase = 'lost';
      closeLog();
      // A run that fell in the dark had held the plot already.
      emit({ type: 'end', outcome: run.tail ? 'won' : 'lost', score: run.score });
    }
  }

  /** How hard a plant of `form` hits a pest; 0 when it cannot reach it. */
  function against(form: Form, u: Pest): number {
    return FORM_VS_ARMOUR[form][u.armour];
  }

  /** Instrument for the probe's spine diff: how much of the wave each hunting plant had a target. */
  function measure(dt: number) {
    for (const t of run.plants.values()) {
      const form = params.specs[t.def].form;
      if (form === null) continue;
      const range = run.plantRange(t);
      meter.plantTime += dt;
      if (
        run.pests.some(
          (u) =>
            u.alive &&
            against(form, u) > 0 &&
            Math.hypot(u.px - t.x - 0.5, u.py - t.y - 0.5) <= range,
        )
      ) {
        meter.busyTime += dt;
      }
    }
  }

  /** The spine's exposure read off the board: route cells inside each hunting range, at baseline speed. */
  function routeExposure(): number {
    const route = run.route();
    let total = 0;
    let n = 0;
    for (const t of run.plants.values()) {
      if (params.specs[t.def].damage === 0) continue;
      const range = run.plantRange(t);
      total += route.filter((c) => Math.hypot(c.x - t.x, c.y - t.y) <= range).length / a.pestSpeed;
      n++;
    }
    return n > 0 ? total / n : 0;
  }

  function closeLog() {
    if (!log) return;
    log.duration = waveClock;
    log.utilization = meter.plantTime > 0 ? meter.busyTime / meter.plantTime : 0;
    run.waveLogs.push(log);
  }

  function fire(dt: number) {
    for (const t of run.plants.values()) {
      const spec = params.specs[t.def];
      const form = spec.form;
      if (form === null) continue;
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      const range = run.plantRange(t);
      const ox = t.x + 0.5;
      const oy = t.y + 0.5;
      const ignoresMarks = spec.splash > 0;
      let target: Pest | null = null;
      let bestRemaining = Infinity;
      let anyInRange = false;
      for (const u of run.pests) {
        if (!u.alive || against(form, u) === 0 || Math.hypot(u.px - ox, u.py - oy) > range)
          continue;
        anyInRange = true;
        if (!ignoresMarks && u.incoming >= u.hp) continue;
        const r = remaining(u);
        if (r < bestRemaining) {
          bestRemaining = r;
          target = u;
        }
      }
      if (!target) {
        if (anyInRange && log) log.reservedSkips += 1;
        t.cooldown = 0;
        continue;
      }
      const damage = run.plantDamage(t);
      if (!ignoresMarks) target.incoming += damage * against(form, target);
      run.shots.push({
        id: nextId++,
        plantId: t.id,
        targetId: ignoresMarks ? null : target.id,
        px: ox,
        py: oy,
        ax: target.px,
        ay: target.py,
        damage,
        form,
        speed: spec.shotSpeed,
        splash: spec.splash,
        marked: !ignoresMarks,
      });
      t.cooldown = spec.cooldown;
    }
  }

  function moveShots(dt: number) {
    const live: Shot[] = [];
    for (const s of run.shots) {
      const target = s.targetId !== null ? run.pests.find((u) => u.id === s.targetId) : undefined;
      if (s.targetId !== null && (!target || !target.alive)) continue; // fizzles; the mark died with its pest
      const ax = target ? target.px : s.ax;
      const ay = target ? target.py : s.ay;
      const d = Math.hypot(ax - s.px, ay - s.py);
      const stepLen = s.speed * dt;
      if (d > stepLen) {
        s.px += ((ax - s.px) / d) * stepLen;
        s.py += ((ay - s.py) / d) * stepLen;
        live.push(s);
        continue;
      }
      if (target) {
        const dealt = s.damage * against(s.form, target);
        target.incoming = Math.max(0, target.incoming - dealt);
        hit(target, dealt);
      } else {
        for (const u of run.pests) {
          const m = u.alive ? against(s.form, u) : 0;
          if (m > 0 && Math.hypot(u.px - ax, u.py - ay) <= s.splash) hit(u, s.damage * m);
        }
      }
    }
    run.shots = live;
  }

  function hit(u: Pest, damage: number) {
    const dealt = Math.min(u.hp, damage);
    u.hp -= damage;
    if (log) log.damageDealt += dealt * SPEED_MULT[u.kind];
    if (u.hp <= 0 && u.alive) {
      u.alive = false;
      // Income is the sum of what the wave's resolution paid, not a rate on anything owned.
      addResource(compost, u.bounty);
      if (log) {
        const walked = 1 - remaining(u) / Math.max(1, log.pathLength);
        log.killDepth += (walked - log.killDepth) / (log.kills + 1);
        log.kills += 1;
      }
    }
  }

  boardChanged();
  emit({ type: 'build', wave: 1 });
  return run;
}

function num(v: DecimalSource): number {
  return new Decimal(v).toNumber();
}
