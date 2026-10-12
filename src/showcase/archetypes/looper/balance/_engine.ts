/**
 * Shared probe fixture — not runnable on its own.
 *
 * Builds a real looper engine and plays nights on it. The driver works only
 * what a player works by hand: it writes the plan between nights, presses Begin
 * until Routine takes over, and buys notes cheapest-first, the spine's assumed
 * buying rule. Routine and Discipline run as the shipping
 * `modules/automation.ts` once bought.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list
 * for tick-by-tick behavioral specs; this records an arc and prints magnitudes.
 */

import { Decimal } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { ACTIONS, NOTES, SKILLS, ZONES } from '../data';
import {
  createLooperModules,
  getAutomation,
  getMeta,
  getNight,
  type NightSummary,
  type PlanRow,
} from '../modules';

export const num = (v: unknown): number => new Decimal(v as never).toNumber();

/** Sim-seconds per tick: coarse enough for minute-scale nights, fine enough for 4s reps. */
export const DT = 0.1;

/** The route in order, the way a player writes it once the ground is known. */
const ROUTE: PlanRow[] = [
  { id: 'bend-wire', times: 1 },
  { id: 'pick-cell', times: 1 },
  { id: 'coffee', times: 2 },
  { id: 'smokes', times: 2 },
  { id: 'slip-patrol', times: 1 },
  { id: 'hamper', times: 1 },
  { id: 'bribe', times: 1 },
  { id: 'badge-door', times: 1 },
  { id: 'cut-fence', times: 1 },
  { id: 'wall-climb', times: 1 },
];

/** The plan for ground known up to zone `known`: the route so far, then training to fill the night. */
export function planFor(known: number): PlanRow[] {
  const route = ROUTE.filter((r) => ACTIONS.find((a) => a.id === r.id)!.zone <= known);
  const filler: PlanRow[] = [];
  for (let i = 0; i < 12; i++)
    for (const id of ['push-ups', 'shadow-walk', 'rehearse']) filler.push({ id, times: 1 });
  return [...route, ...filler];
}

/** Buy notes cheapest-first until nothing is affordable; returns the ids bought. */
export function buyCheapest(): string[] {
  const { notes } = getMeta();
  const bought: string[] = [];
  for (;;) {
    const open = NOTES.map((s) => notes.getPurchasable(s.id)!)
      .filter((p) => p.visible.value && !p.maxed.value)
      .sort((a, b) => new Decimal(a.getCost(1)).cmp(b.getCost(1)));
    const p = open[0];
    if (!p || !p.canPurchase.value) break;
    p.purchase(1);
    bought.push(p.id);
  }
  return bought;
}

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
export async function runArc(nights: number, maxSimSeconds = 3 * 3600): Promise<ArcRecord> {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createLooperModules()],
    persistenceNamespacePrefix: 'looper-probe',
    intervalRate: 1 / DT,
  });
  const meta = getMeta();
  const night = getNight();
  const automation = getAutomation();

  let sim = 0;
  const beats: string[] = [];
  const beat = (msg: string) =>
    beats.push(
      `t=${sim.toFixed(1).padStart(7)}s  nights done ${String(night.cycle.count.value).padStart(2)}  ${msg}`,
    );
  const discovered = () => ZONES.filter((z) => meta.zones.isUnlocked(z.id)).length - 1;
  const zonesSeen = new Set<string>(['cell']);
  const tiersSeen = new Set<string>(['manual']);
  const rows: NightRow[] = [];
  let firstPurchase = false;
  let anomalies = 0;
  let idle = 0;
  let stalled = false;

  meta.plan.value = planFor(discovered());
  night.beginNight();
  beat('first night begins');

  while (night.cycle.count.value < nights && sim < maxSimSeconds) {
    const before = night.cycle.count.value;
    await handle.tick(1);
    sim += DT;

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
    for (const t of automation.tiers.tiers)
      if (!tiersSeen.has(t.id) && automation.tiers.isUnlocked(t.id)) {
        tiersSeen.add(t.id);
        beat(`automation tier unlocked: ${t.displayName}`);
      }

    if (night.cycle.count.value > before) {
      const s = night.lastNight.value!;
      beat(
        `night ${s.night} ends (${s.cause}) after ${s.seconds.toFixed(1)}s, depth ${s.depth}${s.escaped ? ' — ESCAPED' : ''}, +${s.intel} intel`,
      );
      const bought = buyCheapest();
      if (bought.length) {
        if (!firstPurchase) beat(`first purchase: ${bought[0]}`);
        firstPurchase = true;
        beat(`bought ${bought.join(', ')}`);
      }
      const mastery =
        SKILLS.reduce((a, k) => a + num(night.mastery.getSkill(k.id)!.lifetimeBonus!.value), 0) / 4;
      rows.push({ summary: s, mastery, bought });
      // The player rewrites the plan between nights; Routine, once owned, presses Begin.
      meta.plan.value = planFor(discovered());
      if (!automation.hasReached('routine')) night.beginNight();
    }
    // Routine owns the restart once bought; a long gap between nights is a stuck phase.
    idle = night.nightActive.value ? 0 : idle + DT;
    if (idle > 30) {
      beat('STALL: no night has begun for 30s');
      stalled = true;
      break;
    }
  }

  handle.dispose();
  return { nights: rows, beats, simSeconds: sim, anomalies, stalled };
}
