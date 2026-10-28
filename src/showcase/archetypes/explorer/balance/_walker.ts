/**
 * Shared probe fixture — not runnable on its own.
 *
 * The greedy walker: shop, then walk to the best reachable tile, hunt what is
 * there, and go home when the pack fills. The walker is balance-harness
 * tooling, not a mechanic. Spoor ships no automation, and no player-facing
 * tier would walk for you. The arc probe records an arc under it; the games
 * site's beat script saves at the arc's beats.
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
 */

import { toNumber, type GridCoord } from '@open-loop/engine';
import { ANCHORS, LODGE, MAP_W, racksFor, speciesById, type GearId } from '../data';
import { getChronicle, getHuntsman, getLodge, getWold } from '../modules';

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

export interface Walker {
  /** One decision; call it after every tick. */
  step(): void;
  /** the deepest band entered */
  deepestBand(): number;
  /** whether the walk under way heads for a frontier tile to chart it */
  readonly walkingToChart: boolean;
}

/** Binds the walker to the running engine's modules. */
export function createWalker(): Walker {
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
      const r = p.producer.purchasable!;
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

  return {
    step: policy,
    deepestBand,
    get walkingToChart() {
      return walkingToChart;
    },
  };
}
