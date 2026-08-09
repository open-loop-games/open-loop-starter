import { THREAT_BALANCE } from '../../data/arena';
import { DEVICES, EVOLUTIONS, REAGENTS, type DeviceDef } from '../../data/devices';
import { offensivePickGain } from '../../data/schedule';
import { BASELINE_SEAT } from '../../data/seats';
import { meanHpFactor } from '../../data/specimens';
import { SCHEDULE_BALANCE } from '../../data/schedule';
import type { ArenaParams, DeviceRuntime, Specimen, Vec2 } from './types';

/**
 * Per-level damage multiplier, taken from the SOLVED per-offensive-pick gain
 * rather than authored.
 *
 * This was the fourth time in this archetype that the code and the closed form
 * disagreed about a multiplier, and the most expensive: levels scaled linearly
 * (`1 + 0.25·(level−1)`, so a maxed device was 2.75×) while the spine solves for
 * ~1.40× per offensive pick (a maxed device ≈ 10.5×). Device DPS therefore could
 * not track specimen HP no matter how well the run drafted, kills came in at a
 * third of the closed-form rate, and the economy ran a permanent deficit that
 * read as "too hard" instead of "the growth term is wrong".
 *
 * Deriving it here means a retune of the escalation curves moves this with them.
 */
const LEVEL_GAIN = offensivePickGain(
  BASELINE_SEAT.defenseShare,
  THREAT_BALANCE.spawnGrowthPerMinute,
  meanHpFactor(SCHEDULE_BALANCE.runSeconds) / meanHpFactor(0),
);

// TODO(expansion): per-item cooldown timers + fire dispatch is a parked engine
// primitive (`candidate-primitives.md` § Cooldown-rotation dispatch over a def
// set), admitted pre-designed under this archetype and naming this build as its
// convergence signal. `tickRotation` below IS the predicted kernel.

const DEVICE_BY_ID = new Map<string, DeviceDef>(DEVICES.map((d) => [d.id, d]));
const EVOLUTION_BY_ID = new Map(EVOLUTIONS.map((e) => [e.id, e]));
const REAGENT_BY_ID = new Map(REAGENTS.map((r) => [r.id, r]));

/** Live damage of a device at its current level and evolution. */
export function deviceDamage(
  rt: DeviceRuntime,
  reagentStacks: ReadonlyMap<string, number>,
  params: ArenaParams,
): number {
  const def = DEVICE_BY_ID.get(rt.defId);
  if (!def) return 0;
  const evolution = rt.evolutionId ? EVOLUTION_BY_ID.get(rt.evolutionId) : undefined;
  // Geometric in level, at the solved gain — this is where the spine's
  // compounding actually lives.
  const levelled = def.baseDamage * Math.pow(LEVEL_GAIN, rt.level - 1);
  return levelled * (evolution?.damageMul ?? 1) * chainMul('damage', reagentStacks) * params.dpsMul;
}

/** Live cooldown of a device, after reagents and evolution. */
export function deviceCooldown(
  rt: DeviceRuntime,
  reagentStacks: ReadonlyMap<string, number>,
): number {
  const def = DEVICE_BY_ID.get(rt.defId);
  if (!def) return Number.POSITIVE_INFINITY;
  const evolution = rt.evolutionId ? EVOLUTION_BY_ID.get(rt.evolutionId) : undefined;
  return def.cooldownSec * (evolution?.cooldownMul ?? 1) * chainMul('cooldown', reagentStacks);
}

/** Live reach of a device, after reagents. */
export function deviceReach(rt: DeviceRuntime, reagentStacks: ReadonlyMap<string, number>): number {
  const def = DEVICE_BY_ID.get(rt.defId);
  if (!def) return 0;
  return def.reach * chainMul('reach', reagentStacks);
}

/**
 * The modifier-product chain for one reagent effect. Each stack contributes its
 * `perStack` multiplicatively, which is what makes stacking compound rather than
 * add — the `∏ μᵢ` term in the spine.
 */
export function chainMul(effect: string, reagentStacks: ReadonlyMap<string, number>): number {
  let product = 1;
  for (const [id, stacks] of reagentStacks) {
    const reagent = REAGENT_BY_ID.get(id);
    if (!reagent || reagent.effect !== effect) continue;
    product *= Math.pow(reagent.perStack, stacks);
  }
  return product;
}

/**
 * A device activation: which specimens it hit, and for how much each.
 *
 * Emitted even when `targets` is empty, because a whiff is the reading — a
 * directional shape firing at floor it is not facing is invisible in kill counts
 * and shows up only as a device that quietly under-delivers. `reachable` is the
 * in-reach census before the shape filter, so `hits/reachable` separates a shape
 * that could not see its targets from one that was capped by `maxTargets`.
 */
