/**
 * Shared probe fixture — NOT runnable on its own (leading underscore, per
 * `.claude/rules/archetype-authoring.md` § Canonical `balance/` filenames).
 *
 * Builds a real producer engine and runs the arc on it. The driver here is
 * deliberately thin: it works only the **manual openers a player works** —
 * hand-launches, hand-buys before dispatch opens, and refinement purchases —
 * and hands every class purchase to the shipping `modules/automation.ts` the
 * moment its rung opens (`/work/studio/CLAUDE.md` § automation as game code).
 * There is no bot re-implementing the allocation rule; the rule under
 * measurement IS the one the game ships.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list
 * for tick-by-tick behavioral specs; this assembles an instrumented arc runner
 * that records beats and prints magnitudes.
 */

import { Decimal, addResource } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import {
  DispatchKey,
  OfflineKey,
  createProducerModules,
  getClasses,
  getHeadlineRate,
  getMass,
  getRefinements,
  getRevisions,
  launch,
  type DispatchPolicyName,
} from '../modules';
import { DEFAULT_PRODUCER_DATA } from '../data';
import { BEATS, type ArcReading } from './beats';

export const num = (v: unknown): number => new Decimal(v as never).toNumber();

export const hms = (s: number): string =>
  `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

export interface ArcOptions {
  /** Sim-seconds to run. */
  seconds: number;
  /** Pin the allocation rule for the whole run. Unset = the shipping ladder. */
  forcePolicy?: DispatchPolicyName;
  /** Pin whether the dispatcher may wait for cost. Unset = the rule decides. */
  forceWaitForCost?: boolean;
  /** Hand-launches per second while the player is still opening the game. */
  launchesPerSecond?: number;
  /** Unique namespace so concurrent runs cannot share persistent context. */
  namespace?: string;
  /**
   * Sample the arc on a fixed cadence. The beat map answers "when did X first
   * happen"; this answers "what was the arc doing between the beats", which is
   * the only way to read channel occupancy rather than a run average.
   * Sampling is read-only — a sampler that purchased would be a second driver.
   */
  onSample?: (reading: ArcReading) => void;
  /** Sample cadence in sim-seconds. Ignored without `onSample`. */
  sampleEverySeconds?: number;
  /**
   * Times the player is away. At `at` the driver stops working the manual
   * openers and hands `seconds` to the shipping offline catch-up; the arc
   * resumes at the return. A beat that lands while away records at the return,
   * which is when the player sees it.
   */
  absences?: { at: number; seconds: number }[];
}

export interface ArcResult {
  /** Sim-second each beat first landed, or `undefined` if it never did. */
  beatAt: Map<number, number>;
  /** Sim-second each class was first deployed. */
  classAt: Map<string, number>;
  /** Final owned count per class, ladder order. */
  finalCounts: { id: string; name: string; count: number }[];
  /** Sim-second each automation rung first opened. */
  tierAt: Map<string, number>;
  /** Hand-buys the player made before dispatch took over. */
  handBuys: number;
  /** Sim-seconds the dispatcher spent holding cash for a pick (`savingFor` set). */
  holdSeconds: number;
  /**
   * Refinements the player bought while the dispatcher was holding, and the
   * mass they took out of its savings. The player and the dispatcher share one
   * wallet, so saving brings refinements forward, and a gap measured against a
   * run that never saves includes that.
   */
  refinementsWhileHolding: { count: number; mass: number };
  final: ArcReading;
  /** Final rate-chain product on the opening class, as a factor over its base. */
  openingClassStack: number;
}

function read(t: number, tier: string): ArcReading {
  const classes = getClasses();
  const entries = classes.getAll();
  return {
    t,
    headlineRate: num(getHeadlineRate()),
    fleetSize: entries.reduce((total, e) => total + num(e.producer.ownedCount.value), 0),
    distinctClasses: entries.filter((e) => num(e.producer.ownedCount.value) >= 1).length,
    topClassCount: num(entries[entries.length - 1].producer.ownedCount.value),
    refinementsOwned: getRefinements()
      .getAll()
      .filter((e) => e.purchasable.active.value).length,
    revisionsEarned: getRevisions()
      .getAll()
      .filter((e) => e.achievement.earned.value).length,
    tier,
  };
}

/**
 * Run one arc and record it. Seconds are sim-seconds at a 1s tick — coarse on
 * purpose (`.claude/CLAUDE.md` § Balance methodology): producer's events are
 * minute-to-hour scale and sub-second fidelity would only cost cycles.
 */
export async function runArc(options: ArcOptions): Promise<ArcResult> {
  const { seconds, forcePolicy, forceWaitForCost, launchesPerSecond = 2 } = options;

  const handle = bootTestEngine({
    modules: createProducerModules(DEFAULT_PRODUCER_DATA, {
      automation: { forcePolicy, forceWaitForCost },
    }),
    intervalRate: 1,
    persistenceNamespacePrefix:
      options.namespace ??
      `producer-arc-${forcePolicy ?? 'ladder'}${forceWaitForCost === undefined ? '' : `-wait-${forceWaitForCost}`}`,
  });

  const classes = getClasses();
  const dispatch = handle.engine.tryInject(DispatchKey);
  if (!dispatch) throw new Error('producer arc: dispatch module did not provide DispatchKey');

  // The player opts in as soon as the toggle exists. It stays inert until a
  // rung opens — which is the ladder doing its job, and is why the first arc
  // walkthrough with no manual opener bought nothing in eight hours.
  dispatch.isActive.value = true;

  const beatAt = new Map<number, number>();
  const classAt = new Map<string, number>();
  const tierAt = new Map<string, number>();
  let handBuys = 0;
  let holdSeconds = 0;
  const refinementsWhileHolding = { count: 0, mass: 0 };
  const offline = handle.engine.tryInject(OfflineKey);
  const absences = new Map((options.absences ?? []).map((a) => [a.at, a.seconds]));

  for (let t = 0; t <= seconds; t++) {
    const away = absences.get(t);
    if (away !== undefined) {
      if (!offline) throw new Error('producer arc: offline module did not provide OfflineKey');
      const now = Date.now();
      t += offline.catchUp(handle.engine.tickDriver, now - away * 1000, now).caughtUpSeconds;
    }
    const autoRunning = dispatch.tiers.hasReached('assisted');

    // ── manual openers, and only these ──
    if (!autoRunning) for (let i = 0; i < launchesPerSecond; i++) launch();
    await handle.tick(1);
    if (!autoRunning && buyCheapestAffordable()) handBuys++;
    const holding = dispatch.savingFor.value !== null;
    if (holding) holdSeconds++;
    for (const entry of getRefinements().getAll()) {
      if (!entry.purchasable.canPurchase.value) continue;
      entry.purchasable.purchase(1);
      if (holding) {
        refinementsWhileHolding.count++;
        refinementsWhileHolding.mass += num(entry.def.cost);
      }
    }

    const tier = dispatch.tiers.currentTierId.value;
    if (!tierAt.has(tier)) tierAt.set(tier, t);
    for (const entry of classes.getAll()) {
      if (!classAt.has(entry.def.id) && num(entry.producer.ownedCount.value) >= 1) {
        classAt.set(entry.def.id, t);
      }
    }
    const reading = read(t, tier);
    for (const beat of BEATS) {
      if (!beatAt.has(beat.n) && beat.reached(reading)) beatAt.set(beat.n, t);
    }
    if (options.onSample && t % (options.sampleEverySeconds ?? 60) === 0) {
      options.onSample(reading);
    }
  }

  const opening = classes.getAll()[0];
  const result: ArcResult = {
    beatAt,
    classAt,
    tierAt,
    handBuys,
    holdSeconds,
    refinementsWhileHolding,
    finalCounts: classes.getAll().map((e) => ({
      id: e.def.id,
      name: e.def.name,
      count: num(e.producer.ownedCount.value),
    })),
    final: read(seconds, dispatch.tiers.currentTierId.value),
    openingClassStack: num(opening.producer.computedRate.value) / num(opening.def.baseRate),
  };

  handle.dispose();
  return result;
}

/**
 * The one hand-buy a player makes before dispatch opens: whatever is cheapest
 * and affordable. Deliberately the naive rule — it is what a player does before
 * they think about payback, and the first rung of the ladder grants exactly it.
 */
function buyCheapestAffordable(): boolean {
  let best: { purchase: (n: number) => unknown } | undefined;
  let bestCost = Infinity;
  for (const entry of getClasses().getAll()) {
    const repeatable = entry.producer.repeatable;
    if (!repeatable?.canPurchase.value) continue;
    const cost = num(repeatable.getCost(1));
    if (cost < bestCost) {
      best = repeatable;
      bestCost = cost;
    }
  }
  best?.purchase(1);
  return best !== undefined;
}

/** Seed the bank — used only by probes measuring a mechanic in isolation. */
export function fund(amount: number): void {
  addResource(getMass(), amount);
}
