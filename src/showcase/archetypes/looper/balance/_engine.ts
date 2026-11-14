/**
 * Shared probe fixture — not runnable on its own.
 *
 * Builds a real looper engine and plays nights on it under the reference
 * player in `./_player.ts`, seated on the engine's tick driver.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list
 * for tick-by-tick behavioral specs; this records an arc and prints magnitudes.
 */

import { Decimal, runUntil } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { SKILLS, ZONES } from '../data';
import {
  createLooperModules,
  getAutomation,
  getMeta,
  getNight,
  type NightSummary,
} from '../modules';
import { createReferencePlayer, seatPlayer } from './_player';

export const num = (v: unknown): number => new Decimal(v as never).toNumber();

/** Sim-seconds per tick: coarse enough for minute-scale nights, fine enough for 4s reps. */
export const DT = 0.1;

export interface NightRow {
  summary: NightSummary;
  /** mean mastery bonus across the four skills after this night */
  mastery: number;
  /** notes bought after this night */
  bought: string[];
}

export interface ArcRecord {
  nights: NightRow[];
  /** time-stamped beat lines, in firing order */
  beats: string[];
  /** sim-seconds the whole run took, dwell between nights included */
  simSeconds: number;
  anomalies: number;
  stalled: boolean;
}

/** Play `nights` nights and record them. */
export function runArc(nights: number, maxSimSeconds = 3 * 3600): ArcRecord {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createLooperModules()],
    persistenceNamespacePrefix: 'looper-probe',
    intervalRate: 1 / DT,
  });
  const meta = getMeta();
  const night = getNight();
  const automation = getAutomation();
  const player = createReferencePlayer();

  let sim = 0;
  const beats: string[] = [];
  const beat = (msg: string) =>
    beats.push(
      `t=${sim.toFixed(1).padStart(7)}s  nights done ${String(night.cycle.count.value).padStart(2)}  ${msg}`,
    );
  const zonesSeen = new Set<string>(['cell']);
  const tiersSeen = new Set<string>(['manual']);
  const rows: NightRow[] = [];
  let firstPurchase = false;
  let anomalies = 0;
  let idle = 0;
  let stalled = false;

  player.begin();
  beat('first night begins');

  /** What the player bought at the latest dusk, read with the night that ended. */
  let bought: string[] = [];
  /** Nights done before the latest advance; a rise after it is a night that ended. */
  let before = night.cycle.count.value;
  const unseat = seatPlayer(handle.engine, (b) => {
    bought = b;
  });
  try {
    runUntil({
      engine: handle.engine,
      tickDelta: DT,
      maxSimTime: maxSimSeconds,
      until: ({ iteration, simTime }) => {
        if (iteration > 0) {
          sim = simTime;
          const nerve = num(night.nerve.value);
          if (!Number.isFinite(nerve) || !Number.isFinite(night.work.value)) {
            anomalies++;
            if (anomalies < 5) beat(`ANOMALY nerve=${nerve} work=${night.work.value}`);
          }
          for (const z of ZONES)
            if (!zonesSeen.has(z.id) && meta.zones.isUnlocked(z.id)) {
              zonesSeen.add(z.id);
              beat(`discovered ${z.displayName}`);
            }

          if (night.cycle.count.value > before) {
            const s = night.lastNight.value!;
            beat(
              `night ${s.night} ends (${s.cause}) after ${s.seconds.toFixed(1)}s, depth ${s.depth}${s.escaped ? ' — ESCAPED' : ''}, +${s.intel} intel`,
            );
            if (bought.length) {
              if (!firstPurchase) beat(`first purchase: ${bought[0]}`);
              firstPurchase = true;
              beat(`bought ${bought.join(', ')}`);
            }
            const mastery =
              SKILLS.reduce(
                (a, k) => a + num(night.mastery.getSkill(k.id)!.lifetimeBonus!.value),
                0,
              ) / 4;
            rows.push({ summary: s, mastery, bought });
            bought = [];
          }
          // Read after the dusk's lines: a note bought at dusk unlocks its automation tier.
          for (const t of automation.tiers.tiers)
            if (!tiersSeen.has(t.id) && automation.tiers.isUnlocked(t.id)) {
              tiersSeen.add(t.id);
              beat(`automation tier unlocked: ${t.displayName}`);
            }
          // Routine owns the restart once bought; a long gap between nights is a stuck phase.
          idle = night.nightActive.value ? 0 : idle + DT;
          if (idle > 30) {
            beat('STALL: no night has begun for 30s');
            stalled = true;
            return true;
          }
        }
        before = night.cycle.count.value;
        return night.cycle.count.value >= nights;
      },
    });
  } finally {
    unseat();
  }

  handle.dispose();
  return { nights: rows, beats, simSeconds: sim, anomalies, stalled };
}