export interface Activation {
  defId: string;
  targets: Specimen[];
  damage: number;
  /** Catch-up fires folded into this activation. `damage` is already scaled. */
  fires: number;
  /** Specimens inside reach at fire time, before shape filter and cap. */
  reachable: number;
}

/**
 * Select what one activation reaches. The four shapes differ only in *which*
 * specimens inside reach they take, which is the whole reason the roster
 * re-ranks itself as density climbs: the capped shapes stop scaling and the area
 * shapes do not.
 *
 * Returns the in-reach count alongside the picks so the caller can account for
 * what the shape declined.
 */
function selectTargets(
  rt: DeviceRuntime,
  origin: Vec2,
  heading: Vec2,
  reach: number,
  specimens: Specimen[],
): { targets: Specimen[]; reachable: number } {
  const def = DEVICE_BY_ID.get(rt.defId);
  if (!def) return { targets: [], reachable: 0 };
  const inReach: { s: Specimen; d2: number }[] = [];
  const reach2 = reach * reach;
  for (const s of specimens) {
    const dx = s.x - origin.x;
    const dy = s.y - origin.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= reach2) inReach.push({ s, d2 });
  }
  const reachable = inReach.length;
  if (reachable === 0) return { targets: [], reachable };

  switch (def.shape) {
    case 'pulse':
      // Radial: everything in reach, capped.
      return { targets: inReach.slice(0, def.maxTargets).map((e) => e.s), reachable };
    case 'cone': {
      // Forward wedge along the operator's heading.
      const hl = Math.hypot(heading.x, heading.y) || 1;
      const hx = heading.x / hl;
      const hy = heading.y / hl;
      const picked = inReach.filter((e) => {
        const dl = Math.sqrt(e.d2) || 1;
        const dot = ((e.s.x - origin.x) / dl) * hx + ((e.s.y - origin.y) / dl) * hy;
        return dot >= 0.5; // ~120° wedge
      });
      return { targets: picked.slice(0, def.maxTargets).map((e) => e.s), reachable };
    }
    case 'lance': {
      // Pierces a line toward the nearest specimen.
      inReach.sort((a, b) => a.d2 - b.d2);
      const lead = inReach[0].s;
      const ll = Math.hypot(lead.x - origin.x, lead.y - origin.y) || 1;
      const lx = (lead.x - origin.x) / ll;
      const ly = (lead.y - origin.y) / ll;
      const picked = inReach.filter((e) => {
        const dl = Math.sqrt(e.d2) || 1;
        const dot = ((e.s.x - origin.x) / dl) * lx + ((e.s.y - origin.y) / dl) * ly;
        return dot >= 0.92; // tight line
      });
      return { targets: picked.slice(0, def.maxTargets).map((e) => e.s), reachable };
    }
    case 'bolt':
    default: {
      inReach.sort((a, b) => a.d2 - b.d2);
      return { targets: inReach.slice(0, def.maxTargets).map((e) => e.s), reachable };
    }
  }
}

/**
 * Tick every installed device's timer and collect the activations that fired.
 *
 * This is the parked primitive's kernel verbatim: per def, decrement, fire when
 * the timer expires, re-arm at the modified cooldown. The only addition over the
 * predicted shape is that re-arm *adds* the cooldown rather than assigning it, so
 * a long `dt` cannot silently swallow activations — a device with a 0.55s cadence
 * stepped at 1s must fire twice, not once.
 */
export function tickRotation(
  devices: DeviceRuntime[],
  dt: number,
  origin: Vec2,
  heading: Vec2,
  specimens: Specimen[],
  reagentStacks: ReadonlyMap<string, number>,
  params: ArenaParams,
): Activation[] {
  const activations: Activation[] = [];
  for (const rt of devices) {
    const cooldown = deviceCooldown(rt, reagentStacks);
    if (!Number.isFinite(cooldown) || cooldown <= 0) continue;
    rt.timer -= dt;
    // Bound the catch-up so a pathological dt cannot spin here.
    let fires = 0;
    while (rt.timer <= 0 && fires < 16) {
      rt.timer += cooldown;
      fires++;
    }
    if (fires === 0) continue;
    const reach = deviceReach(rt, reagentStacks);
    const { targets, reachable } = selectTargets(rt, origin, heading, reach, specimens);
    activations.push({
      defId: rt.defId,
      targets,
      damage: deviceDamage(rt, reagentStacks, params) * fires,
      fires,
      reachable,
    });
  }
  return activations;
}
