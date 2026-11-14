/**
 * Shared probe fixture — not runnable on its own.
 *
 * Builds a real interlocker engine and plays it Exposition after Exposition. The
 * automation tiers are forced to the top, so the foreman's three bureaux play the works
 * with the shipping policies of `../modules/automation.ts`. The foreman works only what
 * stays the player's; `seatForeman` seats him on the tick driver, for the arc and for the
 * games site's beat script:
 * - it raises a market garden while the gardens at winter's yield cannot carry the crew
 *   through a season on a full larder, or, in winter, through the rest of it on the bread
 *   in stock; and a Boiler House while the boilers fall short of what is drawn;
 * - it delivers every Ministry order the bins can fill;
 * - it stages the Exposition once the jury sits and the medal reaches the one the spine
 *   predicts this empire's run shows (`medalFor`);
 * - it petitions the charters in their listed order, then the bureaux.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list for
 * tick-by-tick behavioral specs; this plays an arc and records magnitudes.
 */

import { addResource, createThrottle, runUntil, toNumber, type Engine } from '@open-loop/engine';
import { formatClock } from '@/composables/useFormatting';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  BUILDINGS,
  BUREAUX,
  CHARTERS,
  RESEARCH,
  RESOURCES,
  ROLES,
  SEASON_SECONDS,
  SEASON_YIELD,
  UPKEEP_PER_WORKER,
  medalFor,
  type BuildingId,
  type CharterId,
  type ResourceId,
  type RoleId,
} from '../data';
import {
  createInterlockerModules,
  empireOf,
  getAutomation,
  getCalendar,
  getEmpire,
  getExposition,
  getMinistry,
  getTelegraph,
  getWorks,
  type Limit,
} from '../modules';

/** Sim-seconds per tick. The economy is tick-robust: 0.25 s to 2 s moves an Exposition by under 3%. */
export const DT = 0.5;
/** Game seconds between the foreman's tending turns. */
export const FOREMAN_EVERY = 1;

