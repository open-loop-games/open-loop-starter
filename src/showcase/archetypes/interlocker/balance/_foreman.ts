/**
 * Shared probe fixture — not runnable on its own.
 *
 * Builds a real interlocker engine and plays it Exposition after Exposition under a
 * foreman. The foreman is balance-harness tooling, not a mechanic: the Aluminium Empire
 * ships no automation. He plays the spine's reference player, so his rules are the
 * spine's assumptions, and he raises the build `planFor` gives his empire:
 * - once a second he patents Cités Ouvrières as soon as he can, then every patent he can
 *   afford on the path to the riggers. Coking Ovens and the Rolling Mill take only what
 *   the next patent on the path leaves;
 * - he saves for the cheapest building he wants, by raw value. He wants a market garden
 *   while the gardens feed less than the ration plus GARDEN_LEAD seconds of the next
 *   cité's bread, a cité while no compagnon is idle and the gardens keep up, and
 *   warehouses and raw producers up to the plan, a producer only while its bin is under
 *   90% full;
 * - housing comes first: while the cités patent or a wanted cité is short, nothing else
 *   may spend what it needs, because a cité's compagnons work the whole rest of the run;
 * - he seats compagnons on the most under-weighted open trade. The weights balance one
 *   rigger against the trades that feed him, from the spine's role rates. While a raw
 *   bin is under half full, a trade takes no more seats than draw half that stock's
 *   yield, so the purse keeps filling. He withdraws crew from a trade whose output bin
 *   is full, and moves one compagnon a second from the most over-weighted trade when the
 *   gap is wide;
 * - he stages the Exposition as soon as it pays, then petitions the charters in their
 *   listed order, saving for each before the next.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list for
 * tick-by-tick behavioral specs; this plays an arc and records magnitudes.
 */

import { addResource, toNumber } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  BUILDINGS,
  CHARTERS,
  GARDEN_LEAD,
  RAW,
  RAW_EQ,
  RECIPES,
  RESEARCH,
  RESOURCES,
  ROLES,
  ROLE_RATE,
  UPKEEP_PER_WORKER,
  planFor,
  type BuildingId,
  type CharterId,
  type Cost,
  type Empire,
  type ResourceId,
  type RoleId,
} from '../data';
import {
  createInterlockerModules,
  getEmpire,
  getExposition,
  getWorks,
  type Limit,
} from '../modules';

/** Sim-seconds per tick. The economy is tick-robust: 0.25 s to 2 s moves an Exposition by under 3%. */
export const DT = 0.5;

/** One Exposition, as the foreman staged it. */
export interface ExpositionRecord {
  /** play-seconds when it was staged */
  at: number;
  /** seconds the run took */
  runSeconds: number;
  planes: number;
  renown: number;
  built: Record<BuildingId, number>;
  crew: number;
  /** charters held when the next run opens */
  charters: string[];
  /** patents the next run opens with */
  kept: string[];
}

/** What held each trade back, in sampled minutes, and how often each bin sat full. */
export interface BindTally {
  minutes: number;
  limits: Record<RoleId, Partial<Record<string, number>>>;
  /** minutes a bin sat at 95% or more of its cap */
  fullBins: Partial<Record<ResourceId, number>>;
  /** minutes the ration fell short */
  hungry: number;
}

export interface ArcRecord {
  /** [play-second, label] in order */
  beats: [number, string][];
  expositions: ExpositionRecord[];
  tally: BindTally;
  /** one line per sampled minute when `trace` is set */
  trace: string[];
  simSeconds: number;
  softlock: boolean;
  endState: string[];
}

export interface ArcOptions {
  /** stop after this many Expositions */
  expositions?: number;
  maxSimSeconds?: number;
  dt?: number;
  trace?: boolean;
  /**
   * The empire the first run opens with: lifetime renown, and charters granted on top of
   * it. He petitions nothing further, so a run's length reads one charter set.
   */
  start?: { renown: number; charters: CharterId[] };
}

