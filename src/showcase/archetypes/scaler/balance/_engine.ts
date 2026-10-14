/**
 * Shared probe fixture, not runnable on its own. Builds a real scaler engine and
 * plays the arc on it under the reference player.
 *
 * The reference player works only what a player works by hand, by the shipping
 * policies in `../modules/automation.ts`, until each piece of automation takes
 * its job over (`/work/studio/CLAUDE.md` § automation as game code):
 *   - recruits by the Dispatch Desk's policy until the desk is hired;
 *   - spends Legacy by the Liaison's rule and Continuity by the Monitor's until
 *     each is bought, and Canon by the same rule always;
 *   - reboots at the spine's share until the Succession Plan takes over, rewrites
 *     at the spine's share until the Crossover Event does, and turns the Age the
 *     moment Canon is pending;
 *   - enters the spine's next scheduled Elseworld tier at the start of a timeline
 *     once its slot has come and output without Hope is back at the multiplier
 *     the goal is sized at, and abandons one it has not resolved in ten minutes.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list for
 * tick-by-tick behavioral specs; this assembles an instrumented arc runner that
 * records beats and reads magnitudes.
 */

import { Decimal, type DecimalSource, type Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  AutomationKey,
  CanonKey,
  ContinuityKey,
  CoreKey,
  LegacyKey,
  LegendsKey,
  PrestigeKey,
  RunKey,
  createScalerModules,
  shouldReboot,
  shouldRewrite,
  type AutomationApi,
  type CanonApi,
  type ContinuityApi,
  type CoreApi,
  type LegacyApi,
  type LegendsApi,
  type PrestigeApi,
  type RunApi,
} from '../modules';
import { ANCHORS, ELSEWORLD_SCHEDULE, NETWORK, PREDICTION, TIERS, type ElseworldId } from '../data';

/** Sim seconds per runner step. */
export const DT = 0.5;
/** Engine intervals per second. */
export const INTERVAL_RATE = 20;
/** An Elseworld the reference has not resolved in this long is abandoned. */
const ELSEWORLD_TIMEOUT_S = 600;

export const num = (x: DecimalSource) => Decimal.fromValue(x).toNumber();

export interface Beat {
  at: number;
  text: string;
}

export interface RebootRow {
  n: number;
  at: number;
  /** Seconds this timeline ran. */
  run: number;
}

export interface RewriteRow {
  n: number;
  at: number;
  /** Seconds since the previous Rewrite or Age. */
  cycle: number;
  gain: number;
}

export interface AgeRow {
  n: number;
  at: number;
  /** Seconds since the previous Age. */
  age: number;
  gain: number;
}

export interface ElseworldRow {
  id: ElseworldId;
  tier: number;
  entered: number;
  resolved?: number;
}

/**
 * The output multiplier now, without Hope: the spine sizes a goal on the walk's
 * output, which leaves Hope to the timeline's τ, and Dark Days takes it away.
 */
const outputOf = (core: CoreApi, run: RunApi) =>
  num(core.output.apply(1)) / num(Decimal.add(1, run.hope.value).pow(NETWORK.power));

export interface ArcResult {
  beats: Beat[];
  /** Seconds into the first timeline at which each tier opened. */
  firstRunOpens: (number | undefined)[];
  /** Units of the tier below held when each tier opened, first timeline. */
  heldAtOpen: number[];
  reboots: RebootRow[];
  rewrites: RewriteRow[];
  ages: AgeRow[];
  elseworlds: ElseworldRow[];
  anomalies: string[];
  core: CoreApi;
  run: RunApi;
  legacy: LegacyApi;
  continuity: ContinuityApi;
  canon: CanonApi;
  prestige: PrestigeApi;
  legends: LegendsApi;
  automation: AutomationApi;
  /** The engine the arc ran on, for a probe that plays on past it. */
  engine: Engine;
  dispose(): void;
}

