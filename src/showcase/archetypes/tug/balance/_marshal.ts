/**
 * Shared probe fixture, not runnable on its own. Builds a real tug engine and plays it with
 * the reference marshal in Fairhold's seat: the rival's shipping decision function
 * (`../modules/rival.ts`, `createCommander`) under a marshal's temperament, so the sim plays
 * the code the rival ships. Between battles the marshal takes a weapon boon as soon as one
 * opens, then alternates the two strength boons. It never raises the Stone Curtain.
 *
 * The game ships no player automation, so the marshal is probe-side. This is not a
 * duplicate of `../sim/harness.ts`: that boots the module list for tick-by-tick behavioral
 * specs; this plays whole battles and reads magnitudes.
 */

import { seedRNG, toNumber, type Engine, type TuningRegistry } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { ANCHORS, BOONS, FIELDS, LORDS, NO_TWIST, TROOP_IDS, type Temperament } from '../data';
import {
  BattleKey,
  CausewayKey,
  ChronicleKey,
  KeepKeys,
  TugTuningRegistryKey,
  createCommander,
  createTugModules,
  type BattleApi,
  type BattleRecord,
  type CausewayApi,
  type ChronicleApi,
  type KeepApi,
  type Side,
  type TugTunableKey,
} from '../modules';

/** Sim seconds per runner step: one engine tick at the harness's interval rate. */
export const DT = 0.25;
export const INTERVAL_RATE = 4;

/** The reference marshal: reads the other keep's horn hard and keeps a balanced line. */
export const MARSHAL: Temperament = {
  id: 'marshal',
  mix: { pike: 1, horse: 1, bow: 1 },
  counterRead: 0.6,
  chargeEvery: 4,
  tithes: 2,
  siegeShare: 0.25,
  profile: [{ from: 0, spend: 1 }],
  earlyHorn: true,
};

export interface Game {
  engine: Engine;
  battle: BattleApi;
  chronicle: ChronicleApi;
  causeway: CausewayApi;
  keeps: Record<Side, KeepApi>;
  tuning: TuningRegistry;
  dispose(): void;
}

/** A fresh engine, seeded, in camp before any battle. */
export function buildGame(seed: number): Game {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createTugModules()],
    persistenceNamespacePrefix: 'tug-probe',
    intervalRate: INTERVAL_RATE,
  });
  seedRNG(seed);
  return wrapGame(handle.engine, handle.dispose);
}

/** The probe's view of an engine already booted with the tug modules, such as the shipping one. */
export function wrapGame(engine: Engine, dispose: () => void): Game {
  return {
    engine,
    battle: engine.tryInject(BattleKey)!,
    chronicle: engine.tryInject(ChronicleKey)!,
    causeway: engine.tryInject(CausewayKey)!,
    keeps: { player: engine.tryInject(KeepKeys.player)!, rival: engine.tryInject(KeepKeys.rival)! },
    tuning: engine.tryInject(TugTuningRegistryKey)!,
    dispose,
  };
}

/** Overrides tunables for the rest of the game's life. */
export function perturb(g: Game, overrides: Partial<Record<TugTunableKey, number>>): void {
  const map = Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, () => v]));
  g.tuning.pushOverrides('probe', map);
}

/** Seats a commander in Fairhold's keep, under `temperament`. */
export function seatMarshal(g: Game, temperament: Temperament = MARSHAL): void {
  g.battle.commanders.player = createCommander(g.keeps.player, g.causeway, () => temperament);
}

/** Fairhold's commander plays a lord's own temperament: the mirror of `rung`'s lord. */
export function seatMirror(g: Game, rung: number): void {
  seatMarshal(g, LORDS[rung]!.temperament);
}

/** A plain field with every troop open, no champion and fair weather: the probes' lane. */
export const OPEN_FIELD = FIELDS.findIndex(
  (f) => f.open.length === TROOP_IDS.length && !f.features.length && !f.champions.length,
);

/**
 * Seats the next battle on the open field in fair weather, Fairhold's walls armed as the
 * field's lord arms his, so a mirror is a mirror. Read the rung scaling off it with `perturb`.
 */
export function openAll(g: Game): void {
  const c = g.chronicle;
  c.rung.value = OPEN_FIELD;
  c.twistId.value = NO_TWIST.id;
  const kind = c.lord.value.temperament.weapon;
  if (!kind || c.level(kind) > 0) return;
  const boon = BOONS.find((b) => b.id === kind)!;
  // The weapon's boon waits for its volume; credit the renown that reaches it.
  const xp = (ANCHORS.renownBase * boon.minVolume * (boon.minVolume + 1)) / 2;
  c.renown.addXp(Math.max(0, xp - toNumber(c.renown.xp.value)));
  c.boons.getPurchasable(kind)!.purchase(1);
  c.mounted.value = kind;
}

/** What a probe reads once a second of a battle. */
export interface Second {
  t: number;
  /** Where the fronts meet, from Fairhold's gate, or null. */
  line: number | null;
  members: number;
}

export interface BattleOutcome {
  record: BattleRecord | null;
  seconds: number;
  samples: Second[];
}

/**
 * Plays one battle from the toss to a fallen gate, sampling once a second. `first` overrides
 * the toss, so a probe can alternate it rather than trust a short run of seeded tosses.
 */
export function playBattle(g: Game, maxSeconds = 900, first?: Side): BattleOutcome {
  const before = g.chronicle.battles.value;
  g.battle.start(first);
  const samples: Second[] = [];
  let t = 0;
  let next = 1;
  while (t < maxSeconds && g.chronicle.battles.value === before) {
    g.engine.tickDriver.advanceTime(DT);
    t += DT;
    if (t >= next) {
      next += 1;
      samples.push({ t, line: g.causeway.line(), members: g.causeway.members.value.length });
    }
  }
  const done = g.chronicle.battles.value > before;
  return { record: done ? g.chronicle.last.value : null, seconds: t, samples };
}

/** Between battles: a weapon as soon as one opens, then the strength boons in turn, then the curtain. */
export function marshalBetweenBattles(c: ChronicleApi): string[] {
  const bought: string[] = [];
  for (let guard = 0; guard < 20 && toNumber(c.boonPoints.value) >= 1; guard++) {
    const strength = c.level('fields') <= c.level('levies') ? 'fields' : 'levies';
    const pick = ['trebuchet', 'firepots', strength, 'curtain'].find(
      (id) => c.boons.getPurchasable(id)!.canPurchase.value,
    );
    if (!pick) break;
    c.boons.getPurchasable(pick)!.purchase(1);
    bought.push(pick);
  }
  return bought;
}

export function clock(t: number): string {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
