import {
  createAutomationTiers,
  persistent,
  toNumber,
  type AutomationTiers,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import {
  BUILDINGS,
  CHARTERS,
  GARDEN_LEAD,
  MEAN_SEASON_YIELD,
  RAW,
  RAW_EQ,
  RECIPES,
  RESEARCH,
  ROLES,
  ROLE_RATE,
  UPKEEP_PER_WORKER,
  planFor,
  type BuildPlan,
  type BuildingId,
  type Cost,
  type Empire,
  type ResourceId,
  type RoleId,
} from '../data';
import { CalendarKey, type CalendarApi } from './calendar';
import { EmpireKey, type EmpireApi } from './empire';
import { WorksKey, type Limit, type WorksApi } from './works';

/**
 * Automation module — the foreman's three bureaux as player-facing automation. Each
 * policy is a function over the works' state, run once a second while its automation
 * tier is reached and its bureau is switched on. The tiers unlock as the bureaux are
 * bought. Staging, the charters, the Ministry's orders and the shed order stay the
 * player's. The probes drive these same policies, so the reference player the spine
 * assumes is the one that ships.
 */

/** Automation tier ids in ladder order: each bureau's tier implies those before it. */
export type InterlockerAutomationTier = 'manual' | 'seating' | 'estate' | 'academie';

/** What the policies read, and the knobs a player could tune. */
export interface PolicyParams {
  /** below half a bin, the share of a raw stock's yield the trades may draw */
  purseShare: number;
}

export const DEFAULT_POLICY: PolicyParams = { purseShare: 0.5 };

export interface AutomationApi {
  tiers: AutomationTiers;
  /** each bureau's switch; meaningless until its tier unlocks */
  active: Record<Exclude<InterlockerAutomationTier, 'manual'>, Persistent<boolean>>;
  params: PolicyParams;
}

export const AutomationKey: InjectionKey<AutomationApi> = Symbol(
  'interlocker/automation',
) as InjectionKey<AutomationApi>;

let api: AutomationApi;

export function getAutomation(): AutomationApi {
  return api;
}

/** The empire as the spine reads it. */
export function empireOf(empire: EmpireApi): Empire {
  return {
    renown: empire.lifetimeRenown.value,
    charters: CHARTERS.filter((c) => empire.holds(c.id).value).map((c) => c.id),
  };
}

// ── seating ──

// Compagnons per rigger that keep each upstream trade matched: an aeroplane needs 4
// spars, 2 aluminium and 3 more per engine, and 1 engine.
const WEIGHT: Record<RoleId, number> = {
  rigger: 1,
  machinist: ROLE_RATE.rigger / ROLE_RATE.machinist,
  smelter: (ROLE_RATE.rigger * (2 + 3)) / ROLE_RATE.smelter,
  sawyer: (ROLE_RATE.rigger * 4) / ROLE_RATE.sawyer,
};

const n = (v: unknown) => toNumber(v as number);

function rawYield(works: WorksApi, k: ResourceId): number {
  return BUILDINGS.filter((b) => b.yields === k).reduce(
    (s, b) => s + works.owned(b.id) * works.yieldEach(b.id),
    0,
  );
}

/** Seats a trade may hold so that, below half a bin, it draws at most `purseShare` of a raw yield. */
function seatCap(works: WorksApi, role: RoleId, p: PolicyParams): number {
  const seated = n(works.crew[role].value);
  const perSeat = seated > 0 ? works.roleStatus[role].capacityPerSec / seated : ROLE_RATE[role];
  let cap = Infinity;
  for (const [k, q] of Object.entries(RECIPES[role].inputs))
    if (
      RAW.includes(k as ResourceId) &&
      n(works.res[k as ResourceId].value) < 0.5 * works.cap[k as ResourceId].value
    )
      cap = Math.min(
        cap,
        Math.floor((p.purseShare * rawYield(works, k as ResourceId)) / (perSeat * q)),
      );
  return cap;
}

/** A trade that cannot work for want of room or steam: seats there are wasted. */
const idle = (limit: Limit) => limit === 'storage' || limit === 'steam';

/**
 * Le Contremaître: seat compagnons on the most under-weighted open trade, within each
 * trade's purse cap; withdraw from a trade whose output bin is full or which is short of
 * steam; move one a second
 * from the most over-weighted trade when the gap is wide.
 */
export function seatPolicy(works: WorksApi, p: PolicyParams): void {
  for (const r of ROLES) {
    const over = n(works.crew[r.id].value) - seatCap(works, r.id, p);
    if (over > 0) works.assign(r.id, -over);
  }
  const open = ROLES.map((r) => r.id).filter(
    (r) =>
      works.roleOpen[r].value &&
      !idle(works.roleStatus[r].limit) &&
      n(works.crew[r].value) < seatCap(works, r, p),
  );
  const share = (r: RoleId) => n(works.crew[r].value) / WEIGHT[r];
  for (const r of ROLES)
    if (idle(works.roleStatus[r.id].limit) && n(works.crew[r.id].value) > 0) works.assign(r.id, -1);
  let guard = 50;
  while (works.workersIdle.value >= 1 && guard-- > 0) {
    const room = open.filter((r) => n(works.crew[r].value) < seatCap(works, r, p));
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
      n(works.crew[lo].value) < seatCap(works, lo, p) &&
      share(hi) - share(lo) > 1.5 / WEIGHT[hi]
    ) {
      works.assign(hi, -1);
      works.assign(lo, 1);
    }
  }
}

