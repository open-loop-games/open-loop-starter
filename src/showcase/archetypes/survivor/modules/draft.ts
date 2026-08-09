import {
  createSeededRNG,
  getSeed,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { computed, shallowRef, triggerRef, type ShallowRef } from 'vue';
import { isHeadingBound } from './sim/dispatch';
import { DEVICES, EVOLUTIONS, REAGENTS } from '../data/devices';
import type { SeatDef } from '../data/seats';
import { ArenaKey } from './arena';
import { RunKey } from './run';
import type { ArenaState, DeviceRuntime } from './sim/types';

/**
 * Draft module — the Run-Scoped Upgrade Tree.
 *
 * Two halves, deliberately separated: **offer generation** is the mechanic (what
 * the pool can present, given what the run already holds), and **the pick** is a
 * policy. The AI seat resolves its own picks through `autoPick`, and a human seat
 * later calls `choose(index)` on the same offers — the mechanic does not change,
 * only who answers. That is the same "policy swapped for input" seam the arena
 * uses for movement.
 *
 * This is also the archetype's one stochastic load-bearing subsystem
 * (`open-loop-research/.../per-archetype/survivor.md`): the offer pool is a
 * weighted draw over a set that narrows through the run, and the variance is
 * design intent rather than noise.
 */

export type OfferKind = 'device-acquire' | 'device-level' | 'reagent' | 'evolution';

export interface DraftOffer {
  kind: OfferKind;
  /** Device / reagent / evolution id, depending on `kind`. */
  id: string;
  label: string;
  /** True when the pick counts against the seat's defensive budget. */
  defensive: boolean;
}

export interface DraftApi {
  /** The current offer set. Empty when nothing is owed. */
  offers: ShallowRef<DraftOffer[]>;
  /** How many offers a beat presents. */
  offerCount: number;
  /** Apply an offer by index and consume the owed pick. */
  choose: (index: number) => void;
  /** Picks taken this run, by kind — a probe readout. */
  taken: ComputedRef<Record<OfferKind, number>>;
}

export const DraftKey: InjectionKey<DraftApi> = Symbol('survivor/draft') as InjectionKey<DraftApi>;

/** Offers presented per beat. Smaller than the pool, which is what makes it a choice. */
export const OFFER_COUNT = 3;

const REAGENT_BY_ID = new Map(REAGENTS.map((r) => [r.id, r]));

/** Everything the run could legally be offered right now. */
export function candidateOffers(state: ArenaState): DraftOffer[] {
  const out: DraftOffer[] = [];
  const owned = new Map(state.devices.map((d) => [d.defId, d]));

  // Evolutions first: a maxed device holding the right reagent can recombine.
  for (const evo of EVOLUTIONS) {
    const device = owned.get(evo.deviceId);
    const def = DEVICES.find((d) => d.id === evo.deviceId);
    if (!device || !def || device.evolutionId) continue;
    if (device.level < def.maxLevel) continue;
    if (!state.reagentStacks.has(evo.reagentId)) continue;
    out.push({ kind: 'evolution', id: evo.id, label: evo.name, defensive: false });
  }

  for (const def of DEVICES) {
    const held = owned.get(def.id);
    if (!held) {
      out.push({ kind: 'device-acquire', id: def.id, label: def.name, defensive: false });
    } else if (held.level < def.maxLevel && !held.evolutionId) {
      out.push({
        kind: 'device-level',
        id: def.id,
        label: `${def.name} +1`,
        defensive: false,
      });
    }
  }

  for (const reagent of REAGENTS) {
    const stacks = state.reagentStacks.get(reagent.id) ?? 0;
    if (stacks >= reagent.maxStacks) continue;
    out.push({
      kind: 'reagent',
      id: reagent.id,
      label: `${reagent.name} +1`,
      defensive: reagent.defensive,
    });
  }

  return out;
}

/**
 * Draw weight for one offer. **The draw is where commitment survives or dies.**
 *
 * A uniform draw dilutes: with four devices owned the pool holds ten candidates,
 * so the specific device a run is deepening shows up in roughly three beats in
 * ten, and a device needs eight levels before it can recombine. Measured
 * consequence — zero evolutions across a 23-pick run, in a roster sized for two
 * or three. Fixing the *policy* did not help, because the policy can only choose
 * among what it is shown.
 *
 * So the draw leans toward what the run already owns, which is also how the
 * corpus behaves: offers concentrate on your build rather than re-rolling the
 * whole catalogue every level.
 */
function drawWeight(offer: DraftOffer, devices: readonly DeviceRuntime[]): number {
  if (offer.kind === 'evolution') return 8;
  if (offer.kind === 'device-level') {
    const held = devices.find((d) => d.defId === offer.id);
    return 1 + (held?.level ?? 0);
  }
  if (offer.kind === 'device-acquire') return 2;
  return 1;
}

/** Weighted draw without replacement — the stochastic leg. */
export function drawOffers(
  candidates: DraftOffer[],
  count: number,
  random: () => number,
  devices: readonly DeviceRuntime[] = [],
): DraftOffer[] {
  const pool = [...candidates];
  const picked: DraftOffer[] = [];
  while (picked.length < count && pool.length > 0) {
    const weights = pool.map((o) => drawWeight(o, devices));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      roll -= weights[idx];
      if (roll <= 0) break;
    }
    picked.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
  }
  return picked;
}

