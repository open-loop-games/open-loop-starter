/**
 * Shared probe fixture, not runnable on its own. Builds a real survivor engine and plays
 * takes on it with the star improvising: the shipping steering and draft policies
 * (`../modules/sim/steering.ts`, `../modules/sim/draft.ts`), driven tick by tick at the live
 * rate, so the sim plays the code the game ships. Between takes the reference agent signs
 * the next star once it can, else buys the cheapest agency level.
 *
 * This is not a duplicate of `../sim/harness.ts`: that boots the module list for behavioral
 * specs; this plays whole takes and reads magnitudes.
 */

import {
  addResource,
  seedRNG,
  toNumber,
  type Engine,
  type TuningRegistry,
} from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { RATINGS, STARS, type Driver, type StarDef } from '../data';
import {
  INTERVAL_RATE,
  MetaKey,
  SurvivorTuningRegistryKey,
  TakeKey,
  createSurvivorModules,
  type MetaApi,
  type SurvivorTunableKey,
  type TakeApi,
} from '../modules';
import type { TakeEnd } from '../modules/sim/arena';

export interface Set {
  engine: Engine;
  take: TakeApi;
  meta: MetaApi;
  tuning: TuningRegistry;
  dispose(): void;
}

/** A fresh engine, seeded, at the call sheet before any take. */
export function buildSet(seed: number): Set {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createSurvivorModules()],
    persistenceNamespacePrefix: 'survivor-probe',
    intervalRate: INTERVAL_RATE,
  });
  seedRNG(seed);
  const { engine } = handle;
  return {
    engine,
    take: engine.tryInject(TakeKey)!,
    meta: engine.tryInject(MetaKey)!,
    tuning: engine.tryInject(SurvivorTuningRegistryKey)!,
    dispose: handle.dispose,
  };
}

/** Overrides tunables for the rest of the set's life. */
export function perturb(set: Set, overrides: Partial<Record<SurvivorTunableKey, number>>): void {
  const map = Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, () => v]));
  set.tuning.pushOverrides('probe', map);
}

/** Signs every star and opens every rating, for a probe that sweeps them. */
export function openAll(set: Set): void {
  for (const e of set.meta.stars.getAll()) {
    if (e.purchasable.active.value) continue;
    addResource(set.meta.clout, e.purchasable.getCost(1));
    e.purchasable.purchase(1);
  }
  set.meta.record.bestRatingCleared.value = RATINGS.length - 1;
  set.engine.tickDriver.tickOnce();
}

/** What one take did, for a probe to print. */
export interface TakeResult {
  star: StarDef['id'];
  rating: number;
  seed: number;
  end: TakeEnd;
  seconds: number;
  level: number;
  kills: number;
  reelsDropped: number;
  reelsBanked: number;
  inShotKills: number;
  contactSeconds: number;
  damageTaken: number;
  peakExtras: number;
  turnedAway: number;
  spawned: number;
  clout: number;
  /** Seconds into the take at which each rewrite fired. */
  rewrites: number[];
  /** Pages that bought damage, of those taken. */
  offensive: number;
  picks: number;
  rigs: string;
}

/** Plays one take to its end and returns what happened. */
export function playTake(
  set: Set,
  options: { star: StarDef['id']; rating: number; seed: number; driver?: Driver },
): TakeResult {
  const { take, engine } = set;
  take.startTake({ ...options, driver: options.driver ?? 'instinct' });
  const rewrites: number[] = [];
  let level = toNumber(take.rewrites.level.value);
  while (take.view.screen === 'take') {
    engine.tickDriver.tickOnce();
    const now = toNumber(take.rewrites.level.value);
    for (; level < now; level++) rewrites.push(take.arena()?.t ?? 0);
  }
  const w = take.view.wrap!;
  const a = take.arena()!;
  const result: TakeResult = {
    star: options.star,
    rating: options.rating,
    seed: options.seed,
    end: w.end,
    seconds: w.seconds,
    level: w.level,
    kills: a.stats.kills,
    reelsDropped: a.stats.reelsDropped,
    reelsBanked: a.stats.reelsBanked,
    inShotKills: a.stats.inShotKills,
    contactSeconds: a.stats.contactSeconds,
    damageTaken: a.stats.damageTaken,
    peakExtras: a.stats.peakExtras,
    turnedAway: a.stats.turnedAway,
    spawned: a.stats.spawned,
    clout: w.clout,
    rewrites,
    offensive: take.tally.taken - take.tally.defensive,
    picks: take.tally.taken,
    rigs: a.rigs.map((r) => `${r.def.id}:${r.level}`).join(','),
  };
  take.toCallSheet();
  return result;
}

/** The reference agent between takes: the next star once affordable, else the cheapest agency level. */
export function shop(set: Set): string[] {
  const { meta } = set;
  const bought: string[] = [];
  for (;;) {
    const star = meta.stars
      .getAll()
      .find((e) => !e.purchasable.active.value && e.purchasable.canPurchase.value);
    if (star) {
      star.purchasable.purchase(1);
      bought.push(`signed ${star.def.name}`);
      continue;
    }
    const open = meta.agency
      .getAll()
      .filter((e) => e.purchasable.canPurchase.value)
      .sort((x, y) => toNumber(x.purchasable.getCost(1)) - toNumber(y.purchasable.getCost(1)));
    const next = open[0];
    if (!next) return bought;
    next.purchasable.purchase(1);
    bought.push(`${next.def.name} ${toNumber(next.purchasable.count.value)}`);
  }
}

/** The harshest rating open, and the signed stars in roster order. */
export function callSheet(set: Set): { rating: number; stars: StarDef['id'][] } {
  const open = set.meta.ratings.getAll().filter((e) => e.purchasable.active.value);
  return {
    rating: open[open.length - 1]!.def.index,
    stars: STARS.filter((s) => set.meta.stars.getPurchasable(s.id)?.active.value).map((s) => s.id),
  };
}

/** m:ss */
export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)]!;
}
