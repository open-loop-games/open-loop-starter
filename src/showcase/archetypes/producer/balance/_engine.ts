/**
 * Shared probe fixture, not runnable on its own. Builds a real producer engine
 * and plays the arc on it under `_player.ts`'s reference player, recording the
 * beats it reaches.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list for
 * tick-by-tick behavioral specs; this assembles an instrumented arc runner that
 * records beats and reads magnitudes.
 */

import { Decimal, type TickDriver } from '@open-loop/engine';
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
import { createReferencePlayer, type PlayerOptions } from './_player';

/** Sim seconds per runner step: the hand acts four times a second. */
export const DT = 0.25;

export interface Beat {
  /** Stable key: one beat per thing reached. */
  key: string;
  label: string;
  /** Sim seconds since founding. */
  t: number;
}

/** The arc's options; `dealRate`, `catchRate` and `hireBookkeeper` set the player's. */
export interface ArcOptions extends Omit<PlayerOptions, 'dt' | 'seed'> {
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
  /** The engine's driver, for a catch-up the caller runs after the arc. */
  tickDriver: TickDriver;
  dispose(): void;
}

/** Play one arc. The caller reads the end state off the returned APIs, then disposes. */
export async function runArc(options: ArcOptions): Promise<ArcResult> {
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
    dt: DT,
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

  let t = 0;
  let handBuys = 0;
  while (t < seconds) {
    const leave = away.get(t);
    if (leave !== undefined) {
      const now = Date.now();
      t += offline.catchUp(handle.engine.tickDriver, now - leave * 1000, now).caughtUpSeconds;
    }

    handBuys += player.step();

    await handle.tick(1);
    t += DT;
    const now = Math.round(t * 100) / 100;

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
    if (anomalies.length > 5) break;
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
    tickDriver: handle.engine.tickDriver,
    dispose: () => handle.dispose(),
  };
}

/** Sim seconds as `NmSSs`; an em dash for never. */
export const fmt = (s: number): string =>
  Number.isFinite(s)
    ? `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}s`
    : '—';