/**
 * The seat's draft policy — the half of a personality that is not movement.
 *
 * A seat spends `defenseShare` of its picks defensively, so the policy scores an
 * offer by how much taking it moves the run toward that ratio. This is what makes
 * `defenseShare` a real dial rather than a label: it changes what gets drafted,
 * which changes the DPS curve, which is why `offensivePickGain` is solved from it.
 */
/**
 * Score a policy-driven seat gives up for a heading-bound device. Sized to sit
 * between "never take it" and "take it as readily as a radial shape": it cancels
 * the acquire bonus rather than the whole offer, so the device still enters a
 * rotation that has room for it and still deepens when the draw favours it.
 */
export const HEADING_BOUND_DISCOUNT = 7;

/**
 * How much a device wants its next level: rises toward `maxLevel`, so the run
 * finishes what it starts instead of levelling everything to four.
 */
function levelPressure(defId: string, devices: readonly DeviceRuntime[]): number {
  const def = DEVICES.find((d) => d.id === defId);
  const held = devices.find((d) => d.defId === defId);
  if (!def || !held) return 0;
  return 8 * Math.pow(held.level / def.maxLevel, 2);
}

export function scoreOffer(
  offer: DraftOffer,
  seat: SeatDef,
  takenDefensive: number,
  takenTotal: number,
  devices: readonly DeviceRuntime[] = [],
): number {
  if (offer.kind === 'evolution') return 100;

  const currentShare = takenTotal > 0 ? takenDefensive / takenTotal : 0;
  const wantsDefensive = currentShare < seat.defenseShare;
  const aligned = offer.defensive === wantsDefensive;
  let score = aligned ? 10 : 4;

  // Breadth EARLY, depth after. A second device is worth more than a fourth
  // level of the first — the area shapes are what scale with density, so a
  // single-device rotation is not a rotation. But unconditional breadth is a
  // trap: the first policy weighted `device-acquire` flat, the seat spread across
  // all four devices, and across 17 picks nothing ever reached `maxLevel`, so
  // ZERO evolutions fired in a roster sized around 2–3 per run. The payoff moment
  // has to be reachable, which means the policy must commit.
  if (offer.kind === 'device-acquire') score += takenTotal < 6 ? 7 : 1;

  // Depth on a device that is close to recombining — the last levels are worth
  // more than the first, because they are what buys the evolution.
  if (offer.kind === 'device-level') score += levelPressure(offer.id, devices);

  // A heading-bound device is worth less to a policy than to a hand, and the
  // draft is where that belongs. `cone` fires along the movement heading, so its
  // value is the value of a manoeuvre — kite, swing the wedge onto the mass as
  // the cooldown lands, fire, resume. `CONNECT_WEIGHT` in the steering policy
  // buys the swing and it genuinely works (that seat's cone went 55.7% → 73.6%
  // connect, 0.7% → 6.1% of kills at four levels), but a policy executing it
  // still lands well under the omnidirectional shapes' 20–63%, because a wedge
  // it has to earn is worth less than coverage it is simply given.
  //
  // So the discount is a discount and not a ban: the device is real, it is
  // reachable, and a hand aims it far better than an arg-max with a turn cost
  // ever will. Under a player seat this term is absent entirely and the offer
  // scores on its merits — which is the honest statement that a roster can hold
  // devices whose value depends on who is driving. Improve the manoeuvre and
  // this should shrink; delete it before improving the manoeuvre and the seat
  // goes back to sinking six levels into a device that returns 1%.
  if (seat.driver !== 'player' && isHeadingBound(offer.id)) {
    score -= HEADING_BOUND_DISCOUNT;
  }

  // Collect reagents move η, which the closed form assumes rather than derives —
  // a seat that leans on income should take them when it is short of them.
  if (offer.kind === 'reagent') {
    const reagent = REAGENT_BY_ID.get(offer.id);
    if (reagent?.effect === 'collect') score += seat.eta * 3;
  }
  return score;
}

