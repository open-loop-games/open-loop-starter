/**
 * Shared probe fixture, not runnable on its own. Builds a real scripter engine and plays
 * it under the reference sensei (`./_sensei.ts`), recording its beats.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list for
 * tick-by-tick behavioral specs; this assembles an instrumented runner that records beats
 * and reads magnitudes.
 */

import { Decimal, type DecimalSource, type Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  DojoKey,
  GateKey,
  GraduationKey,
  KataKey,
  LineageKey,
  createScripterModules,
  openBout,
  type DojoApi,
  type GateApi,
  type GraduationApi,
  type KataApi,
  type LineageApi,
} from '../modules';
import { CHALLENGERS, TECHNIQUES, type ChallengerId, type TechniqueId } from '../data';
import { createReferenceSensei } from './_sensei';

/** Sim seconds per runner step. */
export const DT = 0.5;
export const INTERVAL_RATE = 20;
export const num = (x: DecimalSource) => Decimal.fromValue(x).toNumber();

export interface Game {
  engine: Engine;
  lineage: LineageApi;
  dojo: DojoApi;
  gate: GateApi;
  kata: KataApi;
  graduation: GraduationApi;
  dispose(): void;
}

export function buildGame(): Game {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createScripterModules()],
    persistenceNamespacePrefix: 'scripter-probe',
    intervalRate: INTERVAL_RATE,
  });
  const { engine } = handle;
  return {
    engine,
    lineage: engine.tryInject(LineageKey)!,
    dojo: engine.tryInject(DojoKey)!,
    gate: engine.tryInject(GateKey)!,
    kata: engine.tryInject(KataKey)!,
    graduation: engine.tryInject(GraduationKey)!,
    dispose: handle.dispose,
  };
}

// ─── The arc ───────────────────────────────────────────────────────────

export interface Beat {
  at: number;
  text: string;
}

export interface BoutRow {
  at: number;
  id: ChallengerId;
  won: boolean;
  beats: number;
}

export interface ArcResult extends Game {
  beats: Beat[];
  bouts: BoutRow[];
  firstWins: Partial<Record<ChallengerId, number>>;
  arrivals: Partial<Record<ChallengerId, number>>;
  graduations: { at: number; insight: number }[];
  /** Ki banked by source: training strikes and bounties are told apart by the gate's state. */
  inks: number;
  anomalies: string[];
}

/**
 * Play the arc under the reference sensei.
 *
 * @param seconds - sim seconds to play
 */
export function runArc(seconds: number): ArcResult {
  const g = buildGame();
  const { engine, lineage, dojo, gate, kata } = g;
  const out: ArcResult = {
    ...g,
    beats: [],
    bouts: [],
    firstWins: {},
    arrivals: {},
    graduations: [],
    inks: 0,
    anomalies: [],
  };
  let t = 0;
  const beat = (text: string) => out.beats.push({ at: t, text });
  kata.tiers.on('unlocked', (id) =>
    beat(
      `executor tier → ${id} (beat ${kata.beatSeconds.value.toFixed(2)}s, ${kata.lineCap.value} moves)`,
    ),
  );

  const sensei = createReferenceSensei();
  let lastBout = gate.last.value;
  const known = new Set<TechniqueId>();
  for (; t < seconds; t += DT) {
    engine.tickDriver.advanceTime(DT);

    for (const id of lineage.arrived.value)
      if (out.arrivals[id] === undefined) {
        out.arrivals[id] = t;
        beat(`${id} arrives`);
      }
    for (const tech of TECHNIQUES) {
      if (dojo.knows(tech.id) === known.has(tech.id)) continue;
      if (dojo.knows(tech.id)) {
        known.add(tech.id);
        if (lineage.graduations.value === 0) beat(`learned ${tech.id}`);
      } else known.delete(tech.id);
    }
    if (gate.last.value && gate.last.value !== lastBout) {
      lastBout = gate.last.value;
      out.bouts.push({ at: t, id: lastBout.id, won: lastBout.won, beats: lastBout.beats });
      if (!lastBout.won && !lineage.beaten.value.includes(lastBout.id))
        beat(`lost to ${lastBout.id}`);
      if (lastBout.won && out.firstWins[lastBout.id] === undefined) {
        out.firstWins[lastBout.id] = t;
        beat(`first win over ${lastBout.id} in ${lastBout.beats} beats`);
      }
    }

    // The sensei, once a second.
    if (Math.floor(t) === Math.floor(t - DT)) continue;
    const act = sensei.act();
    if (act.inked) {
      out.inks++;
      if (act.inked.length)
        out.anomalies.push(`${t}s ink errors: ${act.inked.map((e) => e.message).join('; ')}`);
    }
    if (act.graduated !== null) {
      out.graduations.push({ at: t, insight: act.graduated });
      beat(`GRADUATION #${lineage.graduations.value}: +${act.graduated} Insight`);
      for (const s of act.studied) beat(`studied ${s}`);
    }
    const ki = Decimal.fromValue(dojo.ki.value);
    if (ki.isNan() || !Decimal.isFinite(ki)) {
      out.anomalies.push(`${t}s bad Ki ${String(dojo.ki.value)}`);
      break;
    }
  }
  return out;
}

// ─── Bouts in isolation ────────────────────────────────────────────────

/** The Temper the reference sensei holds near Ox-Hide Ren's first win, where Ren's par is read. */
export const REFERENCE_TEMPER = 4;

/**
 * Fight seeded bouts against one challenger under one scroll, on a real engine with every
 * word known and Temper set, and return the beats each took (Infinity for a loss).
 *
 * @param id - the challenger
 * @param scroll - the scroll text
 * @param seeds - how many bouts, seeded 1…n
 * @param temper - the student's Temper (the fist is 1 + Temper)
 */
export function fightBouts(
  id: ChallengerId,
  scroll: string,
  seeds: number,
  temper = REFERENCE_TEMPER,
): number[] {
  const g = buildGame();
  const { engine, dojo, gate, kata, lineage } = g;
  for (const tech of TECHNIQUES) dojo.techniques.getPurchasable(tech.id)!.count.value = 1;
  dojo.temper.count.value = temper;
  lineage.arrived.value = CHALLENGERS.map((c) => c.id);
  // The longest scroll the arc reaches: the top executor tier and all of Old Master's Ink.
  lineage.graduations.value = 3;
  lineage.scrolls.getPurchasable('old-masters-ink')!.count.value = 3;
  engine.tickDriver.advanceTime(0.05);
  const errors = kata.ink(scroll);
  if (errors.length)
    throw new Error(`scroll does not parse: ${errors.map((e) => e.message).join('; ')}`);
  const results: number[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    kata.ink(scroll);
    gate.next.value = null;
    gate.bout.value = openBout(id, seed);
    let guard = 0;
    while (gate.bout.value && guard++ < 1000) engine.tickDriver.advanceTime(kata.beatSeconds.value);
    const last = gate.last.value!;
    results.push(last.won ? last.beats : Infinity);
  }
  g.dispose();
  return results;
}
