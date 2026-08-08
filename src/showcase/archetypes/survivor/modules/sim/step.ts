import { ARENA_BALANCE, THREAT_BALANCE } from '../../data/arena';
import { startingDevice } from '../../data/devices';
import { contactDamageMul, hpMul } from '../../data/schedule';
import {
  BASE_SPECIMEN_HP,
  SPECIMENS,
  SPLITTER_FRAGMENTS,
  activeSpecimens,
} from '../../data/specimens';
import { chainMul, tickRotation } from './dispatch';
import { chooseHeading, computeFields, hasEscape, type Fields, type NavGrid } from './steering';
import type { ArenaParams, ArenaState, Specimen } from './types';

/** How often the steering fields are rebuilt, in sim seconds. */
export const FIELD_REFRESH_SECONDS = 0.25;

/** Operator movement speed in sim units per second, before seat and meta. */
export const BASE_MOVE_SPEED = 120;

/** Touching bodies at which contact damage reaches the full aggregate rate. */
export const CONTACT_SATURATION = 3;

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
    devices: [{ defId: opener.id, level: 1, timer: 0 }],
    reagentStacks: new Map(),
    stats: {
      kills: 0,
      motesDropped: 0,
      motesBanked: 0,
      motesCollectedByCollector: 0,
      contactSeconds: 0,
      damageTaken: 0,
    },
    nextId: 1,
    spawnCarry: 0,
  };
}

/** Live collect radius, after reagents and the cross-run aperture upgrade. */
export function collectRadius(state: ArenaState, params: ArenaParams): number {
  return (
    ARENA_BALANCE.collectRadius * chainMul('collect', state.reagentStacks) * params.metaCollect
  );
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
  while (state.spawnCarry >= 1 && state.specimens.length < THREAT_BALANCE.entityBudget) {
    state.spawnCarry -= 1;
    if (live.length > 0) spawnOne(state, params);
  }

  // ─── operator movement ───
  const heading = chooseHeading(state, nav, fields, params);
  state.operator.heading = heading;
  const speed = BASE_MOVE_SPEED * params.speedMul * chainMul('moveSpeed', state.reagentStacks);
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
    for (const target of a.targets) target.hp -= a.damage;
  }

  // ─── deaths, drops ───
  const survivors: Specimen[] = [];
  for (const s of state.specimens) {
    if (s.hp <= 0) {
      state.stats.kills++;
      if (s.moteYield > 0) dropMotes(state, s, params);
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

  // ─── despawn what the view left behind ───
  const despawn2 = Math.pow(ARENA_BALANCE.spawnOuterRadius * 1.4, 2);
  state.specimens = state.specimens.filter((s) => {
    const dx = s.x - state.operator.x;
    const dy = s.y - state.operator.y;
    return dx * dx + dy * dy <= despawn2;
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