export function createDraftModule(options: { seed?: number } = {}): EngineModule {
  return {
    id: 'survivor/draft',
    dependencies: ['survivor/run'],
    install(ctx) {
      const arena = ctx.inject(ArenaKey);
      const run = ctx.inject(RunKey);
      const random = createSeededRNG(options.seed ?? getSeed());

      const offers = shallowRef<DraftOffer[]>([]);
      const taken: Record<OfferKind, number> = {
        'device-acquire': 0,
        'device-level': 0,
        reagent: 0,
        evolution: 0,
      };
      let takenDefensive = 0;
      let takenTotal = 0;

      const apply = (offer: DraftOffer): void => {
        const state = arena.state.value;
        switch (offer.kind) {
          case 'device-acquire':
            state.devices.push({ defId: offer.id, level: 1, timer: 0 });
            break;
          case 'device-level': {
            const held = state.devices.find((d) => d.defId === offer.id);
            if (held) held.level += 1;
            break;
          }
          case 'reagent':
            state.reagentStacks.set(offer.id, (state.reagentStacks.get(offer.id) ?? 0) + 1);
            break;
          case 'evolution': {
            const evo = EVOLUTIONS.find((e) => e.id === offer.id);
            const held = evo && state.devices.find((d) => d.defId === evo.deviceId);
            if (held) held.evolutionId = offer.id;
            break;
          }
        }
        taken[offer.kind] += 1;
        takenTotal += 1;
        if (offer.defensive) takenDefensive += 1;
        // Same mutate-in-place caveat as `arena.ts`: notify explicitly.
        triggerRef(arena.state);
      };

      const choose = (index: number): void => {
        const offer = offers.value[index];
        if (!offer) return;
        apply(offer);
        offers.value = [];
        run.consumePick();
      };

      ctx.onTick(() => {
        // Reset the roster's bookkeeping when a fresh run begins.
        if (run.level.value === 0 && takenTotal > 0) {
          takenTotal = 0;
          takenDefensive = 0;
          for (const k of Object.keys(taken) as OfferKind[]) taken[k] = 0;
          offers.value = [];
        }
        if (run.pendingPicks.value <= 0) return;

        if (offers.value.length === 0) {
          const candidates = candidateOffers(arena.state.value);
          if (candidates.length === 0) {
            run.consumePick();
            return;
          }
          offers.value = drawOffers(candidates, OFFER_COUNT, random, arena.state.value.devices);
        }

        // The AI seat answers immediately. A human seat simply does not, and the
        // run module holds the floor until `ui/DraftOverlay.vue` calls `choose`.
        const seat = arena.seat.value;
        if (seat.driver === 'player') return;

        let bestIdx = 0;
        let bestScore = -Infinity;
        offers.value.forEach((offer, i) => {
          const score = scoreOffer(
            offer,
            seat,
            takenDefensive,
            takenTotal,
            arena.state.value.devices,
          );
          if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
          }
        });
        choose(bestIdx);
      });

      ctx.provide(DraftKey, {
        offers,
        offerCount: OFFER_COUNT,
        choose,
        taken: computed(() => ({ ...taken })),
      });
    },
  };
}
