/**
 * Shared probe fixture, not runnable on its own. Builds a real scaler engine and
 * plays the arc on it under the reference player.
 *
 * The reference player works only what a player works by hand: it recruits by
 * the Dispatch Desk's own policy until the desk is hired, buys the Legacy shop in
 * price order and Hero Training whenever affordable, the Continuity shop the same
 * way with Mythic Standing, reboots at the spine's share until the Succession
 * Plan takes over, rewrites the moment Continuity is pending, and enters the next
 * open Elseworld at the start of a timeline once output is back at the multiplier
 * Elseworld goals are sized at. From then on the shipping automation in
 * `../modules/automation.ts` plays (`/work/studio/CLAUDE.md` § automation as game
 * code).
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list for
 * tick-by-tick behavioral specs; this assembles an instrumented arc runner that
 * records beats and reads magnitudes.
 */

import { Decimal, type DecimalSource } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  AutomationKey,
  ContinuityKey,
  CoreKey,
  LegacyKey,
  LegendsKey,
  PrestigeKey,
  RunKey,
  createScalerModules,
  shouldReboot,
  type AutomationApi,
  type ContinuityApi,
  type CoreApi,
  type LegacyApi,
  type LegendsApi,
  type PrestigeApi,
  type RunApi,
} from '../modules';
import { ANCHORS, CONTINUITY_PRICES, ELSEWORLD_MU, LEGACY_PRICES, TIERS } from '../data';

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
  /** Legacy earned since the last Rewrite after it, or -1 when the step was a Rewrite. */
  earned: number;
  /** Output multiplier during the timeline. */
  mult: number;
}

export interface RewriteRow {
  at: number;
  /** Seconds since the previous Rewrite. */
  cycle: number;
  gain: number;
}

export interface ArcResult {
  beats: Beat[];
  /** Seconds into the first timeline at which each tier opened. */
  firstRunOpens: (number | undefined)[];
  /** Seconds into the second timeline at which each tier opened. */
  secondRunOpens: (number | undefined)[];
  /** Units of the tier below held when each tier opened, first timeline. */
  heldAtOpen: number[];
  reboots: RebootRow[];
  rewrites: RewriteRow[];
  anomalies: string[];
  core: CoreApi;
  run: RunApi;
  legacy: LegacyApi;
  continuity: ContinuityApi;
  prestige: PrestigeApi;
  legends: LegendsApi;
  automation: AutomationApi;
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
  const prestige = handle.engine.tryInject(PrestigeKey)!;
  const legends = handle.engine.tryInject(LegendsKey)!;
  const automation = handle.engine.tryInject(AutomationKey)!;
  const t = () => core.playSeconds.value;
  const output = () => num(core.output.apply(1));

  const beats: Beat[] = [];
  const beat = (text: string) => beats.push({ at: t(), text });
  let elseworldEnteredAt = 0;

  function playerTurn() {
    if (!automation.ladder.isUnlocked('dispatch')) automation.recruitBest();
    for (const id of Object.keys(LEGACY_PRICES) as (keyof typeof LEGACY_PRICES)[]) {
      const up = legacy.upgrade(id);
      if (!up.active.value && up.canPurchase.value) up.purchase(1);
    }
    while (legacy.upgrade('training').canPurchase.value) legacy.upgrade('training').purchase(1);
    for (const id of Object.keys(CONTINUITY_PRICES) as (keyof typeof CONTINUITY_PRICES)[]) {
      const up = continuity.upgrade(id);
      if (!up.active.value && up.canPurchase.value) up.purchase(1);
    }
    while (continuity.upgrade('mythic').canPurchase.value) continuity.upgrade('mythic').purchase(1);

    const elseworlds = prestige.elseworlds;
    if (elseworlds.current.value && t() - elseworldEnteredAt > ELSEWORLD_TIMEOUT_S) {
      prestige.abandonElseworld();
    }
    if (Decimal.gte(prestige.pendingContinuity.value, 1) && !elseworlds.current.value) {
      prestige.rewrite();
      return;
    }
    if (!automation.ladder.isUnlocked('succession')) {
      const state = {
        pendingLegacy: num(prestige.pendingLegacy.value),
        legacyEarned: num(legacy.legacyEarned.value),
        inElseworld: elseworlds.current.value !== null,
      };
      if (shouldReboot(state, { share: ANCHORS.rebootFraction })) prestige.reboot();
    }
    // A fresh timeline with Elseworlds open and one unresolved: take it on, once
    // output is back to the multiplier the goals are sized at, never with
    // Continuity pending.
    const ready = output() >= ELSEWORLD_MU && Decimal.lt(prestige.pendingContinuity.value, 1);
    if (ready && !elseworlds.current.value && run.runSeconds.value < 1) {
      const open = elseworlds
        .getAll()
        .find((e) => e.challenge.canEnter.value && !e.challenge.completed.value);
      if (open && prestige.enterElseworld(open.def.id)) elseworldEnteredAt = t();
    }
  }