/** One Exposition, as the foreman staged it. */
export interface ExpositionRecord {
  /** play-seconds when it was staged */
  at: number;
  /** seconds the run took */
  runSeconds: number;
  planes: number;
  /** the jury's score, and the dossier's part of it */
  score: number;
  dossier: number;
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

/** An Exposition the foreman staged: the works as the jury found them, and the renown paid. */
export interface Staging {
  planes: number;
  score: number;
  dossier: number;
  built: Record<BuildingId, number>;
  crew: number;
  renown: number;
}

/** What one of the foreman's turns did, for a probe to record. */
export interface ForemanTurn {
  /** the Exposition staged this turn, if one was */
  staged: Staging | null;
}

/** The player's part, bound to the running engine's modules. */
interface Foreman {
  /** Provision the larder and the boilers, deliver every order the bins fill. */
  tend: () => void;
  /** Whether the jury sits and the medal reaches the one the spine predicts. */
  ready: () => boolean;
  /** Stage the Exposition, then petition. */
  stage: () => Staging;
}

/**
 * Forces the automation tiers to the top and grants `start`'s empire, if given; with a
 * `start`, he petitions nothing.
 */
function createForeman(start?: ArcOptions['start']): Foreman {
  const works = getWorks();
  const empire = getEmpire();
  const expo = getExposition();
  if (start) {
    addResource(empire.renown, start.renown);
    // Granted, not bought, so lifetime renown stays `start.renown`.
    for (const c of start.charters) empire.charters.getPurchasable(c)!.count.value = 1;
  }
  const owned = (id: BuildingId) => works.owned(id);
  const ministry = getMinistry();
  const calendar = getCalendar();
  getAutomation().tiers.unlock('academie');
  let medal = medalFor(empireOf(empire));

  function petition(): void {
    if (start) return;
    for (const c of CHARTERS) {
      const p = empire.charters.getPurchasable(c.id)!;
      if (p.active.value) continue;
      if (!p.canPurchase.value) return;
      p.purchase(1);
    }
    for (const b of BUREAUX) {
      const p = empire.bureaux.getPurchasable(b.id)!;
      if (p.active.value) continue;
      if (!p.canPurchase.value) return;
      p.purchase(1);
    }
  }
  function provision(): void {
    const farm = works.buildings.getPurchasable('farm')!;
    const perFarm = (works.yieldEach('farm') / calendar.yield.value) * SEASON_YIELD.winter;
    const ration = works.workersTotal.value * UPKEEP_PER_WORKER;
    // In winter the larder is what the steward's cités left of it, over the winter left.
    const larder =
      calendar.season.value === 'winter'
        ? toNumber(works.res.bread.value) / Math.max(calendar.remaining.value, 1)
        : works.cap.bread.value / SEASON_SECONDS;
    if (owned('farm') * perFarm + larder < ration && farm.canPurchase.value) farm.purchase(1);
    const boiler = works.buildings.getPurchasable('boiler')!;
    if (works.steam.demand > works.steam.supply && boiler.visible.value && boiler.canPurchase.value)
      boiler.purchase(1);
  }
  function deliver(): void {
    for (const o of ministry.orders.value) if (ministry.canDeliver(o.id)) ministry.deliver(o.id);
  }

  return {
    tend() {
      provision();
      deliver();
    },
    ready: () => expo.canStage.value && expo.gain.value >= medal,
    stage() {
      const before = {
        planes: toNumber(works.res.aeroplanes.value),
        score: expo.score.value,
        dossier: ministry.dossier.value,
        built: Object.fromEntries(BUILDINGS.map((b) => [b.id, owned(b.id)])) as Record<
          BuildingId,
          number
        >,
        crew: works.workersTotal.value,
      };
      const renown = expo.stage();
      petition();
      medal = medalFor(empireOf(empire));
      return { ...before, renown };
    },
  };
}

/**
 * Seats the foreman on the engine's tick driver: he tends every `FOREMAN_EVERY` game
 * seconds, and stages the Exposition on any tick the jury is ready for it. The cadence
 * holds while no tick is longer than `FOREMAN_EVERY`, whatever `tickDelta` the runner
 * steps by, and a runner's `until` stays a read.
 *
 * @param engine - the running engine whose modules the foreman works
 * @param start - the empire the first run opens with; with one, he petitions nothing
 * @param onTurn - receives what each turn did, for a probe to record
 * @returns the function that unseats the foreman; call it when the run ends.
 */
export function seatForeman(
  engine: Engine,
  start?: ArcOptions['start'],
  onTurn?: (turn: ForemanTurn) => void,
): () => void {
  const foreman = createForeman(start);
  const tending = createThrottle({ interval: FOREMAN_EVERY });
  return engine.tickDriver.onTick((dt) => {
    if (tending.ready(dt)) foreman.tend();
    const staged = foreman.ready() ? foreman.stage() : null;
    onTurn?.({ staged });
  });
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
    // One tick of `dt` per step, as `tickOnce` took it, at the coarse dts the charter probe uses.
    maxDeltaTime: dt,
  });
  const works = getWorks();
  const empire = getEmpire();
  const expo = getExposition();
  const n = (v: unknown) => toNumber(v as number);
  const owned = (id: BuildingId) => works.owned(id);
  const ministry = getMinistry();
  const telegraph = getTelegraph();
  let lastWire = 0;
  const calendar = getCalendar();

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

  const records: ExpositionRecord[] = [];
  let runStart = 0;
  let lastProgress = 0;
  let lastSig = '';
  let softlock = false;

  /** Logs each Ministry order wired since the last read, under the run it was wired in. */
  function readWires(): void {
    for (const w of telegraph.log.since(lastWire)) {
      if (w.kind === 'order') beats.push([sim, `run ${records.length + 1}: ${w.text}`]);
      lastWire = w.seq;
    }
  }

  /** Records an Exposition the foreman staged in the advance just read. */
  function recordStaging(s: Staging): void {
    const runSeconds = sim - runStart;
    records.push({
      at: sim,
      runSeconds,
      planes: s.planes,
      score: s.score,
      dossier: s.dossier,
      renown: s.renown,
      built: s.built,
      crew: s.crew,
      charters: CHARTERS.filter((c) => empire.holds(c.id).value).map((c) => c.id),
      kept: RESEARCH.filter((r) => works.research.getPurchasable(r.id)!.active.value).map(
        (r) => r.id,
      ),
    });
    runStart = sim;
    const r = records[records.length - 1]!;
    beats.push([
      sim,
      `EXPOSITION ${records.length} (${calendar.season.value} ${calendar.year.value}): score ${s.score.toFixed(0)} (dossier ${s.dossier.toFixed(0)}) -> +${s.renown} renown (run ${formatClock(r.runSeconds)}; built ${Object.entries(
        s.built,
      )
        .map(([k, v]) => `${k} ${v}`)
        .join(' ')}; crew ${s.crew})`,
    ]);
    beats.push([
      sim,
      `run ${records.length + 1} opens with charters [${r.charters.join(', ')}], patents kept [${r.kept.join(', ')}], crew ${works.workersTotal.value}`,
    ]);
  }

  /** Reads the state the advance that ended at `sim` left; true ends the run. */
  function read(): boolean {
    // An order the foreman delivered in a staging tick's tend belongs to the run it staged.
    readWires();
    for (const s of stagings.splice(0)) recordStaging(s);
    if (records.length >= stopAfter) return true;
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
    once(`dossier-${run}`, ministry.dossier.value > 0, `run ${run}: first order delivered`);
    for (const c of CHARTERS)
      once(`charter-${c.id}`, empire.holds(c.id).value, `charter ${c.name} held`);
    for (const b of BUREAUX)
      once(`bureau-${b.id}`, empire.employs(b.id).value, `bureau ${b.name} employed`);
    once('grand-prix', empire.grandPrix.value, 'THE GRAND PRIX, Paris 1867');
    once(
      `hunger-${run}`,
      works.fed.value < 1,
      `run ${run}: the compagnons go hungry (fed ${works.fed.value.toFixed(2)})`,
    );

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
          `${formatClock(sim)} | ${ROLES.map((r) => `${r.id[0]}${n(works.crew[r.id].value)}:${works.roleStatus[r.id].limit}`).join(' ')} | ` +
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
      return true;
    }
    return false;
  }

  // A staging happens inside a tick; `until` logs it with the stamp it gives that advance.
  const stagings: Staging[] = [];
  const unseat = seatForeman(handle.engine, start, ({ staged }) => {
    if (staged) stagings.push(staged);
  });
  try {
    runUntil({
      engine: handle.engine,
      tickDelta: dt,
      maxSimTime: maxSimSeconds,
      until: ({ iteration, simTime }) => {
        // Iteration 0 is the state before the first advance.
        // A beat is stamped with the sim time its advance ended at.
        sim = simTime;
        return iteration > 0 && read();
      },
    });
  } finally {
    unseat();
  }

  const endState = [
    `sim ${formatClock(sim)}, expositions ${expo.cycle.count.value}, renown ${n(empire.renown.value)} (lifetime ${empire.lifetimeRenown.value})`,
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
