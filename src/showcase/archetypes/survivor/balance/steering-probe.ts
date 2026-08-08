/**
 * Survivor — steering probe: is the operator's path something a hand could have
 * drawn, or is it a jitterbug?
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/steering-probe.ts`
 *
 * Drives the REAL assembled engine per `.claude/rules/archetype-authoring.md`
 * § Balance, and prints; it never asserts.
 *
 * The arena's movement policy is an arg-max over a candidate heading set, and an
 * arg-max has no memory — a score that crosses over between two candidates flips
 * the heading with no cost, every step, for as long as the crossing lasts. On
 * screen that reads as a vibrating operator rather than a piloted one, and no
 * balance reading shows it: the seat still engages, still banks, still dies on
 * schedule while shaking.
 *
 * So this measures the PATH rather than the economy. Four readings:
 *
 *  - **turn/s** — mean absolute heading change per sim second, in degrees. The
 *    headline. A piloted operator holds a heading for a beat and turns when the
 *    field changes; a jittering one spends its whole turn budget standing still.
 *  - **reversals/s** — heading changes past 120°, which is the shape the eye
 *    actually catches. Near-zero is the target; anything above ~1 is visible.
 *  - **straightness** — net displacement over path length, per 5-second window.
 *    1.0 is a straight line, 0 is a run that ends where it started. An orbiting
 *    policy should sit mid-range; a jittering one collapses toward 0 while
 *    burning the same distance.
 *  - **speed** — mean sim units/s actually covered, against the nominal move
 *    speed. The gap is the cost of the jitter: distance walked that goes nowhere.
 */

import { bootTestEngine } from '@/test/bootTestEngine';
import { ArenaKey, RunKey, createSurvivorModules } from '../modules';
import { SEATS } from '../data/seats';
import { BASE_MOVE_SPEED } from '../modules/sim/step';

/** 20 Hz — the live tick rate. Movement quality is a per-step property, so this
 *  probe cannot run at the coarse rate the economy probes use. */
const TICK_RATE = 20;
const MINUTES = 6;
/** Straightness is measured over windows this long, in sim seconds. */
const WINDOW_SECONDS = 5;

const col = (s: string | number, w: number): string => String(s).padEnd(w);

interface Reading {
  seatId: string;
  turnPerSecond: number;
  reversalsPerSecond: number;
  straightness: number;
  speed: number;
  samples: number;
}

async function runSeat(seatId: string, seed: number): Promise<Reading> {
  const handle = bootTestEngine({
    modules: createSurvivorModules({ seed }),
    tickRate: TICK_RATE,
    namespacePrefix: `survivor-steer-${seatId}-${seed}`,
  });
  const arena = handle.engine.tryInject(ArenaKey);
  const run = handle.engine.tryInject(RunKey);
  if (!arena || !run) throw new Error('steering-probe: survivor modules did not provide');

  run.startRun(seatId);

  let prevHeading = { ...arena.state.value.operator.heading };
  let prev = { x: arena.state.value.operator.x, y: arena.state.value.operator.y };
  let turnSum = 0;
  let reversals = 0;
  let pathLength = 0;
  let samples = 0;

  // Straightness accumulates per window: net displacement / path walked.
  let windowStart = { ...prev };
  let windowPath = 0;
  let windowElapsed = 0;
  const straightness: number[] = [];

  const totalTicks = MINUTES * 60 * TICK_RATE;
  const dt = 1 / TICK_RATE;
  for (let i = 0; i < totalTicks; i++) {
    await handle.tick(1);
    if (arena.outcome.value !== 'running') break;

    const op = arena.state.value.operator;
    const dot = Math.max(
      -1,
      Math.min(1, prevHeading.x * op.heading.x + prevHeading.y * op.heading.y),
    );
    const turn = Math.acos(dot);
    turnSum += turn;
    if (turn > (120 * Math.PI) / 180) reversals++;
    prevHeading = { ...op.heading };

    const step = Math.hypot(op.x - prev.x, op.y - prev.y);
    pathLength += step;
    windowPath += step;
    prev = { x: op.x, y: op.y };
    samples++;

    windowElapsed += dt;
    if (windowElapsed >= WINDOW_SECONDS) {
      const net = Math.hypot(prev.x - windowStart.x, prev.y - windowStart.y);
      if (windowPath > 0) straightness.push(net / windowPath);
      windowStart = { ...prev };
      windowPath = 0;
      windowElapsed = 0;
    }
  }

  const seconds = samples * dt;
  handle.dispose();

  return {
    seatId,
    turnPerSecond: (turnSum / Math.max(1e-6, seconds)) * (180 / Math.PI),
    reversalsPerSecond: reversals / Math.max(1e-6, seconds),
    straightness: straightness.length
      ? straightness.reduce((a, b) => a + b, 0) / straightness.length
      : 0,
    speed: pathLength / Math.max(1e-6, seconds),
    samples,
  };
}

async function main(): Promise<void> {
  console.log('Survivor — steering probe (shipping module, headless)');
  console.log(`${MINUTES} sim-minutes per seat at ${TICK_RATE} Hz.\n`);

  console.log(
    col('  seat', 13) +
      col('turn °/s', 11) +
      col('rev/s', 9) +
      col('straight', 11) +
      col('units/s', 10) +
      'nominal',
  );

  for (const seat of SEATS) {
    const r = await runSeat(seat.id, 12345);
    const nominal = BASE_MOVE_SPEED * seat.speed;
    console.log(
      col(`  ${r.seatId}`, 13) +
        col(r.turnPerSecond.toFixed(0), 11) +
        col(r.reversalsPerSecond.toFixed(2), 9) +
        col(r.straightness.toFixed(2), 11) +
        col(r.speed.toFixed(0), 10) +
        nominal.toFixed(0),
    );
  }

  console.log('\n  ── Reading ──');
  console.log('  turn °/s is the headline. The operator has a real reason to turn a');
  console.log('  few times a second — the annulus re-forms, a mote drops behind it —');
  console.log('  so this is not minimised, it is BOUNDED. Above the slew limit means');
  console.log('  the policy is fighting itself; at the limit for long stretches means');
  console.log('  the limit is too tight and the operator cannot dodge.');
  console.log('');
  console.log('  rev/s should sit near zero. A reversal past 120° is the shape the');
  console.log('  eye catches, and the policy has no legitimate reason to reverse at');
  console.log('  every step — a real reversal is a decision that lasts a beat.');
  console.log('');
  console.log('  units/s against nominal is the cost of the jitter in the currency');
  console.log('  the economy cares about: distance walked that went nowhere is');
  console.log('  motes not collected, which lands straight on η.');
}

main();
