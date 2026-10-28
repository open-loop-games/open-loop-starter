/**
 * Shared probe fixture — not runnable on its own.
 *
 * Builds a real explorer engine and plays it to the Hart under `_walker.ts`'s
 * greedy walker, recording where each band's stay went.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list
 * for tick-by-tick behavioral specs; this records an arc and prints magnitudes.
 */

import { seedRNG, toNumber } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { speciesById } from '../data';
import {
  createExplorerModules,
  getChronicle,
  getHuntsman,
  getLodge,
  getWold,
  type Beat,
} from '../modules';
import { createWalker } from './_walker';

/** Sim-seconds per tick: a step is 0.5s and a hunt 3s, so 0.25s resolves both. */
export const DT = 0.25;

/** Time by activity and hides banked while band `k` was the deepest entered. */
export interface BandLedger {
  walk: number;
  /** of `walk`, seconds walking toward a frontier tile to chart it */
  chart: number;
  hunt: number;
  wait: number;
  /** seconds of `wait` at a restock point whose store could not fill the satchel */
  waitJerky: number;
  /** of `waitJerky`, seconds the racks ran below capacity for want of meat or wood */
  waitStarved: number;
  /** cumulative hides banked when the band was last the deepest */
  hides: number;
  kills: number;
  /** kills of the band's own quarry; the rest are shallower */
  killsDeep: number;
}

export interface ArcRecord {
  seed: number;
  beats: Beat[];
  ledger: BandLedger[];
  kills: Record<string, number>;
  /** one line every 180 sim-seconds */
  snapshots: string[];
  won: boolean;
  simSeconds: number;
  losses: number;
  /** seconds the walker stood still with nothing in reach, at the end */
  stuckSeconds: number;
}

/** Play one arc to the Hart, or to `maxSimSeconds`. `seed` drives the hunt rolls. */
export async function runArc(seed: number, maxSimSeconds = 3600): Promise<ArcRecord> {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createExplorerModules()],
    persistenceNamespacePrefix: 'explorer-probe',
    intervalRate: 1 / DT,
  });
  // After boot: the engine seeds its RNG when it is created.
  seedRNG(seed);
  const chronicle = getChronicle();
  const lodge = getLodge();
  const wold = getWold();
  const man = getHuntsman();

  const walker = createWalker();
  const deepestBand = walker.deepestBand;
  const n = (r: { value: unknown }) => toNumber(r.value as number);

  // === ACCOUNTING ===

  const ledger: BandLedger[] = [];
  let lastKills: Record<string, number> = {};
  function account(): void {
    const band = deepestBand();
    while (ledger.length <= band)
      ledger.push({
        walk: 0,
        chart: 0,
        hunt: 0,
        wait: 0,
        waitJerky: 0,
        waitStarved: 0,
        hides: 0,
        kills: 0,
        killsDeep: 0,
      });
    const L = ledger[band];
    const a = man.action.value;
    if (a === 'walk') {
      L.walk += DT;
      if (walker.walkingToChart) L.chart += DT;
    } else if (a === 'hunt') L.hunt += DT;
    else {
      L.wait += DT;
      const room = man.supplyCap.value - n(man.supply);
      if (
        wold.isRestock(man.pos.value.x, man.pos.value.y) &&
        room > 0.01 &&
        n(lodge.stores.jerky) < room
      ) {
        L.waitJerky += DT;
        const capacity = toNumber(lodge.racks.count.value) * lodge.rackJerkyRate.value;
        if (lodge.smokeRate.value < 0.99 * capacity) L.waitStarved += DT;
      }
    }
    for (const [id, k] of Object.entries(man.kills.value)) {
      const d = k - (lastKills[id] ?? 0);
      if (d <= 0) continue;
      L.kills += d;
      if (speciesById.get(id as never)!.band >= band) L.killsDeep += d;
    }
    lastKills = { ...man.kills.value };
    L.hides = toNumber(lodge.stores.hide.cumulative!.value);
  }

  function snapshot(t: number): string {
    const s = lodge.stores;
    const gear = (
      ['waders', 'snowshoes', 'lantern', 'bow', 'frame', 'satchel', 'skin', 'hounds'] as const
    )
      .map((id) => `${id[0]}${lodge.gearLevel(id)}`)
      .join('');
    return [
      `t=${String(Math.round(t)).padStart(5)}s`,
      `band ${deepestBand()}`,
      `chart ${wold.chartedCount.value}`,
      `meat ${n(s.meat).toFixed(0)} hide ${n(s.hide).toFixed(0)} ant ${n(s.antler).toFixed(0)} wood ${n(s.wood).toFixed(0)} jerky ${n(s.jerky).toFixed(0)}+${n(man.supply).toFixed(0)}`,
      `gear ${gear}`,
      `racks ${toNumber(lodge.racks.count.value)} cut ${toNumber(lodge.producers.getProducer('woodcutter')!.ownedCount.value)} snare ${toNumber(lodge.producers.getProducer('snare')!.ownedCount.value)}`,
      `camps ${wold.camps.value.length}`,
      `prowess ${man.prowess.value.toFixed(1)} lvl ${toNumber(man.skill.level.value)}`,
    ].join(' | ');
  }

  // === RUN ===

  const snapshots: string[] = [];
  let sim = 0;
  let nextSnap = 0;
  let losses = 0;
  let lossCursor = 0;
  let lastKey = '';
  let stuck = 0;
  while (sim < maxSimSeconds && !chronicle.won.value) {
    await handle.tick(1);
    sim += DT;
    walker.step();
    const key = `${man.pos.value.x},${man.pos.value.y},${man.action.value},${wold.chartedCount.value}`;
    stuck = key === lastKey ? stuck + DT : 0;
    lastKey = key;
    if (sim >= nextSnap) {
      nextSnap += 180;
      snapshots.push(snapshot(sim));
    }
    account();
    const fresh = chronicle.log.since(lossCursor);
    if (fresh.length) lossCursor = fresh[fresh.length - 1].seq;
    if (fresh.some((e) => e.kind === 'bad')) losses++;
    for (const r of Object.values(lodge.stores))
      if (!Number.isFinite(toNumber(r.value))) throw new Error(`non-finite ${r.displayName}`);
  }
  snapshots.push(snapshot(sim));

  const record: ArcRecord = {
    seed,
    beats: [...chronicle.beats.value],
    ledger,
    kills: { ...man.kills.value },
    snapshots,
    won: chronicle.won.value,
    simSeconds: sim,
    losses,
    stuckSeconds: stuck,
  };
  handle.dispose();
  return record;
}
