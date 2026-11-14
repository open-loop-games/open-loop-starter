/**
 * Shared probe fixture, not runnable on its own. Builds a real producer engine,
 * seats `_player.ts`'s reference player on it and plays the arc, recording the
 * beats it reaches.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list for
 * tick-by-tick behavioral specs; this assembles an instrumented arc runner that
 * records beats and reads magnitudes.
 */

import { Decimal, runUntil, type Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import {
  AutomationKey,
  FirmKey,
  OfflineKey,
  StandingKey,
  TipsKey,
  createProducerModules,
  type AutomationApi,
  type AutomationModuleOptions,
  type FirmApi,
  type OfflineApi,
  type StandingApi,
  type TipsApi,
} from '../modules';
import { ACTIVE_DEAL_RATE } from '../data';
import { PLAYER_EVERY, createReferencePlayer, seatPlayer, type PlayerOptions } from './_player';

/** Sim seconds per runner step: one tick, one turn of the player. */
export const DT = PLAYER_EVERY;

export interface Beat {
  /** Stable key: one beat per thing reached. */
  key: string;
  label: string;
  /** Sim seconds since founding. */
  t: number;
}

/** The arc's options; `dealRate`, `catchRate` and `hireBookkeeper` set the player's. */
export interface ArcOptions extends Omit<PlayerOptions, 'every' | 'seed'> {
  /** Sim seconds to run. */
  seconds: number;
  /**
   * Times the player is away. At `at` the runner hands `seconds` to the shipping
   * catch-up; the arc resumes at the return. A beat reached while away is recorded
   * at the return, which is when the player sees it.
   */
  offlinePeriods?: { at: number; seconds: number }[];
  /** Probe-side variants of the acquisitions desk. Unset: the shipping desk. */
  automation?: AutomationModuleOptions;
  /** Seeds the engine's draws (tip clock, effects) and the player's catch rolls. */
  seed?: number;
  /** Unique persistence namespace prefix, so concurrent runs share no persistent context. */
  persistenceNamespacePrefix?: string;
}

export interface ArcResult {
  beats: Beat[];
  /** Units the hand bought before the acquisitions desk took over. */
  handBuys: number;
  /** Anomalies seen: NaN, negative cash. Empty on a clean run. */
  anomalies: string[];
  firm: FirmApi;
  automation: AutomationApi;
  offline: OfflineApi;
  tips: TipsApi;
  standing: StandingApi;
  /** The engine, for a catch-up the caller runs after the arc. */
  engine: Engine;
  dispose(): void;
}

/** Play one arc. The caller reads the end state off the returned APIs, then disposes. */
export function runArc(options: ArcOptions): ArcResult {
  const { seconds, seed = 1 } = options;
  const handle = bootTestEngine({
    modules: createProducerModules({ automation: options.automation }),
    intervalRate: 1 / DT,
    persistenceNamespacePrefix: options.persistenceNamespacePrefix ?? 'producer-arc',
    seed,
  });
  const firm = handle.engine.tryInject(FirmKey)!;
  const automation = handle.engine.tryInject(AutomationKey)!;
  const offline = handle.engine.tryInject(OfflineKey)!;
  const tips = handle.engine.tryInject(TipsKey)!;
  const standing = handle.engine.tryInject(StandingKey)!;
  const player = createReferencePlayer(handle.engine, {
    every: PLAYER_EVERY,
    dealRate: options.dealRate,
    catchRate: options.catchRate,
    hireBookkeeper: options.hireBookkeeper,
    seed,
  });

  const beats: Beat[] = [];
  const seen = new Set<string>();
  const fire = (key: string, label: string, t: number) => {
    if (seen.has(key)) return;
    seen.add(key);
    beats.push({ key, label, t });
  };
  const anomalies: string[] = [];
  const away = new Map((options.offlinePeriods ?? []).map((p) => [p.at, p.seconds]));
  /** Reads the state an advance left and logs what it reached at `now`. */
  function read(now: number): void {
    for (const e of firm.subsidiaries.getAll()) {
      if (Decimal.fromValue(e.producer.ownedCount.value).gte(1)) {
        fire(
          `open:${e.def.id}`,
          e.def.tier === 0
            ? `open t0 ${e.def.displayName} (first purchase)`
            : `open t${e.def.tier} ${e.def.displayName}`,
          now,
        );
      }
    }
    for (const e of firm.management.getAll()) {
      if (e.purchasable.active.value) fire(`m:${e.def.id}`, `manage ${e.def.title}`, now);
    }
    for (const e of firm.milestones.getAll()) {
      if (e.achievement.earned.value) fire(`ms:${e.def.id}`, `milestone ${e.def.title}`, now);
    }
    for (const e of firm.grades.getAll()) {
      if (e.achievement.earned.value) fire(`g:${e.def.id}`, `grade ${e.def.grade}`, now);
    }
    for (const e of standing.upgrades.getAll()) {
      if (e.purchasable.active.value) fire(`s:${e.def.id}`, `standing ${e.def.title}`, now);
    }
    for (const e of tips.upgrades.getAll()) {
      if (e.purchasable.active.value) fire(`u:${e.def.id}`, `tip upgrade ${e.def.title}`, now);
    }
    for (const e of standing.feats.getAll()) {
      if (e.achievement.earned.value) fire(`f:${e.def.id}`, `feat ${e.def.title}`, now);
    }
    if (tips.caught.value > 0) fire(`tip:${tips.caught.value}`, 'tip', now);
    if (firm.ending.visible.value) fire('ending-offered', 'ending offered', now);
    if (firm.ending.active.value) fire('ending', 'the Consolidated Building', now);
    for (const tier of automation.dispatch.tiers) {
      if (tier.order > 0 && automation.dispatch.isUnlocked(tier.id)) {
        fire(`d:${tier.id}`, `dispatch → ${tier.displayName}`, now);
      }
    }
    if (firm.incomeRate.value.gt(firm.dealValue.value.mul(ACTIVE_DEAL_RATE))) {
      fire('crossover', 'subsidiaries out-earn the hand', now);
    }

    const cash = Decimal.fromValue(firm.cash.value);
    if (cash.isNan() || firm.incomeRate.value.isNan()) anomalies.push(`NaN at ${now}`);
    if (cash.lt(0)) anomalies.push(`negative cash at ${now}`);
  }

  /** The arc's clock: the ticks plus the sim seconds the catch-ups replayed. */
  let t = 0;
  let handBuys = 0;
  const onTurn = (n: number) => {
    handBuys += n;
  };
  /** The arc between two returns, or to the horizon; true when it stopped to leave. */
  function playUntilAway(): boolean {
    const from = t;
    let leaving = false;
    const unseat = seatPlayer(handle.engine, player, onTurn);
    try {
      runUntil({
        engine: handle.engine,
        tickDelta: DT,
        // `until` ends the segment; the cap only backs it, a step past a horizon off the DT grid.
        maxSimTime: seconds - from + DT,
        until: ({ iteration, simTime }) => {
          // Iteration 0 is the founding or a return. A beat reached while away is read after the
          // first advance back, and no read repeats.
          if (iteration === 0) return false;
          t = from + simTime;
          read(Math.round(t * 100) / 100);
          if (anomalies.length > 5 || t >= seconds) return true;
          leaving = away.has(t);
          return leaving;
        },
      });
    } finally {
      unseat();
    }
    return leaving;
  }

  // The opening turn, before the first tick: the seat's turn closes each tick, so the player
  // acts once at founding and then after every tick. A return needs none; the seat's turn
  // closed the tick before the player left.
  onTurn(player.turn());
  while (playUntilAway()) {
    // The player sleeps through the catch-up; the desks work it.
    const leave = away.get(t)!;
    away.delete(t);
    const now = Date.now();
    const saved = { success: true, timestamp: now - leave * 1000 };
    t += offline.catchUp(handle.engine, saved, now).caughtUpSeconds;
  }

  return {
    beats,
    handBuys,
    anomalies,
    firm,
    automation,
    offline,
    tips,
    standing,
    engine: handle.engine,
    dispose: () => handle.dispose(),
  };
}
