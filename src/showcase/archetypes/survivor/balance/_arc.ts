/**
 * Survivor — one arc, driven headless. The fixture both probes run on.
 *
 * Not runnable on its own (`_` prefix, per `.claude/rules/archetype-authoring.md`
 * § Canonical `balance/` filenames). `arena-probe.ts` runs it once per seat and
 * reads the run in depth; `spread-probe.ts` runs it across a seed batch and
 * reads the distribution. Both must be driving the same arc for the second to
 * say anything about the first, which is why this is one function rather than
 * two copies that drifted.
 *
 * Drives the REAL assembled engine — the shipping `survivor/arena` module, its
 * pure step, its steering policy. No re-implementation: a probe that measures a
 * model of the game measures the model.
 */

import { bootTestEngine } from '@/test/bootTestEngine';
import { ArenaKey, DraftKey, RunKey, createSurvivorModules } from '../modules';

/**
 * One minute of an arc: the level reached by its end, and what happened during
 * it. The counters are DELTAS over the minute, not cumulative totals — a ratio
 * of cumulative counters is dominated by the early run and cannot show a trend.
 */
export interface ArcSample {
  minute: number;
  level: number;
  liveSpecimens: number;
  kills: number;
  reached: number;
  spawned: number;
  /**
   * Summed levels across every installed device — the loadout's offensive mass.
   *
   * Sampled beside `level` because the two answer different questions and only
   * the pair separates them: run level is what the ladder GRANTED, this is what
   * the draft policy PICKED with it. Two seats at the same run level holding
   * different offensive mass is a selection difference; the same mass killing at
   * different rates is not.
   */
  deviceLevels: number;
  /** Cumulative picks flagged defensive — the `defenseShare` authored parameter, realized. */
  defensivePicks: number;
  /** Effective damage that produced a kill this minute. */
  damageConverted: number;
  /** Effective damage spent on bodies that left the floor alive this minute. */
  damageWasted: number;
}

/** 5 ticks per sim-second — coarse enough to be quick, fine enough to steer. */
export const INTERVAL_RATE = 5;
/** The authored arc. A seat that survives it ends on `timer`. */
export const MINUTES = 30;

/**
 * One seat's full arc on one seed.
 *
 * Ticked a minute at a time rather than in one call so the live census can be
 * SAMPLED. Nothing bounds population — `entityBudget` is gone — so what the
 * census reads is the shape of the curve rather than how long it sat against a
 * cap. `localDensity` (`../data/arena.ts`) is the model it has to be read
 * against, and that model is unclamped too, so a divergence is a real
 * disagreement rather than a clamp doing the agreeing.
 */
