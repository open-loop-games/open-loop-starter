import {
  ARENA_BALANCE,
  COLLECTOR_BALANCE,
  THREAT_BALANCE,
  collectRadiusFor,
  rollCollectorTimes,
} from '../../data/arena';
import { startingDevice } from '../../data/devices';
import { SCHEDULE_BALANCE, contactDamageMul, hpMul } from '../../data/schedule';
import {
  BASE_SPECIMEN_HP,
  SPECIMENS,
  SPLITTER_FRAGMENTS,
  activeSpecimens,
} from '../../data/specimens';
import { chainMul, tickRotation } from './dispatch';
import {
  chooseHeading,
  computeFields,
  hasEscape,
  slewHeading,
  type Fields,
  type NavGrid,
} from './steering';
import type { ArenaParams, ArenaState, Specimen, Vec2 } from './types';

/** How often the steering fields are rebuilt, in sim seconds. */
export const FIELD_REFRESH_SECONDS = 0.25;

/** Operator movement speed in sim units per second, before seat and meta. */
export const BASE_MOVE_SPEED = 120;

/**
 * Touching bodies at which contact damage reaches the full aggregate rate.
 * Declared in `../../data/arena.ts` because the movement policy prices contact
 * with this same curve; re-exported here so the § contact loop below reads local.
 */
export const CONTACT_SATURATION = THREAT_BALANCE.contactSaturation;

/** A fresh run's arena, before the first tick. */
export function createArenaState(params: ArenaParams): ArenaState {
  const opener = startingDevice();
  return {
    time: 0,
    operator: {
      x: ARENA_BALANCE.mapWidth / 2,
      y: ARENA_BALANCE.mapHeight / 2,
      hp: THREAT_BALANCE.baseHp * params.toughnessMul * params.metaSurvival,
      maxHp: THREAT_BALANCE.baseHp * params.toughnessMul * params.metaSurvival,
      heading: { x: 1, y: 0 },
    },
    specimens: [],
    motes: [],
    collectors: [],
    collectorTimes: rollCollectorTimes(params.random, SCHEDULE_BALANCE.runSeconds),
    collectorsDropped: 0,
    devices: [{ defId: opener.id, level: 1, timer: 0 }],
    reagentStacks: new Map(),
    stats: {
      kills: 0,
      motesDropped: 0,
      motesBanked: 0,
      motesCollectedByCollector: 0,
      collectorsTaken: 0,
      contactSeconds: 0,
      damageTaken: 0,
      devices: {},
      spawned: 0,
    },
    nextId: 1,
    spawnCarry: 0,
  };
}

/**
 * Live collect radius, after reagents and the cross-run aperture upgrade.
 *
 * The two multipliers compose into ONE aperture figure handed to
 * `collectRadiusFor`, which bounds `r_collect / r_kill` structurally
 * (`../../data/arena.ts` § Which is why the ratio is bounded). Multiplying the
 * radius here directly is what let a fully-stacked reagent plus a bought tile
 * put the aperture outside the kill radius.
 */
export function collectRadius(state: ArenaState, params: ArenaParams): number {
  return collectRadiusFor(chainMul('collect', state.reagentStacks) * params.metaCollect);
}

function spawnOne(state: ArenaState, params: ArenaParams): void {
  const live = activeSpecimens(state.time);
  const totalWeight = live.reduce((s, d) => s + d.weight, 0);
  let roll = params.random() * totalWeight;
  const def = live.find((d) => (roll -= d.weight) <= 0) ?? live[0] ?? SPECIMENS[0];

  const angle = params.random() * Math.PI * 2;
  const { spawnInnerRadius, spawnOuterRadius, mapWidth, mapHeight } = ARENA_BALANCE;
  const radius = spawnInnerRadius + params.random() * (spawnOuterRadius - spawnInnerRadius);
  const x = Math.min(mapWidth, Math.max(0, state.operator.x + Math.cos(angle) * radius));
  const y = Math.min(mapHeight, Math.max(0, state.operator.y + Math.sin(angle) * radius));

  state.specimens.push({
    id: state.nextId++,
    tierId: def.id,
    x,
    y,
    hp: BASE_SPECIMEN_HP * def.hpFactor * hpMul(state.time),
    speed: def.speed,
    contactDamage: THREAT_BALANCE.contactDps * def.damageFactor * contactDamageMul(state.time),
    moteYield: def.moteYield,
    spawnedAt: state.time,
  });
}

