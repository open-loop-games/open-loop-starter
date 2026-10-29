import { Decimal, type DecimalSource } from '@open-loop/engine';
import { ANCHORS, ELSEWORLD_SCHEDULE, NETWORK, PREDICTION, type ElseworldId } from '../data';
import { shouldReboot, shouldRewrite, type AutomationApi } from './automation';
import type { ContinuityApi } from './continuity';
import type { CoreApi } from './core';
import type { LegacyApi } from './legacy';
import type { PrestigeApi } from './prestige';
import type { RunApi } from './run';

/**
 * The reference player: the thin runner of manual openers that the arc probe
 * (`../balance/_engine.ts`) and the dev handle's skip share. It is tooling, not a
 * mechanic: no automation tier gates it, and it is a plain factory over the module
 * APIs, not an engine module, so it is not in `createScalerModules()`.
 *
 * One turn works what a player works by hand, by the shipping policies in
 * `./automation.ts`, until each piece of automation takes its job over,
 * because automation is game code. Each turn it:
 *   - recruits by the Dispatch Desk's policy, uncapped as a hand is, until the
 *     desk is hired;
 *   - spends Legacy by the Liaison's rule and Continuity by the Monitor's until
 *     each is bought, and Canon by the same rule always;
 *   - reboots at the spine's share until the Succession Plan takes over, rewrites
 *     at the spine's share until the Crossover Event does, and turns the Age the
 *     moment Canon is pending;
 *   - enters the spine's next scheduled Elseworld tier at the start of a timeline
 *     once its slot has come and output without Hope is back at the multiplier
 *     the goal is sized at, and abandons one it has not resolved in ten minutes.
 */

/** An Elseworld the reference has not resolved in this long is abandoned. */
const ELSEWORLD_TIMEOUT_S = 600;

const num = (x: DecimalSource) => Decimal.fromValue(x).toNumber();

/** One Elseworld the reference player entered. */
export interface ElseworldEntry {
  id: ElseworldId;
  tier: number;
  /** Seconds of play when it was entered. */
  entered: number;
  /** Seconds of play when it was resolved; the caller records it. */
  resolved?: number;
}

export interface ReferencePlayerApis {
  core: CoreApi;
  run: RunApi;
  legacy: LegacyApi;
  continuity: ContinuityApi;
  prestige: PrestigeApi;
  automation: AutomationApi;
}

export interface ReferencePlayer {
  /** Play one turn. */
  turn(): void;
  /** Every Elseworld entered, in order; the schedule advances by this count. */
  readonly elseworlds: readonly ElseworldEntry[];
  /** The Elseworld entered last, until it is abandoned. */
  readonly entered: ElseworldEntry | undefined;
}

/**
 * The output multiplier now, without Hope: the spine sizes a goal on the walk's
 * output, which leaves Hope to the timeline's τ, and Dark Days takes it away.
 */
const outputOf = (core: CoreApi, run: RunApi) =>
  num(core.output.apply(1)) / num(Decimal.add(1, run.hope.value).pow(NETWORK.power));

/**
 * Create a reference player over one engine's module APIs. It keeps its own
 * place in the Elseworld schedule, so build one per arc.
 *
 * @param apis - the APIs it reads and plays through.
 * @returns the player: its turn and the Elseworlds it has entered.
 * @example
 * const player = createReferencePlayer({ core, run, legacy, continuity, prestige, automation });
 * player.turn();
 * engine.tickDriver.advanceTime(0.5);
 */
export function createReferencePlayer(apis: ReferencePlayerApis): ReferencePlayer {
  const { core, run, legacy, continuity, prestige, automation } = apis;
  const t = () => core.playSeconds.value;
  const elseworlds: ElseworldEntry[] = [];
  let entered: ElseworldEntry | undefined;

  function turn() {
    const ladder = automation.ladder;
    const has = (tier: 'dispatch' | 'succession' | 'liaison' | 'crossover' | 'monitor') =>
      ladder.isUnlocked(tier);
    if (!(has('dispatch') && legacy.upgrade('dispatch').active.value)) automation.recruitBest();
    if (!has('liaison')) automation.spendLegacy();
    if (!has('monitor')) automation.spendContinuity();
    automation.spendCanon();

    const current = prestige.elseworlds.current.value;
    if (current && entered && t() - entered.entered > ELSEWORLD_TIMEOUT_S) {
      prestige.abandonElseworld();
      entered = undefined;
    }
    const inElseworld = prestige.elseworlds.current.value !== null;

    if (!inElseworld && Decimal.gte(prestige.pendingCanon.value, 1)) {
      prestige.turnAge();
      return;
    }
    if (!has('crossover')) {
      const rewriteNow = shouldRewrite(
        {
          pendingContinuity: num(prestige.pendingContinuity.value),
          continuityEarned: num(continuity.continuityEarned.value),
          inElseworld,
        },
        { share: ANCHORS.rewriteFraction },
      );
      if (rewriteNow) {
        prestige.rewrite();
        return;
      }
    }
    if (!has('succession')) {
      const rebootNow = shouldReboot(
        {
          pendingLegacy: num(prestige.pendingLegacy.value),
          legacyEarned: num(legacy.legacyEarned.value),
          inElseworld,
          runSeconds: run.runSeconds.value,
        },
        { share: ANCHORS.rebootFraction, interval: 0 },
      );
      if (rebootNow) prestige.reboot();
    }
    // A fresh timeline with the next scheduled slot come, its Elseworld open and
    // output back at the multiplier its goal is sized at: take it on.
    const next = ELSEWORLD_SCHEDULE[elseworlds.length];
    const slot = PREDICTION.walk.slots[elseworlds.length];
    const slotAt = ANCHORS.elseworldFirstS + elseworlds.length * ANCHORS.elseworldGapS;
    const strong = slot !== undefined && outputOf(core, run) >= slot.mu;
    if (
      next &&
      strong &&
      !prestige.elseworlds.current.value &&
      run.runSeconds.value < 1 &&
      t() >= slotAt
    ) {
      const challenge = prestige.elseworlds.getChallenge(next)!;
      const tier = challenge.completions.value + 1;
      if (challenge.canEnter.value && prestige.enterElseworld(next)) {
        entered = { id: next, tier, entered: t() };
        elseworlds.push(entered);
      }
    }
  }

  return {
    turn,
    elseworlds,
    get entered() {
      return entered;
    },
  };
}
