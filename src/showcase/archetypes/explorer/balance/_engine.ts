/**
 * Shared probe fixture — not runnable on its own.
 *
 * Builds a real explorer engine and plays it to the Hart under a greedy walker:
 * shop, then walk to the best reachable tile, hunt what is there, and go home
 * when the pack fills. The walker is balance-harness tooling, not a mechanic.
 * Spoor ships no automation, and no player-facing tier would walk for you.
 *
 * The walker stands in for the spine's reference player, so its rules are the
 * spine's assumptions:
 * - it buys racks to `racksFor(k)` first, and producers only from stores the
 *   next rack, the next camp and one satchel refill have not spoken for — except
 *   a snare line when the lodge is starving;
 * - it hunts the deepest band's timid quarry, and dangerous quarry and dens only
 *   with a nearly empty pack, since a mauling loses it;
 * - it plans every walk on water as well as jerky, and heads for water when its
 *   skin is half empty;
 * - on an empty larder it hunts what is in reach and charting waits.
 * `FIELD_FACTOR` is measured under these rules: change them and re-solve it.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list
 * for tick-by-tick behavioral specs; this records an arc and prints magnitudes.
 */

import { seedRNG, toNumber, type GridCoord } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { ANCHORS, LODGE, MAP_W, racksFor, speciesById, type GearId } from '../data';
import {
  createExplorerModules,
  getChronicle,
  getHuntsman,
  getLodge,
  getWold,
  type Beat,
} from '../modules';

/** Sim-seconds per tick: a step is 0.5s and a hunt 3s, so 0.25s resolves both. */
export const DT = 0.25;