function dropMotes(state: ArenaState, s: Specimen, params: ArenaParams): void {
  const value = s.moteYield * params.metaYield;
  state.motes.push({ id: state.nextId++, x: s.x, y: s.y, value, droppedAt: state.time });
  state.stats.motesDropped += value;

  if (s.tierId === 'splitter') {
    for (let i = 0; i < SPLITTER_FRAGMENTS; i++) {
      const a = params.random() * Math.PI * 2;
      state.specimens.push({
        ...s,
        id: state.nextId++,
        x: s.x + Math.cos(a) * 30,
        y: s.y + Math.sin(a) * 30,
        hp: s.hp * 0.4,
        tierId: 'splitter-fragment',
        moteYield: 0,
      });
    }
  }
}

/**
 * Drop a collector on this kill if the run has reached its next rolled time.
 *
 * The hazard is on the CLOCK and the body is only where it lands. Rolling per
 * kill instead would make collector income scale with kill rate, quietly paying
 * the seats that engage most a second time through a channel the income model
 * (`../../data/income.ts`) has no term for — and it would make the expected
 * count per run depend on how well the run was going.
 */
function maybeDropCollector(state: ArenaState, at: Vec2): void {
  const next = state.collectorTimes[state.collectorsDropped];
  if (next === undefined || state.time < next) return;
  state.collectorsDropped++;
  state.collectors.push({ id: state.nextId++, x: at.x, y: at.y, droppedAt: state.time });
}

export interface StepResult {
  /** True when the operator's HP reached zero this step. */
  died: boolean;
  /** True when no traversable gap remained — traversal collapse. */
  trapped: boolean;
}

/**
 * Advance the arena by `dt`. Pure over `(state, params)` apart from mutating the
 * state it is handed, which is the shape the live tick and the probes both want:
 * one function, one set of rules, no second implementation to drift against.
 *
 * `fields` is passed in and refreshed by the caller on `FIELD_REFRESH_SECONDS`,
 * because rebuilding two distance fields every 50 ms is waste — the threat
 * gradient barely moves between steps.
 */
