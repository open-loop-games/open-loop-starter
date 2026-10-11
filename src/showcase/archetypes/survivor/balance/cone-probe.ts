/**
 * Survivor — cone probe: what the wedge is worth under a better hand than the policy has.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/cone-probe.ts`
 * Seeds: `SEEDS=6 …` (default 4). Minutes: `CONE_MINUTES=15 …` (default 12).
 *
 * `../modules/draft.ts` `HEADING_BOUND_DISCOUNT` exists because a policy aims a
 * heading-bound shape worse than a player does, and until this probe that was the
 * one claim in `../BALANCING.md` with no reading behind it — reasoning, not a
 * measurement, holding up a live tuning decision.
 *
 * **The instrument is a ceiling, not a simulated player.** A scripted hand would
 * be a guess about how someone plays, and the number it produced would inherit
 * the guess. So this measures the *achievable* wedge instead: at each sample it
 * takes the operator's real position and the real specimen field, and asks what
 * the best possible orientation of the wedge would have caught. No hand exceeds
 * that, so `actual / best` bounds what better aiming can be worth. The bound is
 * generous on purpose — free rotation is not what a player has, because turning
 * to aim also moves them, and this charges nothing for that. Read a small gap as
 * conclusive and a large one as an upper bound.
 *
 * **The cone is force-installed** (`../modules/draft.ts` § apply does the same
 * push). Waiting for the shipping draft to offer it would measure the discount,
 * which is the thing under question — a probe cannot take its own hypothesis as
 * an input. Level is fixed across seats so the reading is about aiming rather
 * than about who drafts deeper.
 *
 * Sampling: every tick where the cone is inside `CONNECT_HORIZON` of firing —
 * which is exactly the window `../modules/sim/steering.ts` `CONNECT_WEIGHT`
 * weights by imminence, so this reads the policy while it is actually trying.
 * A separate column reads the ticks it fired on.
 */

import { spreadOf } from '@/balance';
import { bootTestEngine } from '@/test/bootTestEngine';
import { ArenaKey, RunKey, createSurvivorModules } from '../modules';
import { deviceReach, selectTargets } from '../modules/sim/dispatch';
import { CONNECT_HORIZON } from '../modules/sim/steering';
import type { DeviceRuntime, Specimen, Vec2 } from '../modules/sim/types';
import { SEATS } from '../data/seats';
import { col } from './_arc';

const SEED_COUNT = Number(process.env.SEEDS ?? 4);
const MINUTES = Number(process.env.CONE_MINUTES ?? 12);
/** 5 ticks/sim-second, matching `./_arc.ts`. */
const TICK_RATE = 5;
const CONE_ID = 'culture-sprayer';
/** Mid-run depth. Level moves reach and damage, never the wedge angle. */
const CONE_LEVEL = 4;
/** `../modules/sim/dispatch.ts` § cone — `dot >= 0.5`, so ±60°. */
const HALF_ANGLE = Math.PI / 3;

/**
 * Targets the best-oriented wedge would take from this position, capped the way
 * the shape is capped.
 *
 * An optimal angular window always has a body on its leading edge, so scanning
 * the window that opens at each body's bearing finds the maximum exactly — no
 * search over headings, and no resolution to argue about.
 */
function bestWedge(origin: Vec2, reach: number, specimens: readonly Specimen[], cap: number) {
  const bearings: number[] = [];
  const reach2 = reach * reach;
  for (const s of specimens) {
    const dx = s.x - origin.x;
    const dy = s.y - origin.y;
    if (dx * dx + dy * dy <= reach2) bearings.push(Math.atan2(dy, dx));
  }
  if (bearings.length === 0) return { best: 0, reachable: 0 };
  bearings.sort((a, b) => a - b);
  const n = bearings.length;
  let best = 0;
  for (let i = 0; i < n; i++) {
    // Window [θᵢ, θᵢ + 2·halfAngle]; walk forward with wraparound.
    let count = 0;
    for (let k = 0; k < n; k++) {
      let d = bearings[(i + k) % n]! - bearings[i]!;
      if (d < 0) d += Math.PI * 2;
      if (d > HALF_ANGLE * 2) break;
      count++;
    }
    if (count > best) best = count;
  }
  return { best: Math.min(best, cap), reachable: n };
}

interface SeatReading {
  /** actual/best per sample, over the aiming window. */
  capture: number[];
  /** The same, restricted to the ticks the device actually fired on. */
  captureAtFire: number[];
  actual: number[];
  best: number[];
  reachable: number[];
  fires: number;
}

