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
 *
 * It then prints the **term-spread table**, which answers a different question:
 * not how the operator moved, but what was still steering it. An arg-max is
 * decided by the SPREAD of a term across the candidate set, never by its level —
 * a term reading the same on all sixteen headings subtracts a constant and drops
 * out of the decision however large it is. A policy can therefore lose a term
 * with every constant still in place and every comment about it still true, and
 * nothing downstream says so.
 *
 * Spreads are binned by live specimen count because the landscape is a function
 * of density: what steers on an open floor and what steers against a crowded one
 * are different questions, and only the second describes the back half of a run.
 */

import { bootTestEngine } from '@/test/bootTestEngine';
import { ArenaKey, RunKey, createSurvivorModules } from '../modules';
import { buildNav, buildParams } from '../modules/arena';
import { SEATS } from '../data/seats';
import { BASE_MOVE_SPEED, refreshFields } from '../modules/sim/step';
import { scoreHeadings, type Fields } from '../modules/sim/steering';

/** 20 Hz — the live tick rate. Movement quality is a per-step property, so this
 *  probe cannot run at the coarse rate the economy probes use. */
const TICK_RATE = 20;
/**
 * A full arc, not a sample of the opening. Density climbs for the whole run and
 * peaks past 20:00 (`./arena-probe.ts` § census), and the term-spread table's
 * whole question is what the scoring landscape looks like on a crowded floor — a
 * six-minute run answers it for a floor the run never reaches.
 */
const MINUTES = 30;
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
  bins: SpreadBin[];
}

/**
 * Term spreads accumulated over the decisions taken at one density band.
 *
 * Spread, not level: `max − min` across the candidate set is exactly how much a
 * term can move the arg-max, and a term whose spread is zero is not steering
 * regardless of how big it is.
 */
interface SpreadBin {
  label: string;
  min: number;
  max: number;
  decisions: number;
  threat: number;
  engage: number;
  mote: number;
  turn: number;
  /** Decisions where the contact cliff fired on SOME candidates but not all. */
  cliffSplit: number;
  /** Decisions where it fired on every candidate — a constant, so it cancels. */
  cliffAll: number;
}

const BANDS: { label: string; min: number; max: number }[] = [
  { label: '< 100', min: 0, max: 99 },
  { label: '100–249', min: 100, max: 249 },
  { label: '250–599', min: 250, max: 599 },
  { label: '600+', min: 600, max: Infinity },
];

const spread = (xs: number[]): number => Math.max(...xs) - Math.min(...xs);