const GEAR_ORDER: GearId[] = [
  'waders',
  'snowshoes',
  'lantern',
  'bow',
  'frame',
  'skin',
  'satchel',
  'hounds',
];

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

  const idx = (c: GridCoord) => c.y * MAP_W + c.x;
  const at = (c: GridCoord) => man.pos.value.x === c.x && man.pos.value.y === c.y;
  const n = (r: { value: unknown }) => toNumber(r.value as number);

  function deepestBand(): number {
    let best = 0;
    for (const b of chronicle.beats.value) {
      const m = /^enter band (\d)$/.exec(b.label);
      if (m) best = Math.max(best, Number(m[1]));
    }
    return best;
  }

  // === POLICY ===

  function shop(): void {
    for (const id of GEAR_ORDER) {
      if (id === 'hounds' && (lodge.gearLevel('hounds') >= 2 || lodge.gearLevel('satchel') < 1))
        continue;
      if (id === 'satchel' && wold.camps.value.length >= 3) continue;
      lodge.buyGear(id);
    }
    // Racks to the spine's count for the deepest band reached, or whenever the store cannot refill the satchel.
    const racksShort = toNumber(lodge.racks.count.value) < racksFor(deepestBand());
    if (racksShort || n(lodge.stores.jerky) < man.supplyCap.value) lodge.buyRack();
    // Producers come out of wood the spine has not spoken for: the next rack it calls for, and the next camp.
    // Meat the racks need to smoke one satchel refill stays in the store.
    const meatReserved = man.supplyCap.value / ANCHORS.jerkyPerMeat;
    const woodReserved =
      (racksShort ? toNumber(lodge.racks.getCost(1)) : 0) +
      (wold.camps.value.length < 4 ? man.campCost.value : 0);
    // A starving lodge — no jerky out or in, no meat to smoke — buys a snare line
    // with any wood it has: meat that walks in is the only way out.
    const starving =
      n(man.supply) + n(lodge.stores.jerky) + n(lodge.stores.meat) * ANCHORS.jerkyPerMeat <
      2 * wold.stepCost.value;
    for (const p of lodge.producers.getAll()) {
      const r = p.producer.repeatable!;
      if (p.def.id === 'snare' && n(lodge.stores.meat) > 30) continue;
      if (p.def.id === 'snare' && starving) {
        lodge.buyProducer('snare');
        continue;
      }
      const reserved = p.def.payer === 'wood' ? woodReserved : meatReserved;
      const spare = n(lodge.stores[p.def.payer]) - reserved;
      if (spare > 2 * toNumber(r.getCost(1))) lodge.buyProducer(p.def.id);
    }
  }

  /** Dangerous quarry only when a mauling would cost little: the pack nearly empty. */
  function okToHunt(id: string): boolean {
    const s = speciesById.get(id as never)!;
    const p = man.huntChance(s);
    if (s.id === 'hart') return p >= 0.45;
    if (s.dangerous) return p >= 0.6 && man.packLoad.value < 0.25 * man.packCap.value;
    return p >= 0.3;
  }

  function isFrontier(x: number, y: number): boolean {
    for (const c of wold.grid.neighbors(x, y)) if (wold.grid.explored[idx(c)] === 0) return true;
    return false;
  }

  function nearestRestock(here: Float64Array): GridCoord {
    let best = LODGE;
    let d = here[idx(LODGE)];
    for (const j of wold.camps.value) {
      if (here[j] < d) {
        d = here[j];
        best = { x: j % MAP_W, y: Math.floor(j / MAP_W) };
      }
    }
    return best;
  }

  /** The nearest water source the walker's water reaches, or null. */
  function nearestWater(hereW: Float64Array, srcW: Float64Array): GridCoord | null {
    let best: GridCoord | null = null;
    let d = n(man.water);
    for (let j = 0; j < srcW.length; j++) {
      if (srcW[j] !== 0 || !(hereW[j] <= d) || j === idx(man.pos.value)) continue;
      d = hereW[j];
      best = { x: j % MAP_W, y: Math.floor(j / MAP_W) };
    }
    return best;
  }

  /**
   * Head home to bank: the lodge when the walk fits the satchel, else the nearest
   * camp; with the sledge, the nearest camp banks too. Water first if the walk
   * home would run the skin dry.
   */
  function goHome(here: Float64Array): void {
    walkingToChart = false;
    const hereW = man.hereWaterField();
    let target =
      here[idx(LODGE)] <= n(man.supply) && !wold.hasTrophy('sledge') ? LODGE : nearestRestock(here);
    if (hereW[idx(target)] > n(man.water))
      target = nearestWater(hereW, wold.waterField()) ?? target;
    man.walkTo(target);
  }

  let walkingToChart = false;

  function policy(): void {
    if (chronicle.won.value) return;
    shop();
    if (man.action.value !== 'idle') return;
    man.buildCamp();

    const home = wold.homeField();
    const here = man.hereField();
    const srcW = wold.waterField();
    const hereW = man.hereWaterField();
    const supply = n(man.supply);
    const water = n(man.water);
    const i = idx(man.pos.value);
    const packFull = man.packLoad.value >= man.packCap.value * 0.85;
    const banksHere = at(LODGE) || (wold.hasTrophy('sledge') && wold.isCamp(i));
    // Low water: the next water is the job.
    const thirsty = water < 0.5 * man.waterCap.value;

    if (packFull && !banksHere) {
      goHome(here);
      return;
    }
    const s = man.herdAt(man.pos.value.x, man.pos.value.y);
    // At a restock point with jerky still smoking, leave only on a full satchel.
    const smoking = lodge.smokeRate.value > 0 || n(lodge.stores.jerky) > 0;
    if (
      wold.isRestock(man.pos.value.x, man.pos.value.y) &&
      supply < man.supplyCap.value - 0.01 &&
      smoking
    )
      return;
    if (
      s &&
      supply - ANCHORS.supplyPerHunt >= home[i] &&
      water - ANCHORS.waterPerHunt >= srcW[i] &&
      okToHunt(s.id)
    ) {
      man.hunt();
      return;
    }

    // Score every charted tile the walker can reach and still walk home from.
    let best: GridCoord | null = null;
    let bestScore = -Infinity;
    let bestIsFrontier = false;
    const wantCamp = wold.camps.value.length < 4 && n(lodge.stores.wood) >= man.campCost.value;
    const band = deepestBand();
    // An empty larder: the store and the meat it could smoke cannot refill the satchel.
    // Then any quarry in reach is the job, and charting waits.
    const hungry =
      n(lodge.stores.jerky) + n(lodge.stores.meat) * ANCHORS.jerkyPerMeat < man.supplyCap.value;
    for (let j = 0; j < wold.tiles.length; j++) {
      if (j === i || !Number.isFinite(here[j])) continue;
      if (here[j] + home[j] + ANCHORS.supplyPerHunt > supply) continue;
      if (hereW[j] + srcW[j] + ANCHORS.waterPerHunt > water) continue;
      const t = wold.tiles[j];
      const x = j % MAP_W;
      const y = Math.floor(j / MAP_W);
      let score = -Infinity;
      const herd = man.herdAt(x, y);
      if (thirsty && srcW[j] === 0) {
        score = 4800 - hereW[j];
      } else if (herd && okToHunt(herd.id) && !packFull) {
        // Quarry of the deepest band reached is the job; shallower quarry is filler.
        // A den is worth a detour: its trophy changes the ground.
        score =
          herd.id === 'hart'
            ? 1e6
            : herd.trophy
              ? 4200 - 4 * here[j]
              : (herd.band >= band || hungry ? 3000 : 0) + 10 * herd.meat - 4 * here[j];
      } else if (t.feature === 'waystone' && !wold.isCamp(j) && wantCamp) {
        score = 5000 - here[j];
      } else if (t.feature === 'lookout' && !wold.looted.value.includes(j)) {
        score = 4000 - here[j];
      } else if (t.feature === 'cache' && !wold.looted.value.includes(j)) {
        score = 3500 - here[j];
      } else if (isFrontier(x, y)) {
        // Charting deeper than any band entered beats hunting; charting behind you is filler.
        score = (t.band >= band && !hungry ? 3200 : 200) + 20 * t.depth - 3 * here[j];
      }
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
        bestIsFrontier = !herd && t.feature == null && isFrontier(x, y);
      }
    }
    if (best && bestScore > -Infinity) {
      walkingToChart = bestIsFrontier;
      man.walkTo(best);
      return;
    }
    // Nothing in reach: go back to the nearest restock and wait for jerky.
    if (!wold.isRestock(man.pos.value.x, man.pos.value.y) || (man.packLoad.value > 0 && !banksHere))
      goHome(here);
  }

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
      if (walkingToChart) L.chart += DT;
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
    policy();
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
