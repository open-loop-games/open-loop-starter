/**
 * Shared probe fixture, not runnable on its own. Builds a real producer engine
 * and plays the arc on it.
 *
 * The runner works only what a player works by hand: deals at the active rate,
 * hand-buys by the shipping acquisition policy, memos and hires on sight. It
 * stops each one when the desk that automates it is hired and on duty
 * (`/work/studio/CLAUDE.md` § automation as game code). From then on the shipping
 * desks in `../modules/automation.ts` play, so the rule under measurement is the
 * one the game ships.
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
  acquisitionPolicy,
  createProducerModules,
  type AutomationApi,
  type AutomationModuleOptions,
  type FirmApi,
  type OfflineApi,
} from '../modules';
import { ACTIVE_DEAL_RATE, type HireId } from '../data';

/** Sim seconds per runner step: the hand acts four times a second. */
export const DT = 0.25;

export interface Beat {
  /** Stable key: one beat per thing reached. */
  key: string;
  label: string;
  /** Sim seconds since founding. */
  t: number;
}

export interface ArcOptions {
  /** Sim seconds to run. */
  seconds: number;
  /** Deals per second the hand closes before the sales desk. */
  dealRate?: number;
  /** Buy the night bookkeeper when it is affordable. The cell's arc never does. */
  hireBookkeeper?: boolean;
  /**
   * Times the player is away. At `at` the runner hands `seconds` to the shipping
   * catch-up; the arc resumes at the return. A beat reached while away is recorded
   * at the return, which is when the player sees it.
   */
  offlinePeriods?: { at: number; seconds: number }[];
  /** Probe-side variants of the acquisitions desk. Unset: the shipping desk. */
  automation?: AutomationModuleOptions;
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
  /** The engine's driver, for a catch-up the caller runs after the arc. */
  tickDriver: TickDriver;
  dispose(): void;
}

/** Play one arc. The caller reads the end state off the returned APIs, then disposes. */
export async function runArc(options: ArcOptions): Promise<ArcResult> {
  const { seconds, dealRate = ACTIVE_DEAL_RATE } = options;
  const handle = bootTestEngine({
    modules: createProducerModules({ automation: options.automation }),
    intervalRate: 1 / DT,
    persistenceNamespacePrefix: options.persistenceNamespacePrefix ?? 'producer-arc',
  });
  const firm = handle.engine.tryInject(FirmKey)!;
  const automation = handle.engine.tryInject(AutomationKey)!;
  const offline = handle.engine.tryInject(OfflineKey)!;
  const working = (id: HireId) => automation.working(id);

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
  let owedClicks = 0;
  let handBuys = 0;
  while (t < seconds) {
    const leave = away.get(t);
    if (leave !== undefined) {
      const now = Date.now();
      t += offline.catchUp(handle.engine.tickDriver, now - leave * 1000, now).caughtUpSeconds;
    }

    // The hand.
    if (!working('sales-desk')) {
      owedClicks += DT * dealRate;
      while (owedClicks >= 1) {
        owedClicks -= 1;
        firm.deal();
      }
    }
    for (const e of automation.executives.getAll()) {
      if (e.purchasable.canPurchase.value) e.purchasable.purchase(1);
    }
    if (options.hireBookkeeper && offline.bookkeeper.canPurchase.value) {
      offline.bookkeeper.purchase(1);
    }
    if (!working('board')) {
      for (const e of firm.management.getAll()) {
        if (e.purchasable.canPurchase.value) e.purchasable.purchase(1);
      }
    }
    if (!working('acquisitions-desk')) {
      for (;;) {
        const affordable = firm.subsidiaries
          .getAll()
          .map((e) => e.producer)
          .filter((p) => p.repeatable?.canPurchase.value);
        const pick = acquisitionPolicy.pick(affordable);
        if (!pick) break;
        pick.repeatable!.purchase(1);
        handBuys++;
      }
    }

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
    tickDriver: handle.engine.tickDriver,
    dispose: () => handle.dispose(),
  };
}

/** Sim seconds as `NmSSs`; an em dash for never. */
export const fmt = (s: number): string =>
  Number.isFinite(s)
    ? `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}s`
    : '—';