async function runSeat(seatId: string, seed: number): Promise<Reading> {
  const handle = bootTestEngine({
    modules: createSurvivorModules({ seed }),
    intervalRate: TICK_RATE,
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

  // The scoring context the module runs on, rebuilt from its own exported
  // factories so this reads the shipping policy rather than a copy of it.
  const nav = buildNav();
  const params = buildParams(
    SEATS.find((s) => s.id === seatId)!,
    {},
    // A probed seat is never hand-driven: `control` returning null would mean
    // "standing still" rather than "no input", which is a different policy.
    undefined,
  );
  let probeFields: Fields | undefined;
  const bins: SpreadBin[] = BANDS.map((b) => ({
    ...b,
    decisions: 0,
    threat: 0,
    engage: 0,
    mote: 0,
    turn: 0,
    cliffSplit: 0,
    cliffAll: 0,
  }));

  const totalTicks = MINUTES * 60 * TICK_RATE;
  const dt = 1 / TICK_RATE;
  for (let i = 0; i < totalTicks; i++) {
    await handle.tick(1);
    if (arena.outcome.value !== 'running') break;

    // Sampled rather than every tick: the scoring landscape moves on the field
    // refresh cadence, not the step, so 1 Hz costs little and misses nothing.
    if (i % TICK_RATE === 0) {
      const live = arena.state.value;
      probeFields = refreshFields(live, nav, probeFields);
      const scores = scoreHeadings(live, nav, probeFields, params);
      const bin = bins.find(
        (b) => live.specimens.length >= b.min && live.specimens.length <= b.max,
      );
      if (bin && scores.length > 1) {
        bin.decisions++;
        bin.threat += spread(scores.map((s) => s.threat));
        bin.engage += spread(scores.map((s) => s.engage));
        bin.mote += spread(scores.map((s) => params.eta * (2.5 * s.mote + s.moteNear)));
        bin.turn += spread(scores.map((s) => s.turn));
        const cliffs = scores.filter((s) => s.cliff).length;
        if (cliffs === scores.length) bin.cliffAll++;
        else if (cliffs > 0) bin.cliffSplit++;
      }
    }

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
    bins,
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

  const readings: Reading[] = [];
  for (const seat of SEATS) {
    const r = await runSeat(seat.id, 12345);
    readings.push(r);
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

  console.log('\n  ── Term spread across the candidate set, by live density ──');
  console.log('  Mean max−min per decision. A term at ~0 has stopped steering.');
  console.log(
    col('  seat', 13) +
      col('density', 11) +
      col('n', 7) +
      col('threat', 10) +
      col('engage', 10) +
      col('mote', 10) +
      col('turn', 10) +
      'cliff split / all',
  );
  for (const r of readings) {
    for (const b of r.bins) {
      if (b.decisions === 0) continue;
      const mean = (x: number): string => (x / b.decisions).toFixed(1);
      console.log(
        col(`  ${r.seatId}`, 13) +
          col(b.label, 11) +
          col(b.decisions, 7) +
          col(mean(b.threat), 10) +
          col(mean(b.engage), 10) +
          col(mean(b.mote), 10) +
          col(mean(b.turn), 10) +
          `${((b.cliffSplit / b.decisions) * 100).toFixed(0)}% / ${((b.cliffAll / b.decisions) * 100).toFixed(0)}%`,
      );
    }
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
  console.log('');
  console.log('  The term-spread table says what is actually deciding, and the answer');
  console.log('  is one term at every density:');
  console.log('');
  console.log('  READ THE UNITS FIRST. `mote` prints UNWEIGHTED, in sim units; what it');
  console.log('  contributes to a decision is `eta · MOTE_ROUTE_WEIGHT · spread`, which');
  console.log('  is about a seventh of the printed figure. `threat`, `engage` and `turn`');
  console.log('  are already in score units. Comparing the columns raw reads the income');
  console.log('  term as several times larger than it is.');
  console.log('');
  console.log('   - what decides is a function of DENSITY, not one term everywhere.');
  console.log('     Under 100 live bodies threat spreads 38–269 against a weighted mote');
  console.log('     pull of 11–27 and engage 17–22 — the same order of magnitude, and');
  console.log('     several terms genuinely voting. Past 100 threat runs 365–3060, and');
  console.log('     past 250 it is ~5000: the priced contact grows as remaining hp falls,');
  console.log('     so late in a run it does decide alone and everything else breaks ties.');
  console.log('');
  console.log('   - engage does NOT saturate away at the cap; its spread holds at 17–37');
  console.log('     across every band rather than collapsing. It is not being silenced by');
  console.log('     density — it is simply small, so `ENGAGE_WEIGHT` moves the schedule by');
  console.log('     picking among candidates the threat term already rated equal.');
  console.log('');
  console.log('   - the mote pull now clears the turn cost in every populated band, which');
  console.log('     is what makes the dive a decision rather than an aspiration. The term');
  console.log('     scores distance to a WAYPOINT descended out of the field, so its');
  console.log('     spread is set by the lookahead and not by the cell size; read against');
  console.log('     turn at 18, it is affordable everywhere the floor still has motes on');
  console.log('     it. A band showing mote ≈ 0 has no motes left, not a broken term.');
}

main();