// ── the estate ──

const priceNow = (works: WorksApi, b: (typeof BUILDINGS)[number]): Cost =>
  Object.fromEntries(
    Object.entries(b.cost).map(([k, v]) => [
      k,
      v * Math.pow(b.growth, works.owned(b.id) - b.start),
    ]),
  );

/** What housing holds back: the cités patent's price, or the next wanted cité's. */
function housingReserve(works: WorksApi, cal: CalendarApi): Cost | undefined {
  if (!works.researched('cites').value)
    return works.researched('sawpit').value
      ? RESEARCH.find((r) => r.id === 'cites')!.cost
      : undefined;
  return wants(works, cal, 'cite', undefined)
    ? priceNow(
        works,
        BUILDINGS.find((b) => b.id === 'cite')!,
      )
    : undefined;
}

function leaves(works: WorksApi, cost: Cost, reserve: Cost | undefined): boolean {
  if (!reserve) return true;
  return Object.entries(cost).every(
    ([k, v]) =>
      !(k in reserve) || n(works.res[k as ResourceId].value) - v >= reserve[k as ResourceId]!,
  );
}

function wants(
  works: WorksApi,
  cal: CalendarApi,
  id: BuildingId,
  plan: BuildPlan | undefined,
): boolean {
  const ration = works.workersTotal.value * UPKEEP_PER_WORKER;
  // The gardens' yield at the mean season, so the steward plans on the year, not the day.
  const perFarm = (works.yieldEach('farm') / cal.yield.value) * MEAN_SEASON_YIELD;
  const feed = works.owned('farm') * perFarm;
  switch (id) {
    case 'farm': {
      const site = BUILDINGS.find((b) => b.id === 'cite')!;
      const lastBread =
        works.owned('cite') > 0
          ? (site.cost.bread ?? 0) * Math.pow(site.growth, works.owned('cite') - 1)
          : 0;
      return feed < ration + lastBread / GARDEN_LEAD;
    }
    case 'cite':
      return works.workersIdle.value < 1 && feed >= ration;
    case 'warehouse':
      return !!plan && works.owned(id) < plan.warehouse;
    case 'boiler':
      return false;
    default: {
      const yields = BUILDINGS.find((b) => b.id === id)!.yields!;
      return (
        !!plan &&
        works.owned(id) < plan[id] &&
        n(works.res[yields].value) < works.cap[yields].value * 0.9
      );
    }
  }
}

