/**
 * The arc probe's reference player, through the game's own verbs. The arc
 * probe records its nights; the games site's beat script saves at them.
 *
 * The player works only what a player works by hand: it writes the plan
 * between nights, presses Begin until Routine takes over, and buys notes
 * cheapest-first, the spine's assumed buying rule. Routine and Discipline run
 * as the shipping `modules/automation.ts` once bought.
 */
import { Decimal } from '@open-loop/engine';
import { NOTES, ZONES, referencePlan } from '../data';
import { getAutomation, getMeta, getNight, type PlanRow } from '../modules';

/**
 * The plan for the ground known up to zone `known`: the spine's reference plan,
 * then training to fill the night.
 */
export function planFor(known: number, patrolLevel: number): PlanRow[] {
  // Training long enough that no night's plan runs out before its Nerve does.
  const filler: PlanRow[] = ['push-ups', 'shadow-walk', 'rehearse'].map((id) => ({
    id,
    times: 250,
  }));
  return [...referencePlan({ known, patrolLevel }), ...filler];
}

/** Buy notes cheapest-first until nothing is affordable; returns the ids bought. */
export function buyCheapest(): string[] {
  const { notes } = getMeta();
  const bought: string[] = [];
  for (;;) {
    const open = NOTES.map((s) => notes.getPurchasable(s.id)!)
      .filter((p) => p.visible.value && !p.maxed.value)
      .sort((a, b) => new Decimal(a.getCost(1)).cmp(b.getCost(1)));
    const p = open[0];
    if (!p || !p.canPurchase.value) break;
    p.purchase(1);
    bought.push(p.id);
  }
  return bought;
}

export interface ReferencePlayer {
  /** The first lights-out: write the plan and begin the night. */
  begin: () => void;
  /** The dusk after a night ends: buy notes; returns the ids bought. */
  buy: () => string[];
  /** Then rewrite the plan, and begin the next night unless Routine does. */
  replan: () => void;
}

/** Binds the player to the running engine's modules. */
export function createReferencePlayer(): ReferencePlayer {
  const meta = getMeta();
  const night = getNight();
  const automation = getAutomation();
  const discovered = () => ZONES.filter((z) => meta.zones.isUnlocked(z.id)).length - 1;
  const writePlan = () => {
    meta.plan.value = planFor(discovered(), meta.patrolKnowledge.value);
  };

  return {
    begin() {
      writePlan();
      night.beginNight();
    },
    buy: buyCheapest,
    replan() {
      writePlan();
      if (!automation.hasReached('routine')) night.beginNight();
    },
  };
}
