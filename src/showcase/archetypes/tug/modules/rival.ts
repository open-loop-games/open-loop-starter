import {
  random,
  toNumber,
  weightedPick,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { ANCHORS, TROOP_IDS, lordAt, troop, type Temperament, type TroopId } from '../data';
import { CausewayKey, type CausewayApi, type Wave } from './causeway';
import { ChronicleKey } from './chronicle';
import { KeepKeys, type KeepApi } from './keep';
import { other } from './sides';

/** What a commander sees at its horn. Distances are paces from its own gate. */
export interface WaveView {
  /** Releases this keep has made this battle. */
  wave: number;
  silver: number;
  income: number;
  /** Seconds of the season left: what a tithe raised now has to pay back in. */
  seasonLeft: number;
  tithes: number;
  titheCost: number;
  /** Troops it can raise now, with their squad prices. */
  prices: Partial<Record<TroopId, number>>;
  /** Members it may still raise under the muster. */
  room: number;
  front: number;
  line: number | null;
  /** Silver it has standing on the causeway, all troops and engines only. */
  worth: number;
  siegeWorth: number;
  /** The other keep's last release, in squads by troop. */
  theirLast: Wave;
}

export type Intent = 'hold' | 'line' | 'charge' | 'push';

export interface Order {
  intent: Intent;
  tithe: boolean;
  /** Squads to raise, in order. */
  squads: TroopId[];
}

/** What each intent asks a wave to be made of, before the temperament's bias. */
const TEMPLATE: Record<Intent, Partial<Record<TroopId, number>>> = {
  hold: { pike: 0.6, bow: 0.4 },
  line: { pike: 0.5, bow: 0.5 },
  charge: { horse: 0.7, pike: 0.3 },
  push: { pike: 0.6, bow: 0.3, horse: 0.1 },
};

const answerTo = (id: TroopId): TroopId | undefined => TROOP_IDS.find((t) => troop(t).beats === id);

/**
 * A lord's wave, chosen at its horn. Hold when pushed back into its own quarter; charge when
 * the other keep's last wave was bow-heavy, or on the temperament's rhythm; push once its
 * front is past the middle, bringing engines then; otherwise a line of pike and bow. Each
 * squad is drawn from the intent's template, biased by the temperament and shifted toward
 * the answer to the other keep's last wave. Pure: the same view and roll give the same order.
 */
export function chooseWave(view: WaveView, temper: Temperament, roll: () => number): Order {
  const L = ANCHORS.causewayLength;
  let silver = view.silver;
  let room = view.room;

  const payback = view.titheCost / Math.max(view.income * ANCHORS.titheStep, 1e-9);
  const tithe =
    view.tithes < temper.tithes && payback < view.seasonLeft / 2 && silver >= view.titheCost;
  if (tithe) silver -= view.titheCost;

  const theirs = Object.values(view.theirLast).reduce((a, n) => a + (n ?? 0), 0);
  const bowShare = theirs > 0 ? (view.theirLast.bow ?? 0) / theirs : 0;
  const intent: Intent =
    view.line !== null && view.line < L / 4
      ? 'hold'
      : roll() < bowShare * temper.counterRead * 2 || view.wave % temper.chargeEvery === 0
        ? 'charge'
        : view.front > L / 2
          ? 'push'
          : 'line';

  const squads: TroopId[] = [];
  const buy = (id: TroopId): boolean => {
    const price = view.prices[id];
    const size = troop(id).squad;
    if (price === undefined || price > silver || size > room) return false;
    silver -= price;
    room -= size;
    squads.push(id);
    return true;
  };

  // Engines only on a push, and never more than the temperament's share of the host's worth.
  if (intent === 'push' && view.prices.siege !== undefined) {
    let budget = temper.siegeShare * (view.worth + silver) - view.siegeWorth;
    while (budget >= view.prices.siege && buy('siege')) budget -= view.prices.siege;
  }

  const open = (Object.keys(view.prices) as TroopId[]).filter((id) => id !== 'siege');
  const items = open.map((id) => {
    const countered = (Object.entries(view.theirLast) as [TroopId, number][])
      .filter(([seen]) => answerTo(seen) === id)
      .reduce((a, [, n]) => a + n, 0);
    const read = theirs > 0 ? (countered / theirs) * temper.counterRead : 0;
    return { item: id, weight: (TEMPLATE[intent][id] ?? 0) * (temper.mix[id] ?? 1) + read };
  });
  const cheapest = [...open].sort((a, b) => view.prices[a]! - view.prices[b]!)[0];
  for (let guard = 0; guard < 200; guard++) {
    const id = weightedPick(items, roll);
    if (id && buy(id)) continue;
    if (!cheapest || !buy(cheapest)) break;
  }
  return { intent, tithe, squads };
}

/** Builds a keep's view at its horn. */
export function viewOf(
  keep: KeepApi,
  causeway: CausewayApi,
  wave: number,
  seasonSeconds: number,
): WaveView {
  const side = keep.side;
  const prices: WaveView['prices'] = {};
  for (const id of TROOP_IDS) {
    if (keep.isOpen(id)) prices[id] = toNumber(keep.troops.getPurchasable(id)!.getCost(1));
  }
  const line = causeway.line();
  return {
    wave,
    silver: toNumber(keep.silver.value),
    income: keep.income.value,
    seasonLeft: Math.max(0, seasonSeconds - causeway.clock.value),
    tithes: toNumber(keep.tithe.count.value),
    titheCost: toNumber(keep.tithe.getCost(1)),
    prices,
    room: causeway.room(side),
    front: causeway.front(side),
    line: line === null ? null : side === 'player' ? line : ANCHORS.causewayLength - line,
    worth: causeway.worth(side),
    siegeWorth: causeway.worth(side, 'siege'),
    theirLast: causeway.lastWave[other(side)].value,
  };
}

/** Carries out an order on a keep: the tithe, then each squad it can still afford. */
export function execute(keep: KeepApi, order: Order): void {
  if (order.tithe && keep.tithe.canPurchase.value) keep.tithe.purchase(1);
  for (const id of order.squads) keep.raise(id, 1);
}

/** A commander for one keep: at each horn, chooses a wave under a temperament and raises it. */
export type Commander = (wave: number, seasonSeconds: number) => Order;

export function createCommander(
  keep: KeepApi,
  causeway: CausewayApi,
  temperament: () => Temperament,
  roll: () => number = random,
): Commander {
  return (wave, seasonSeconds) => {
    const order = chooseWave(viewOf(keep, causeway, wave, seasonSeconds), temperament(), roll);
    execute(keep, order);
    return order;
  };
}

export const RivalKey: InjectionKey<Commander> = Symbol('tug/rival') as InjectionKey<Commander>;

/**
 * The lord across the causeway: the rival keep's commander, under the temperament of the
 * lord at the current rung. Game code, not automation the player unlocks: its waves are the
 * pressure the player reads and answers.
 */
// The persona-roster composition (engine consumer guide): a keyed param bundle over one pure
// decision function. The temperament comes from the rung, not a rotation, so no Sequencer.
export function createRivalModule(): EngineModule {
  return {
    id: 'tug/rival',
    dependencies: ['tug/chronicle', 'tug/causeway', 'tug/keep-rival'],
    install(ctx) {
      const chronicle = ctx.inject(ChronicleKey);
      const causeway = ctx.inject(CausewayKey);
      const keep = ctx.inject(KeepKeys.rival);
      ctx.provide(
        RivalKey,
        createCommander(keep, causeway, () => lordAt(chronicle.rung.value).temperament),
      );
    },
  };
}