export function stepArena(
  state: ArenaState,
  dt: number,
  params: ArenaParams,
  nav: NavGrid,
  fields: Fields,
): StepResult {
  state.time += dt;
  const { mapWidth, mapHeight, contactRadius } = ARENA_BALANCE;

  // ─── spawn ───
  const live = activeSpecimens(state.time);
  const rate =
    THREAT_BALANCE.spawnRate0 * Math.pow(THREAT_BALANCE.spawnGrowthPerMinute, state.time / 60);
  state.spawnCarry += rate * dt;
  // No ceiling: what the escalation curve calls for is what the floor gets. The
  // `entityBudget` that used to gate this looked like a performance bound and
  // acted as a design one, discarding 40–70% of the run's authored spawns
  // (`../../BALANCING.md` § Known thin). Density is bounded by the annulus, by
  // kills, and by the distance cull — by the game, rather than by a constant.
  while (state.spawnCarry >= 1) {
    state.spawnCarry -= 1;
    if (live.length > 0) {
      spawnOne(state, params);
      state.stats.spawned++;
    }
  }

  // ─── operator movement ───
  // One mechanic, two drivers. A player-seat's input replaces the policy's
  // OUTPUT, not its machinery: everything downstream — device aiming off the
  // heading, contact, collection — reads the same fields either way.
  let heading: Vec2;
  let moving = true;
  if (params.control) {
    const input = params.control();
    if (input) {
      // Direct control is direct: no slew. The turn-rate limit exists so an
      // arg-max cannot flail (`./steering.ts` § MAX_TURN_RATE); a hand on the
      // keys is not flailing, and rate-limiting it would just read as lag.
      const len = Math.hypot(input.x, input.y) || 1;
      heading = { x: input.x / len, y: input.y / len };
    } else {
      // Nothing held. Hold the heading so the cone keeps pointing where the
      // player last aimed, but stop moving — coasting would make "let go" a
      // move rather than the absence of one.
      heading = state.operator.heading;
      moving = false;
    }
  } else {
    // Decide freely, execute at a bounded turn rate. The operator has mass; a
    // policy that can pivot instantly reads as a glitch even when it is choosing
    // correctly (`./steering.ts` § MAX_TURN_RATE).
    const desired = chooseHeading(state, nav, fields, params);
    heading = slewHeading(state.operator.heading, desired, dt);
  }
  state.operator.heading = heading;
  const speed = moving
    ? BASE_MOVE_SPEED * params.speedMul * chainMul('moveSpeed', state.reagentStacks)
    : 0;
  state.operator.x = Math.min(mapWidth, Math.max(0, state.operator.x + heading.x * speed * dt));
  state.operator.y = Math.min(mapHeight, Math.max(0, state.operator.y + heading.y * speed * dt));

  // ─── specimens close on the operator ───
  for (const s of state.specimens) {
    const dx = state.operator.x - s.x;
    const dy = state.operator.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    s.x += (dx / d) * s.speed * dt;
    s.y += (dy / d) * s.speed * dt;
  }

  // ─── devices fire ───
  const activations = tickRotation(
    state.devices,
    dt,
    state.operator,
    heading,
    state.specimens,
    state.reagentStacks,
    params,
  );
  for (const a of activations) {
    const stat = (state.stats.devices[a.defId] ??= {
      fires: 0,
      firesConnected: 0,
      reachable: 0,
      hits: 0,
      kills: 0,
      damage: 0,
    });
    stat.fires += a.fires;
    // `reachable` and `hits` are both per SELECTION, not per shot, so their ratio
    // stays a capture rate; `fires` counts shots and is the connect denominator.
    stat.reachable += a.reachable;
    if (a.targets.length === 0) continue;
    // Targets are selected once per tick, so every catch-up fire in this batch
    // lands on the same selection — all of them connected or none did.
    stat.firesConnected += a.fires;
    stat.hits += a.targets.length;
    for (const target of a.targets) {
      // Credit the killing blow, and only once: a target another device already
      // dropped this tick is at hp <= 0 before this subtraction.
      const before = target.hp;
      target.hp -= a.damage;
      // Clamped at zero, not just at the target's remaining hp: a target another
      // device already dropped this tick has NEGATIVE hp, and crediting that as
      // effective damage subtracts from the device's total. It reads as negative
      // dps in the probe once several shapes cover the same body in one tick.
      stat.damage += Math.max(0, Math.min(before, a.damage));
      if (before > 0 && target.hp <= 0) stat.kills++;
    }
  }

  // ─── deaths, drops ───
  const survivors: Specimen[] = [];
  for (const s of state.specimens) {
    if (s.hp <= 0) {
      state.stats.kills++;
      if (s.moteYield > 0) dropMotes(state, s, params);
      maybeDropCollector(state, s);
    } else {
      survivors.push(s);
    }
  }
  state.specimens = survivors;

  // ─── collection ───
  const cr = collectRadius(state, params);
  const cr2 = cr * cr;
  state.motes = state.motes.filter((m) => {
    const dx = m.x - state.operator.x;
    const dy = m.y - state.operator.y;
    if (dx * dx + dy * dy <= cr2) {
      state.stats.motesBanked += m.value;
      return false;
    }
    return true;
  });

  // ─── collector pickup ───
  // Taken at the same aperture as a mote — it is a thing on the floor you walk
  // over, not a thing that reaches for you. The PULL then runs at `pullRadius`,
  // which is the whole point of it.
  if (state.collectors.length > 0) {
    const kept: typeof state.collectors = [];
    for (const c of state.collectors) {
      const dx = c.x - state.operator.x;
      const dy = c.y - state.operator.y;
      if (dx * dx + dy * dy > cr2) {
        kept.push(c);
        continue;
      }
      state.stats.collectorsTaken++;
      const pull2 = COLLECTOR_BALANCE.pullRadius * COLLECTOR_BALANCE.pullRadius;
      state.motes = state.motes.filter((m) => {
        const mx = m.x - state.operator.x;
        const my = m.y - state.operator.y;
        if (mx * mx + my * my <= pull2) {
          state.stats.motesBanked += m.value;
          state.stats.motesCollectedByCollector += m.value;
          return false;
        }
        return true;
      });
    }
    state.collectors = kept;
  }

  // ─── contact ───
  // Contact SATURATES rather than summing. Only so many bodies can reach you at
  // once, and — the reason this matters — the closed form
  // (`../../balance/survivor-projection.ts`) models damage as
  // `contactChance · contactDps` with `contactChance` in [0, 1], i.e. an
  // AGGREGATE rate. Summing per-specimen made the sim about an order of magnitude
  // deadlier than the projection at fifteen touching, which is not a difficulty
  // decision, it is two models disagreeing. This is the reconciliation: the mean
  // per-specimen damage, ramped to full by `CONTACT_SATURATION` bodies.
  const contact2 = contactRadius * contactRadius;
  let touching = 0;
  let damageSum = 0;
  for (const s of state.specimens) {
    const dx = s.x - state.operator.x;
    const dy = s.y - state.operator.y;
    if (dx * dx + dy * dy <= contact2) {
      touching++;
      damageSum += s.contactDamage;
    }
  }
  if (touching > 0) {
    const meanDamage = damageSum / touching;
    const saturation = Math.min(1, touching / CONTACT_SATURATION);
    const taken = (meanDamage * saturation * dt) / (params.toughnessMul * params.metaSurvival);
    state.operator.hp -= taken;
    state.stats.damageTaken += taken;
    state.stats.contactSeconds += dt;
  }

  // ─── despawn: dwell, with distance as the backstop ───
  //
  // `dwellSeconds` is the spine's own term — "unengaged specimens leave by
  // scrolling away" (`../../IDENTITY.md`), and `localDensity` is Little's law
  // over it. For most of this archetype's life the sim did not implement it: it
  // culled on DISTANCE alone, at `spawnOuterRadius · 1.4`, and an operator that
  // orbits rather than fleeing in a straight line almost never outruns anything.
  // So bodies lived ~130s against a modelled 12 and the floor held hundreds
  // against a modelled twenty — an order of magnitude, and the reason a hard
  // entity ceiling looked necessary.
  //
  // A body is exempt while it is inside `killRadius`, because that is what
  // "engaged" means here and those leave by dying. Outside it, the clock is the
  // geometry restated: at 38–70 units/s from a 560–760 annulus, twelve seconds is
  // as long as it takes to cross the gap, so dwelling out IS "you had your chance
  // to reach me". Distance stays as a backstop for anything the operator outruns
  // outright.
  const despawn2 = Math.pow(ARENA_BALANCE.spawnOuterRadius * 1.4, 2);
  const kill2 = ARENA_BALANCE.killRadius * ARENA_BALANCE.killRadius;
  state.specimens = state.specimens.filter((s) => {
    const dx = s.x - state.operator.x;
    const dy = s.y - state.operator.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > despawn2) return false;
    if (d2 <= kill2) return true;
    return state.time - s.spawnedAt < THREAT_BALANCE.dwellSeconds;
  });

  return {
    died: state.operator.hp <= 0,
    trapped: !hasEscape(state, nav, fields),
  };
}

/** Rebuild the steering fields if they are stale. Caller-owned cadence. */
export function refreshFields(state: ArenaState, nav: NavGrid, fields: Fields | undefined): Fields {
  if (fields && state.time - fields.computedAt < FIELD_REFRESH_SECONDS) return fields;
  return computeFields(state, nav, state.time);
}
