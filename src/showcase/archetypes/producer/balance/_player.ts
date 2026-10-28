/**
 * The spine's reference player, one step at a time, through the game's own
 * verbs. The arc probe times its beats; the games site's beat script saves at
 * them.
 *
 * It works only what a player works by hand. It deals at the active rate, and
 * through every closing spree; hand-buys units and phones by the shipping
 * acquisition policy; takes memos, hires and upgrades on sight; and catches tips
 * at a stated rate. It stops each chore when the desk that automates it is hired
 * and on duty (`/work/studio/CLAUDE.md` § automation as game code). From then on
 * the shipping desks in `../modules/automation.ts` play, so the rule under
 * measurement is the one the game ships. Once the ending is offered it sends the
 * acquisitions desk and the board home, buys nothing else, and buys the ending
 * when the cash is there.
 *
 * The caller advances the engine by `dt` sim seconds after each step.
 */

import { createSeededRNG, type Engine } from '@open-loop/engine';
import {
  AutomationKey,
  FirmKey,
  OfflineKey,
  StandingKey,
  TipsKey,
  acquisitionPolicy,
} from '../modules';
import { ACTIVE_DEAL_RATE, REFERENCE_CATCH, type HireId } from '../data';

export interface PlayerOptions {
  /** Sim seconds between steps. */
  dt: number;
  /** Deals per second the hand closes before the sales desk. */
  dealRate?: number;
  /** Share of tips the player catches. Default: the reference player's. */
  catchRate?: number;
  /** Buy the night bookkeeper when it is affordable. The cell's arc never does. */
  hireBookkeeper?: boolean;
  /** Seeds the player's catch rolls. */
  seed?: number;
}

/**
 * Binds the player to an engine's producer modules; call `step` once per `dt`.
 * `step` returns the units and phones the hand bought, before the acquisitions desk.
 */
export function createReferencePlayer(
  engine: Engine,
  options: PlayerOptions,
): { step: () => number } {
  const { dt, dealRate = ACTIVE_DEAL_RATE, catchRate = REFERENCE_CATCH, seed = 1 } = options;
  const firm = engine.tryInject(FirmKey)!;
  const automation = engine.tryInject(AutomationKey)!;
  const offline = engine.tryInject(OfflineKey)!;
  const tips = engine.tryInject(TipsKey)!;
  const standing = engine.tryInject(StandingKey)!;
  const working = (id: HireId) => automation.working(id);
  const playerRng = createSeededRNG(seed + 7919);
  const spree = tips.effects.isActive('spree');
  const buyOnSight = (
    items: { purchasable: { canPurchase: { value: boolean }; purchase(n: number): unknown } }[],
  ) => {
    for (const e of items) if (e.purchasable.canPurchase.value) e.purchasable.purchase(1);
  };

  let owedClicks = 0;
  let tipSeen = false;
  let tipWanted = false;

  function step(): number {
    let handBuys = 0;

    // A tip: the player decides once, when it comes up, whether this one is caught.
    if (tips.current.value === null) tipSeen = false;
    else if (!tipSeen) {
      tipSeen = true;
      tipWanted = playerRng() < catchRate;
    }
    if (tipSeen && tipWanted) tips.catchTip();

    // The hand: it deals until the sales desk takes over, and through every spree.
    if (!working('sales-desk') || spree.value) {
      owedClicks += dt * dealRate;
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
        ].filter((p) => p.purchasable?.canPurchase.value);
        const pick = acquisitionPolicy.pick(affordable);
        if (!pick) break;
        pick.purchasable!.purchase(1);
        handBuys++;
      }
    }
    return handBuys;
  }

  return { step };
}