/** Play the arc for `seconds`. The caller reads the end state off the returned APIs. */
export function runArc(seconds: number): ArcResult {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createScalerModules()],
    intervalRate: INTERVAL_RATE,
    persistenceNamespacePrefix: 'scaler-arc',
  });
  const core = handle.engine.tryInject(CoreKey)!;
  const run = handle.engine.tryInject(RunKey)!;
  const legacy = handle.engine.tryInject(LegacyKey)!;
  const continuity = handle.engine.tryInject(ContinuityKey)!;
  const canon = handle.engine.tryInject(CanonKey)!;
  const prestige = handle.engine.tryInject(PrestigeKey)!;
  const legends = handle.engine.tryInject(LegendsKey)!;
  const automation = handle.engine.tryInject(AutomationKey)!;
  const t = () => core.playSeconds.value;

  const beats: Beat[] = [];
  const elseworlds: ElseworldRow[] = [];
  let entered: ElseworldRow | undefined;
  /** Completions the entered Elseworld resolves at. */
  let resolvedAt = 0;

  function playerTurn() {
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
        resolvedAt = tier;
      }
    }
  }

  const firstRunOpens: (number | undefined)[] = [];
  const heldAtOpen: number[] = [];
  const reboots: RebootRow[] = [];
  const rewrites: RewriteRow[] = [];
  const ages: AgeRow[] = [];
  const anomalies: string[] = [];
  let lastRebootAt = 0;
  let lastRewriteAt = 0;
  let lastAgeAt = 0;
  let lastSeq = 0;

  while (t() < seconds) {
    const rebootsBefore = core.reboots.value;
    const rewritesBefore = core.rewrites.value;
    const agesBefore = core.ages.value;
    const continuityBefore = num(continuity.continuity.cumulative!.value);
    const canonBefore = num(canon.canon.cumulative!.value);
    playerTurn();
    handle.engine.tickDriver.advanceTime(DT);

    if (core.reboots.value === 0) {
      for (const { def, producer } of run.heroes.getAll()) {
        if (num(producer.ownedCount.value) > 0 && firstRunOpens[def.tier - 1] === undefined) {
          firstRunOpens[def.tier - 1] = run.runSeconds.value;
          if (def.tier > 1) {
            const below = run.heroes.getAll()[def.tier - 2].producer;
            heldAtOpen[def.tier - 2] = num(below.ownedCount.value);
          }
        }
      }
    }
    if (entered && entered.resolved === undefined) {
      const done = prestige.elseworlds.getChallenge(entered.id)!.completions.value;
      if (done >= resolvedAt) entered.resolved = t();
    }
    if (core.reboots.value !== rebootsBefore) {
      reboots.push({ n: core.reboots.value, at: t(), run: t() - lastRebootAt });
      lastRebootAt = t();
    }
    if (core.rewrites.value !== rewritesBefore) {
      rewrites.push({
        n: core.rewrites.value,
        at: t(),
        cycle: t() - lastRewriteAt,
        gain: num(continuity.continuity.cumulative!.value) - continuityBefore,
      });
      lastRewriteAt = t();
      lastRebootAt = t();
    }
    if (core.ages.value !== agesBefore) {
      ages.push({
        n: core.ages.value,
        at: t(),
        age: t() - lastAgeAt,
        gain: num(canon.canon.cumulative!.value) - canonBefore,
      });
      lastAgeAt = t();
      lastRewriteAt = t();
      lastRebootAt = t();
    }

    for (const l of core.scanner.value) if (l.seq > lastSeq) beats.push({ at: t(), text: l.text });
    lastSeq = core.scanner.value.at(-1)?.seq ?? lastSeq;

    const justice = num(run.justice.value);
    const rate = num(run.totalRate.value);
    if (!Number.isFinite(justice) || Number.isNaN(rate)) {
      anomalies.push(`t=${t().toFixed(0)} non-finite justice/rate: ${justice} / ${rate}`);
      break;
    }
    if (t() - lastRebootAt > 1800) {
      anomalies.push(`t=${t().toFixed(0)} no Reboot for 30 min`);
      lastRebootAt = t();
    }
  }

  return {
    beats,
    firstRunOpens,
    heldAtOpen,
    reboots,
    rewrites,
    ages,
    elseworlds,
    anomalies,
    core,
    run,
    legacy,
    continuity,
    canon,
    prestige,
    legends,
    automation,
    engine: handle.engine,
    dispose: handle.dispose,
  };
}

export { TIERS };