export async function runArc(seatId: string, seed: number) {
  const handle = bootTestEngine({
    modules: createSurvivorModules({ seed }),
    intervalRate: INTERVAL_RATE,
    persistenceNamespacePrefix: `survivor-arena-${seatId}-${seed}`,
  });
  const arena = handle.engine.tryInject(ArenaKey);
  const run = handle.engine.tryInject(RunKey);
  const draft = handle.engine.tryInject(DraftKey);
  if (!arena || !run || !draft) throw new Error('runArc: survivor modules did not provide');

  run.startRun(seatId);

  let peakSpecimens = 0;
  let peakAt = 0;
  let liveAt10 = 0;
  let peakCarry = 0;
  // Per-minute samples of the cumulative counters, differenced by the caller.
  // End-of-run totals cannot tell a seat that was always behind from one that
  // fell behind — and those are different repairs, so the arc has to be sampled
  // rather than summed. See `./lethality-probe.ts`.
  const series: ArcSample[] = [];
  let prev = { kills: 0, reached: 0, spawned: 0, damageConverted: 0, damageWasted: 0 };
  for (let m = 0; m < MINUTES; m++) {
    await handle.tick(60 * INTERVAL_RATE);
    const live = arena.state.value;
    if (live.specimens.length > peakSpecimens) {
      peakSpecimens = live.specimens.length;
      peakAt = live.time;
    }
    if (m === 9) liveAt10 = live.specimens.length;
    peakCarry = Math.max(peakCarry, live.spawnCarry);
    const st = live.stats;
    series.push({
      minute: m + 1,
      level: run.level.value,
      liveSpecimens: live.specimens.length,
      kills: st.kills - prev.kills,
      reached: st.reached - prev.reached,
      spawned: st.spawned - prev.spawned,
      deviceLevels: live.devices.reduce((n, d) => n + d.level, 0),
      defensivePicks: draft.takenDefensive.value,
      damageConverted: st.damageConverted - prev.damageConverted,
      damageWasted: st.damageWasted - prev.damageWasted,
    });
    prev = {
      kills: st.kills,
      reached: st.reached,
      spawned: st.spawned,
      damageConverted: st.damageConverted,
      damageWasted: st.damageWasted,
    };
    if (arena.outcome.value !== 'running') break;
  }

  const s = arena.state.value;
  const stats = s.stats;
  handle.dispose();

  const etaMeasured = stats.motesDropped > 0 ? stats.motesBanked / stats.motesDropped : 0;
  // η split into its two channels, which is what `../BALANCING.md` § Running a
  // pass asks for: continuous pickup is the policy's doing, burst share is the
  // collector's. A single η conflates a good pilot with a lucky drop.
  const etaContinuous =
    stats.motesDropped > 0
      ? (stats.motesBanked - stats.motesCollectedByCollector) / stats.motesDropped
      : 0;
  const burstShare =
    stats.motesBanked > 0 ? stats.motesCollectedByCollector / stats.motesBanked : 0;
  return {
    seatId,
    seed,
    level: run.level.value,
    bindingCause: run.bindingCause.value,
    scheduleDelta: run.scheduleDelta.value,
    picks: draft.taken.value,
    devices: s.devices.length,
    evolved: s.devices.filter((d) => d.evolutionId).length,
    outcome: arena.outcome.value,
    elapsed: s.time,
    kills: stats.kills,
    dropped: stats.motesDropped,
    banked: stats.motesBanked,
    etaMeasured,
    etaContinuous,
    burstShare,
    collectorsTaken: stats.collectorsTaken,
    collectorsDropped: s.collectorsDropped,
    spawned: stats.spawned,
    reached: stats.reached,
    series,
    peakSpecimens,
    peakAt,
    liveAt10,
    peakCarry,
    liveSpecimens: s.specimens.length,
    liveMotes: s.motes.length,
    contactSeconds: stats.contactSeconds,
    firstDamageAt: stats.firstDamageAt,
    hpMilestoneAt: stats.hpMilestoneAt,
    damageConverted: stats.damageConverted,
    damageWasted: stats.damageWasted,
    bodiesWasted: stats.bodiesWasted,
    damageOverkill: stats.damageOverkill,
    /**
     * Damage sitting in bodies still standing when the run ended. Not folded
     * into `damageWasted` — those bodies never finished, so calling their
     * damage wasted would charge the run for a verdict it never reached.
     */
    standingDamage: s.specimens.reduce((n, sp) => n + Math.max(0, sp.spawnHp - sp.hp), 0),
    hpLeft: Math.max(0, s.operator.hp),
    hpMax: s.operator.maxHp,
    deviceStats: stats.devices,
    installed: s.devices.map((d) => ({ defId: d.defId, level: d.level, evolved: !!d.evolutionId })),
  };
}

export type ArcResult = Awaited<ReturnType<typeof runArc>>;

/** `mm:ss` from sim-seconds. Every survivor probe prints times this way. */
export const clock = (t: number): string => {
  const total = Math.round(t);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Left-pad to a fixed column. */
export const col = (s: string | number, w: number): string => String(s).padEnd(w);
