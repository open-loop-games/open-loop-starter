/**
 * The arc probe's reference player, through the game's own verbs. The arc
 * probe records its nights; the games site's beat script saves at them.
 *
 * The player works only what a player works by hand: it writes the plan
 * between nights, presses Begin until Routine takes over, and buys notes
 * cheapest-first, the spine's assumed buying rule. Routine and Discipline run
 * as the shipping `modules/automation.ts` once bought. The caller begins the
 * first night; `seatPlayer` works each dusk after it on the engine's tick driver.
 */
import { Decimal, createThrottle, type Engine } from '@open-loop/engine';
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

/** Game seconds between the player's turns: every tick of the probe's 0.1 s step. */
export const PLAYER_EVERY = 0.1;

/**
 * Seats the reference player on the engine's tick driver. Every `PLAYER_EVERY` game
 * seconds it looks for a night that ended since its last turn, then buys and replans.
 * The night ends in a module's own tick handler, which runs before the seat's. So the
 * player works the dusk in the tick the night ended in, and a runner's `until` stays a read.
 *
 * @param engine - the running engine whose modules the player works
 * @param onTurn - receives the note ids each dusk bought, for a probe to record
 * @returns the function that unseats the player; call it when the run ends.
 */
export function seatPlayer(engine: Engine, onTurn?: (bought: string[]) => void): () => void {
  const player = createReferencePlayer();
  const night = getNight();
  const turn = createThrottle({ interval: PLAYER_EVERY });
  let nightsDone = night.cycle.count.value;
  return engine.tickDriver.onTick((dt) => {
    if (!turn.ready(dt)) return;
    if (night.cycle.count.value === nightsDone) return;
    nightsDone = night.cycle.count.value;
    const bought = player.buy();
    player.replan();
    onTurn?.(bought);
  });
}