/**
 * L'Intendance: raise the build `planFor` gives, cheapest wanted building first by raw
 * value. Gardens keep a season's lead on the last cité's bread at the mean season; cités
 * come first while one is wanted, and nothing else spends what they need. Winter's
 * larder and the boilers stay the player's: the steward reads neither sky nor gauge.
 */
export function estatePolicy(works: WorksApi, empire: EmpireApi, cal: CalendarApi): void {
  const plan = planFor(empireOf(empire));
  const cite = works.buildings.getPurchasable('cite')!;
  if (cite.visible.value && cite.canPurchase.value && wants(works, cal, 'cite', plan))
    cite.purchase(1);
  const reserve = housingReserve(works, cal);
  const value = (b: (typeof BUILDINGS)[number]) =>
    Object.entries(priceNow(works, b)).reduce((s, [k, v]) => s + RAW_EQ[k as ResourceId] * v, 0);
  const wanted = BUILDINGS.filter((b) => {
    const p = works.buildings.getPurchasable(b.id)!;
    return (
      p.visible.value &&
      wants(works, cal, b.id, plan) &&
      (b.id === 'cite' || leaves(works, priceNow(works, b), reserve))
    );
  }).sort((a, b) => value(a) - value(b));
  const first = wanted[0] && works.buildings.getPurchasable(wanted[0].id)!;
  if (first?.canPurchase.value) first.purchase(1);
}

// ── the Académie ──

/**
 * Le Secrétariat: patent Cités Ouvrières as soon as it can, then every patent on the path
 * to the riggers. Coking Ovens and the Rolling Mill take only what the next path patent
 * leaves, and nothing spends what housing needs.
 */
export function academiePolicy(works: WorksApi, cal: CalendarApi): void {
  const cites = works.research.getPurchasable('cites')!;
  if (cites.canPurchase.value) cites.purchase(1);
  const reserve = housingReserve(works, cal);
  const investment = (id: string) => id === 'coking' || id === 'rolling';
  const next = RESEARCH.find(
    (r) =>
      !investment(r.id) &&
      !works.researched(r.id).value &&
      r.requires.every((q) => works.researched(q).value),
  );
  for (const r of RESEARCH) {
    const p = works.research.getPurchasable(r.id)!;
    if (
      p.canPurchase.value &&
      leaves(works, r.cost, reserve) &&
      (!investment(r.id) || !next || leaves(works, r.cost, next.cost))
    )
      p.purchase(1);
  }
}

export function createAutomationModule(params: PolicyParams = DEFAULT_POLICY): EngineModule {
  return {
    id: 'interlocker/automation',
    dependencies: ['interlocker/empire', 'interlocker/calendar', 'interlocker/works'],
    install(ctx) {
      const empire = ctx.inject(EmpireKey);
      const works = ctx.inject(WorksKey);
      const cal = ctx.inject(CalendarKey);
      const tiers = createAutomationTiers({
        id: 'interlocker-automation',
        tiers: [
          { id: 'manual', displayName: 'Manual', order: 0 },
          {
            id: 'seating',
            displayName: 'Le Contremaître',
            order: 1,
            unlockWhen: () => empire.employs('seating').value,
          },
          {
            id: 'estate',
            displayName: "L'Intendance",
            order: 2,
            unlockWhen: () => empire.employs('estate').value,
          },
          {
            id: 'academie',
            displayName: 'Le Secrétariat',
            order: 3,
            unlockWhen: () => empire.employs('academie').value,
          },
        ],
      });
      const active = {
        seating: persistent(true, { id: 'seatingActive' }),
        estate: persistent(true, { id: 'estateActive' }),
        academie: persistent(true, { id: 'academieActive' }),
      };
      const on = (t: keyof typeof active) => tiers.hasReached(t) && active[t].value;

      let since = 0;
      ctx.onTick((dt) => {
        since += dt;
        if (since < 1) return;
        since = 0;
        if (on('academie')) academiePolicy(works, cal);
        if (on('estate')) estatePolicy(works, empire, cal);
        if (on('seating')) seatPolicy(works, params);
      });

      api = { tiers, active, params };
      ctx.provide(AutomationKey, api);
    },
  };
}
