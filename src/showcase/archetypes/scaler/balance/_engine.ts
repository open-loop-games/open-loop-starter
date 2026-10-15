/**
 * Shared probe fixture, not runnable on its own. Builds a real scaler engine and
 * plays the arc on it under the reference player (`../modules/reference-player.ts`).
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
  createReferencePlayer,
  createScalerModules,
  type AutomationApi,
  type CanonApi,
  type ContinuityApi,
  type CoreApi,
  type ElseworldEntry,
  type LegacyApi,
  type LegendsApi,
  type PrestigeApi,
  type RunApi,
} from '../modules';
import { TIERS } from '../data';

/** Sim seconds per runner step. */
export const DT = 0.5;
/** Engine intervals per second. */
export const INTERVAL_RATE = 20;

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

export interface ArcResult {
  beats: Beat[];
  /** Seconds into the first timeline at which each tier opened. */
  firstRunOpens: (number | undefined)[];
  /** Units of the tier below held when each tier opened, first timeline. */
  heldAtOpen: number[];
  reboots: RebootRow[];
  rewrites: RewriteRow[];
  ages: AgeRow[];
  elseworlds: readonly ElseworldEntry[];
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
  const player = createReferencePlayer({ core, run, legacy, continuity, prestige, automation });

  const beats: Beat[] = [];
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
    player.turn();
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
    const entered = player.entered;
    if (entered && entered.resolved === undefined) {
      const done = prestige.elseworlds.getChallenge(entered.id)!.completions.value;
      if (done >= entered.tier) entered.resolved = t();
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

    for (const l of core.scanner.since(lastSeq)) beats.push({ at: t(), text: l.text });
    lastSeq = core.scanner.lines.value.at(-1)?.seq ?? lastSeq;

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
    elseworlds: player.elseworlds,
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