/** Play Expositions under the foreman until `expositions` are staged, or `maxSimSeconds`. */
export function runArc(options: ArcOptions = {}): ArcRecord {
  const {
    expositions: stopAfter = 5,
    maxSimSeconds = 7200,
    dt = DT,
    trace = false,
    start,
  } = options;
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createInterlockerModules()],
    persistenceNamespacePrefix: 'interlocker-probe',
    intervalRate: 1 / dt,
  });
  const works = getWorks();
  const empire = getEmpire();
  const expo = getExposition();
  const n = (v: unknown) => toNumber(v as number);
  if (start) {
    addResource(empire.renown, start.renown);
    // Granted, not bought, so lifetime renown stays `start.renown`.
    for (const c of start.charters) empire.charters.getPurchasable(c)!.count.value = 1;
  }
  const owned = (id: BuildingId) => works.owned(id);
  const empireNow = (): Empire => ({
    renown: empire.lifetimeRenown.value,
    charters: CHARTERS.filter((c) => empire.holds(c.id).value).map((c) => c.id),
  });
  let plan = planFor(empireNow());

  // ── the foreman ──

  // Crew weights for a balanced line, from the spine: compagnons per rigger that keep each
  // upstream trade matched (an aeroplane needs 4 spars, 2 aluminium + 3 per engine, 1 engine).
  const perPlane = ROLE_RATE.rigger;
  const WEIGHT: Record<RoleId, number> = {
    rigger: 1,
    machinist: perPlane / ROLE_RATE.machinist,
    smelter: (perPlane * (2 + 3)) / ROLE_RATE.smelter,
    sawyer: (perPlane * 4) / ROLE_RATE.sawyer,
  };

  // Below half a bin, a trade draws at most this share of a raw stock's yield.
  const PURSE_SHARE = 0.5;
  const rawYield = (k: ResourceId) =>
    BUILDINGS.filter((b) => b.yields === k).reduce(
      (s, b) => s + owned(b.id) * works.yieldEach(b.id),
      0,
    );
  function seatCap(role: RoleId): number {
    const rec = RECIPES[role];
    const seated = n(works.crew[role].value);
    const perSeat = seated > 0 ? works.roleStatus[role].capacityPerSec / seated : ROLE_RATE[role];
    let cap = Infinity;
    for (const [k, q] of Object.entries(rec.inputs))
      if (
        RAW.includes(k as ResourceId) &&
        n(works.res[k as ResourceId].value) < 0.5 * works.cap[k as ResourceId].value
      )
        cap = Math.min(cap, Math.floor((PURSE_SHARE * rawYield(k as ResourceId)) / (perSeat * q)));
    return cap;
  }

  function rebalance(): void {
    for (const r of ROLES) {
      const over = n(works.crew[r.id].value) - seatCap(r.id);
      if (over > 0) works.assign(r.id, -over);
    }
    const open = ROLES.map((r) => r.id).filter(
      (r) =>
        works.roleOpen[r].value &&
        works.roleStatus[r].limit !== 'storage' &&
        n(works.crew[r].value) < seatCap(r),
    );
    const share = (r: RoleId) => n(works.crew[r].value) / WEIGHT[r];
    for (const r of ROLES)
      if (works.roleStatus[r.id].limit === 'storage' && n(works.crew[r.id].value) > 0)
        works.assign(r.id, -1);
    let guard = 50;
    while (works.workersIdle.value >= 1 && guard-- > 0) {
      const room = open.filter((r) => n(works.crew[r].value) < seatCap(r));
      if (!room.length) break;
      const target = room.sort((a, b) => share(a) - share(b))[0]!;
      if (works.assign(target, 1) === 0) break;
    }
    if (open.length > 1) {
      const sorted = [...open].sort((a, b) => share(a) - share(b));
      const lo = sorted[0]!;
      const hi = sorted[sorted.length - 1]!;
      if (
        n(works.crew[hi].value) > 1 &&
        n(works.crew[lo].value) < seatCap(lo) &&
        share(hi) - share(lo) > 1.5 / WEIGHT[hi]
      ) {
        works.assign(hi, -1);
        works.assign(lo, 1);
      }
    }
  }

  function want(id: BuildingId): boolean {
    const ration = works.workersTotal.value * UPKEEP_PER_WORKER;
    const farmsFeed = owned('farm') * works.yieldEach('farm');
    switch (id) {
      case 'farm': {
        const site = BUILDINGS.find((b) => b.id === 'cite')!;
        const nextBread = (site.cost.bread ?? 0) * Math.pow(site.growth, owned('cite'));
        return farmsFeed < ration + nextBread / GARDEN_LEAD;
      }
      case 'cite':
        return works.workersIdle.value < 1 && farmsFeed >= ration;
      case 'warehouse':
        return owned(id) < plan.warehouse;
      default: {
        const yields = BUILDINGS.find((b) => b.id === id)!.yields!;
        return owned(id) < plan[id] && n(works.res[yields].value) < works.cap[yields].value * 0.9;
      }
    }
  }

  function value(id: BuildingId): number {
    const def = BUILDINGS.find((b) => b.id === id)!;
    const base = Object.entries(def.cost).reduce((s, [k, v]) => s + RAW_EQ[k as ResourceId] * v, 0);
    return base * Math.pow(def.growth, owned(id));
  }

  const priceNow = (b: (typeof BUILDINGS)[number]): Cost =>
    Object.fromEntries(
      Object.entries(b.cost).map(([k, v]) => [k, v * Math.pow(b.growth, owned(b.id) - b.start)]),
    );
  function housing(): Cost | undefined {
    const pat = works.research.getPurchasable('cites')!;
    if (!pat.active.value)
      return works.researched('sawpit').value
        ? RESEARCH.find((r) => r.id === 'cites')!.cost
        : undefined;
    return want('cite') ? priceNow(BUILDINGS.find((b) => b.id === 'cite')!) : undefined;
  }
  function leaves(cost: Cost, reserve: Cost | undefined): boolean {
    if (!reserve) return true;
    return Object.entries(cost).every(
      ([k, v]) =>
        !(k in reserve) || n(works.res[k as ResourceId].value) - v >= reserve[k as ResourceId]!,
    );
  }

  function buy(): void {
    const cites = works.research.getPurchasable('cites')!;
    if (cites.canPurchase.value) cites.purchase(1);
    const cite = works.buildings.getPurchasable('cite')!;
    if (cite.visible.value && cite.canPurchase.value && want('cite')) cite.purchase(1);
    const reserve = housing();
    // The climb comes before the investments: Coking Ovens and the Rolling Mill take only
    // what the next patent on the path to the riggers leaves.
    const next = RESEARCH.find(
      (r) =>
        r.id !== 'coking' &&
        r.id !== 'rolling' &&
        !works.researched(r.id).value &&
        r.requires.every((q) => works.researched(q).value),
    );
    for (const r of RESEARCH) {
      const p = works.research.getPurchasable(r.id)!;
      const investment = r.id === 'coking' || r.id === 'rolling';
      if (
        p.canPurchase.value &&
        leaves(r.cost, reserve) &&
        (!investment || !next || leaves(r.cost, next.cost))
      )
        p.purchase(1);
    }
    const wanted = BUILDINGS.filter((b) => {
      const p = works.buildings.getPurchasable(b.id)!;
      return p.visible.value && want(b.id) && (b.id === 'cite' || leaves(priceNow(b), reserve));
    }).sort((a, b) => value(a.id) - value(b.id));
    const first = wanted[0] && works.buildings.getPurchasable(wanted[0].id)!;
    if (first?.canPurchase.value) first.purchase(1);
    // Charters in their listed order, each saved for before the next.
    for (const c of start ? [] : CHARTERS) {
      const p = empire.charters.getPurchasable(c.id)!;
      if (p.active.value) continue;
      if (!p.canPurchase.value) break;
      p.purchase(1);
    }
  }

  // ── accounting ──

  const beats: [number, string][] = [];
  const seen = new Set<string>();
  let sim = 0;
  const once = (key: string, cond: boolean, label: string) => {
    if (cond && !seen.has(key)) {
      seen.add(key);
      beats.push([sim, label]);
    }
  };
  const tally: BindTally = {
    minutes: 0,
    limits: Object.fromEntries(ROLES.map((r) => [r.id, {}])) as BindTally['limits'],
    fullBins: {},
    hungry: 0,
  };
  const traceLines: string[] = [];
  const built = () =>
    Object.fromEntries(BUILDINGS.map((b) => [b.id, owned(b.id)])) as Record<BuildingId, number>;
  const fmt = (t: number) =>
    `${Math.floor(t / 60)}m${String(Math.round(t % 60)).padStart(2, '0')}s`;

  const records: ExpositionRecord[] = [];
  let runStart = 0;
  let lastProgress = 0;
  let lastSig = '';
  let softlock = false;

  for (let t = 0; t < maxSimSeconds; t += dt) {
    handle.engine.tickDriver.tickOnce();
    sim += dt;
    if (Math.round(sim * 2) % 2 === 0) {
      buy();
      rebalance();
    }
    const run = records.length + 1;
    for (const b of BUILDINGS)
      once(`b-${b.id}-${run}`, owned(b.id) > b.start, `run ${run}: first ${b.name}`);
    for (const r of RESEARCH)
      once(
        `r-${r.id}-${run}`,
        works.research.getPurchasable(r.id)!.active.value,
        `run ${run}: patent ${r.name}`,
      );
    once(`plane-${run}`, n(works.res.aeroplanes.value) >= 1, `run ${run}: first aeroplane`);
    once(
      `hunger-${run}`,
      works.fed.value < 1,
      `run ${run}: the compagnons go hungry (fed ${works.fed.value.toFixed(2)})`,
    );

    if (expo.canStage.value && expo.gain.value >= 2) {
      const planes = n(works.res.aeroplanes.value);
      const atBuilt = built();
      const crew = works.workersTotal.value;
      const gain = expo.stage();
      const runSeconds = sim - runStart;
      buy(); // charters before the next run starts
      plan = planFor(empireNow());
      records.push({
        at: sim,
        runSeconds,
        planes,
        renown: gain,
        built: atBuilt,
        crew,
        charters: CHARTERS.filter((c) => empire.holds(c.id).value).map((c) => c.id),
        kept: RESEARCH.filter((r) => works.research.getPurchasable(r.id)!.active.value).map(
          (r) => r.id,
        ),
      });
      runStart = sim;
      const r = records[records.length - 1]!;
      beats.push([
        sim,
        `EXPOSITION ${records.length}: ${planes.toFixed(0)} planes -> +${gain} renown (run ${fmt(r.runSeconds)}; built ${Object.entries(
          atBuilt,
        )
          .map(([k, v]) => `${k} ${v}`)
          .join(' ')}; crew ${crew})`,
      ]);
      beats.push([
        sim,
        `run ${records.length + 1} opens with charters [${r.charters.join(', ')}], patents kept [${r.kept.join(', ')}], crew ${works.workersTotal.value}`,
      ]);
      if (records.length >= stopAfter) break;
    }

    // One sample a minute: what binds each trade, which bins sit full.
    if (Math.abs(sim % 60) < dt / 2) {
      tally.minutes++;
      for (const r of ROLES) {
        const k: Limit = works.roleStatus[r.id].limit;
        tally.limits[r.id][k] = (tally.limits[r.id][k] ?? 0) + 1;
      }
      for (const def of RESOURCES)
        if (n(works.res[def.id].value) >= 0.95 * works.cap[def.id].value)
          tally.fullBins[def.id] = (tally.fullBins[def.id] ?? 0) + 1;
      if (works.fed.value < 1) tally.hungry++;
      if (trace)
        traceLines.push(
          `${fmt(sim)} | ${ROLES.map((r) => `${r.id[0]}${n(works.crew[r.id].value)}:${works.roleStatus[r.id].limit}`).join(' ')} | ` +
            `${RESOURCES.map((d) => `${d.id.slice(0, 3)} ${n(works.res[d.id].value).toFixed(0)}/${works.cap[d.id].value.toFixed(0)}`).join(' ')} | ` +
            BUILDINGS.map((b) => `${b.id}${owned(b.id)}`).join(' '),
        );
    }

    for (const def of RESOURCES)
      if (!Number.isFinite(n(works.res[def.id].value))) throw new Error(`non-finite ${def.name}`);
    const sig =
      RESOURCES.map((d) => n(works.res[d.id].value).toFixed(0)).join(',') +
      BUILDINGS.map((b) => owned(b.id)).join(',');
    if (sig !== lastSig) {
      lastSig = sig;
      lastProgress = sim;
    } else if (sim - lastProgress > 600) {
      beats.push([sim, 'SOFTLOCK: nothing moved for 10 minutes']);
      softlock = true;
      break;
    }
  }

  const endState = [
    `sim ${fmt(sim)}, expositions ${expo.cycle.count.value}, renown ${n(empire.renown.value)} (lifetime ${empire.lifetimeRenown.value})`,
    `buildings: ${BUILDINGS.map((b) => `${b.id} ${owned(b.id)}`).join(', ')}`,
    `crew ${works.workersTotal.value} (idle ${works.workersIdle.value}): ${ROLES.map((r) => `${r.id} ${n(works.crew[r.id].value)} [${works.roleStatus[r.id].limit} ${works.roleStatus[r.id].cyclesPerSec.toFixed(2)}/s]`).join(', ')}`,
    `stock: ${RESOURCES.map((d) => `${d.id} ${n(works.res[d.id].value).toFixed(1)}/${works.cap[d.id].value.toFixed(0)} (${works.net[d.id] >= 0 ? '+' : ''}${works.net[d.id].toFixed(2)})`).join(', ')}`,
    `charters: ${
      CHARTERS.filter((c) => empire.holds(c.id).value)
        .map((c) => c.id)
        .join(', ') || 'none'
    }`,
  ];
  handle.dispose();
  return {
    beats,
    expositions: records,
    tally,
    trace: traceLines,
    simSeconds: sim,
    softlock,
    endState,
  };
}