async function runSeat(seatId: string, seed: number, into: SeatReading): Promise<void> {
  const handle = bootTestEngine({
    modules: createSurvivorModules({ seed }),
    intervalRate: TICK_RATE,
    namespacePrefix: `survivor-cone-${seatId}-${seed}`,
  });
  const arena = handle.engine.tryInject(ArenaKey);
  const run = handle.engine.tryInject(RunKey);
  if (!arena || !run) throw new Error('cone-probe: survivor modules did not provide');

  run.startRun(seatId);
  const state = arena.state.value;
  state.devices.push({ defId: CONE_ID, level: CONE_LEVEL, timer: 0 });

  const dt = 1 / TICK_RATE;
  const ticks = MINUTES * 60 * TICK_RATE;
  for (let t = 0; t < ticks; t++) {
    const live = arena.state.value;
    const cone = live.devices.find((d: DeviceRuntime) => d.defId === CONE_ID);
    // Pre-tick: the timer still says how far off the shot is, and the heading is
    // the one the policy has committed to for this tick.
    const armed = cone !== undefined && cone.timer <= CONNECT_HORIZON;
    const willFire = cone !== undefined && cone.timer <= dt;
    let sample: { actual: number; best: number; reachable: number } | null = null;
    if (armed && cone) {
      const reach = deviceReach(cone, live.reagentStacks);
      const origin = { x: live.operator.x, y: live.operator.y };
      const { targets } = selectTargets(cone, origin, live.operator.heading, reach, live.specimens);
      const { best, reachable } = bestWedge(origin, reach, live.specimens, 5);
      sample = { actual: targets.length, best, reachable };
    }

    await handle.tick(1);

    if (sample && sample.best > 0) {
      into.capture.push(sample.actual / sample.best);
      into.actual.push(sample.actual);
      into.best.push(sample.best);
      into.reachable.push(sample.reachable);
      if (willFire) {
        into.captureAtFire.push(sample.actual / sample.best);
        into.fires++;
      }
    }
    if (arena.outcome.value !== 'running') break;
  }
  handle.dispose();
}

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

async function main(): Promise<void> {
  console.log('Survivor — cone probe (shipping module + shipping policy, headless)');
  console.log(
    `${SEED_COUNT} seeds x ${SEATS.length} seats, ${MINUTES} sim-minutes each, ` +
      `${CONE_ID} force-installed at level ${CONE_LEVEL}.\n`,
  );

  console.log(
    col('  seat', 13) +
      col('samples', 10) +
      col('in wedge', 11) +
      col('best wedge', 12) +
      col('in reach', 11) +
      col('capture', 10) +
      'capture at fire',
  );

  const roster: SeatReading[] = [];
  for (const seat of SEATS) {
    const r: SeatReading = {
      capture: [],
      captureAtFire: [],
      actual: [],
      best: [],
      reachable: [],
      fires: 0,
    };
    for (let i = 0; i < SEED_COUNT; i++) await runSeat(seat.id, 12345 + i * 7919, r);
    roster.push(r);
    if (r.capture.length === 0) {
      console.log(col(`  ${seat.id}`, 13) + 'no armed sample with a reachable body');
      continue;
    }
    const s = spreadOf(r.capture, { v: (x) => x }).v!;
    const a = spreadOf(r.actual, { v: (x) => x }).v!;
    const b = spreadOf(r.best, { v: (x) => x }).v!;
    const re = spreadOf(r.reachable, { v: (x) => x }).v!;
    const f =
      r.captureAtFire.length > 0 ? spreadOf(r.captureAtFire, { v: (x) => x }).v!.avg : Number.NaN;
    console.log(
      col(`  ${seat.id}`, 13) +
        col(String(r.capture.length), 10) +
        col(a.avg.toFixed(2), 11) +
        col(b.avg.toFixed(2), 12) +
        col(re.avg.toFixed(1), 11) +
        col(pct(s.avg), 10) +
        (Number.isFinite(f) ? `${pct(f)} (${r.fires} fires)` : '—'),
    );
  }

  // ── What the discount is actually pricing ──
  //
  // Stated rather than thresholded. `HEADING_BOUND_DISCOUNT` cancels the acquire
  // bonus, so the question it answers is "how much of this shape is unavailable
  // to a policy", and that is what `1 − capture` bounds from above.
  const all = roster.flatMap((r) => r.capture);
  if (all.length > 0) {
    const s = spreadOf(all, { v: (x) => x }).v!;
    console.log('\n  ── Against the claim ──');
    console.log(
      `  Roster capture ${pct(s.avg)} of the achievable wedge ` +
        `[${pct(s.p5)}–${pct(s.p95)}], ${all.length} armed samples.`,
    );
    console.log(
      `  Ceiling on better aiming: ${pct(1 - s.avg)} more bodies per shot, before\n` +
        '  charging anything for the positioning a real turn costs.',
    );
  }
}

main();