  const tierSeen = new Set<string>();
  const firstRunOpens: (number | undefined)[] = [];
  const secondRunOpens: (number | undefined)[] = [];
  const heldAtOpen: number[] = [];
  const reboots: RebootRow[] = [];
  const rewrites: RewriteRow[] = [];
  const anomalies: string[] = [];
  let firstPurchase: number | undefined;
  let lastRebootAt = 0;
  let lastRewriteAt = 0;
  let lastSeq = 0;
  let stuckSince = 0;
  let lastRate = 0;

  while (t() < seconds) {
    const rebootsBefore = core.reboots.value;
    const rewritesBefore = core.rewrites.value;
    const continuityBefore = num(continuity.continuity.cumulative!.value);
    const multBefore = output();
    playerTurn();
    handle.engine.tickDriver.advanceTime(DT);

    for (const { def, producer } of run.heroes.getAll()) {
      const owned = num(producer.ownedCount.value);
      if (owned > 0 && firstPurchase === undefined) {
        firstPurchase = t();
        beat(`first purchase (${def.displayName})`);
      }
      const timeline = core.reboots.value;
      const key = `${timeline}:${def.id}`;
      if (owned > 0 && !tierSeen.has(key)) {
        tierSeen.add(key);
        const sinceRun = run.runSeconds.value;
        if (timeline === 0) {
          firstRunOpens[def.tier - 1] = sinceRun;
          if (def.tier > 1) {
            const below = run.heroes.getAll()[def.tier - 2].producer;
            heldAtOpen[def.tier - 2] = num(below.ownedCount.value);
          }
          beat(`tier ${def.tier} opened: ${def.displayName}`);
        }
        if (timeline === 1 && core.rewrites.value === 0) secondRunOpens[def.tier - 1] = sinceRun;
      }
    }

    if (core.reboots.value !== rebootsBefore) {
      reboots.push({
        n: core.reboots.value,
        at: t(),
        run: t() - lastRebootAt,
        earned: core.rewrites.value !== rewritesBefore ? -1 : num(legacy.legacyEarned.value),
        mult: multBefore,
      });
      lastRebootAt = t();
    }
    if (core.rewrites.value !== rewritesBefore) {
      rewrites.push({
        at: t(),
        cycle: t() - lastRewriteAt,
        gain: num(continuity.continuity.cumulative!.value) - continuityBefore,
      });
      lastRewriteAt = t();
    }

    for (const l of core.scanner.value) if (l.seq > lastSeq) beats.push({ at: t(), text: l.text });
    lastSeq = core.scanner.value.at(-1)?.seq ?? lastSeq;

    const justice = num(run.justice.value);
    const rate = num(run.totalRate.value);
    if (!Number.isFinite(justice) || Number.isNaN(rate)) {
      anomalies.push(`t=${t().toFixed(0)} non-finite justice/rate: ${justice} / ${rate}`);
      break;
    }
    if (rate <= lastRate && Decimal.lt(prestige.pendingLegacy.value, 1)) {
      if (t() - stuckSince > 900) {
        anomalies.push(`t=${t().toFixed(0)} rate flat for 15 min with nothing pending`);
        stuckSince = t();
      }
    } else stuckSince = t();
    lastRate = rate;
  }

  return {
    beats,
    firstRunOpens,
    secondRunOpens,
    heldAtOpen,
    reboots,
    rewrites,
    anomalies,
    core,
    run,
    legacy,
    continuity,
    prestige,
    legends,
    automation,
    dispose: handle.dispose,
  };
}

export { TIERS };
