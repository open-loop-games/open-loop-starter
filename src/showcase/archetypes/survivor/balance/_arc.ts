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

/** 5 ticks per sim-second — coarse enough to be quick, fine enough to steer. */
export const TICK_RATE = 5;
/** The authored arc. A seat that survives it ends on `timer`. */
export const MINUTES = 30;

/**
 * One seat's full arc on one seed.
 *
 * Ticked a minute at a time rather than in one call so the live census can be
 * SAMPLED. Nothing bounds population — `entityBudget` is gone — so what the
 * census reads is the shape of the curve rather than how long it sat against a
 * ceiling. `localDensity` (`../data/arena.ts`) is the model it has to be read
 * against, and that model is unclamped too, so a divergence is a real
 * disagreement rather than a clamp doing the agreeing.
 */
export async function runArc(seatId: string, seed: number) {
  const handle = bootTestEngine({
    modules: createSurvivorModules({ seed }),
    tickRate: TICK_RATE,
    namespacePrefix: `survivor-arena-${seatId}-${seed}`,
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
  for (let m = 0; m < MINUTES; m++) {
    await handle.tick(60 * TICK_RATE);
    const live = arena.state.value;
    if (live.specimens.length > peakSpecimens) {
      peakSpecimens = live.specimens.length;
      peakAt = live.time;
    }
    if (m === 9) liveAt10 = live.specimens.length;
    peakCarry = Math.max(peakCarry, live.spawnCarry);
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
    peakSpecimens,
    peakAt,
    liveAt10,
    peakCarry,
    liveSpecimens: s.specimens.length,
    liveMotes: s.motes.length,
    contactSeconds: stats.contactSeconds,
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
