/**
 * Shared probe fixture, not runnable on its own. Builds a real producer engine
 * and plays the arc on it.
 *
 * The runner is the reference player: it works only what a player works by hand.
 * It deals at the active rate, and through every closing spree; hand-buys units and
 * phones by the shipping acquisition policy; takes memos, hires and upgrades on
 * sight; and catches tips at a stated rate. It stops each chore when the desk that
 * automates it is hired and on duty (`/work/studio/CLAUDE.md` § automation as game
 * code). From then on the shipping desks in `../modules/automation.ts` play, so the
 * rule under measurement is the one the game ships. Once the ending is offered it
 * sends the acquisitions desk and the board home, buys nothing else, and buys the
 * ending when the cash is there.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list for
 * tick-by-tick behavioral specs; this assembles an instrumented arc runner that
 * records beats and reads magnitudes.
 */

import { Decimal, createSeededRNG, type TickDriver } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import {
  AutomationKey,
  FirmKey,
  OfflineKey,
  StandingKey,
  TipsKey,
  acquisitionPolicy,
  createProducerModules,
  type AutomationApi,
  type AutomationModuleOptions,
  type FirmApi,
  type OfflineApi,
  type StandingApi,
  type TipsApi,
} from '../modules';
import { ACTIVE_DEAL_RATE, REFERENCE_CATCH, type HireId } from '../data';

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
  /** Share of tips the player catches. Default: the reference player's. */
  catchRate?: number;
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
  const { seconds, dealRate = ACTIVE_DEAL_RATE, catchRate = REFERENCE_CATCH, seed = 1 } = options;
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
  const working = (id: HireId) => automation.working(id);
  const playerRng = createSeededRNG(seed + 7919);
  const spree = tips.effects.isActive('spree');
  const buyOnSight = (
    items: { purchasable: { canPurchase: { value: boolean }; purchase(n: number): unknown } }[],
  ) => {
    for (const e of items) if (e.purchasable.canPurchase.value) e.purchasable.purchase(1);
  };

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
  let tipSeen = false;
  let tipWanted = false;
  while (t < seconds) {
    const leave = away.get(t);
    if (leave !== undefined) {
      const now = Date.now();
      t += offline.catchUp(handle.engine.tickDriver, now - leave * 1000, now).caughtUpSeconds;
    }

    // A tip: the player decides once, when it comes up, whether this one is caught.
    if (tips.current.value === null) tipSeen = false;
    else if (!tipSeen) {
      tipSeen = true;
      tipWanted = playerRng() < catchRate;
    }
    if (tipSeen && tipWanted) tips.catchTip();

    // The hand: it deals until the sales desk takes over, and through every spree.
    if (!working('sales-desk') || spree.value) {
      owedClicks += DT * dealRate;
      while (owedClicks >= 1) {
        owedClicks -= 1;
        firm.deal();
      }
    }

    // The ending: send the spending desks home and save for it.
    const endingOffered = firm.ending.visible.value && !firm.ending.active.value;
    if (endingOffered) {
      automation.deskOn['acquisitions-desk'].value = false;
      automation.deskOn.board.value = false;
      if (firm.ending.canPurchase.value) firm.ending.purchase(1);
    }

    if (!endingOffered) buyOnSight(automation.executives.getAll());
    if (!endingOffered && options.hireBookkeeper && offline.bookkeeper.canPurchase.value) {
      offline.bookkeeper.purchase(1);
    }
    if (!endingOffered) {
      buyOnSight(standing.upgrades.getAll());
      buyOnSight(tips.upgrades.getAll());
    }
    if (!endingOffered && !working('board')) buyOnSight(firm.management.getAll());
    if (!endingOffered && !working('acquisitions-desk')) {
      for (;;) {
        const affordable = [
          ...firm.subsidiaries.getAll().map((e) => e.producer),
          automation.phone,
        ].filter((p) => p.repeatable?.canPurchase.value);
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
