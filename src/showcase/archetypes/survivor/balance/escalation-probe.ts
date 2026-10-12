/**
 * Survivor — escalation probe: does any escalation curve let the roster reach the timer?
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/escalation-probe.ts`
 * Seeds: `SEEDS=8 …` (default 6). Roster instead of the baseline: `SWEEP_ALL=1`.
 *
 * `../IDENTITY.md` targets *three specialists each bound by a different cause,
 * with the baseline mostly reaching the timer*, and for a long time no run of any
 * batch ended on `timer` at all. Three suspects were eliminated by measurement —
 * a ladder derived ~20% steep, a movement policy that was not collecting, and
 * per-contact damage — and the deficit did not move for any of them. This is the
 * surface that found the one that binds.
 *
 * The answer is `m_d`, the spawn-density growth per minute, and it is the only
 * curve here that moves the target at all. It also moves the SCHEDULE deficit,
 * which is what makes it the unifying term rather than one tunable among several:
 * density is what collapses kills-per-spawn late in a run (`../BALANCING.md`
 * § Known thin, the density reading), so the same curve that ends runs early is
 * the one starving their income.
 *
 * **Why the tuning registry is the wrong path here, and the sweep is not.**
 * `../modules/tuning.ts` declares `threat/*` and `schedule/*` keys, but the
 * escalation constants are inputs to a SOLVE: `../data/schedule.ts`
 * `offensivePickGain` derives the per-pick DPS growth that holds time-to-kill
 * flat, from `m_hp` and `m_d` together. Perturbing one through `pushOverrides` moves
 * the floor without moving the growth solved to match it, which is the decoupled
 * tunable `../modules/tuning.ts` says it excludes solved quantities to avoid — the
 * run would get harder for a reason the design never chose, and the reading would
 * be about the decoupling. So this sweep assigns the authored constants and lets
 * every derivation downstream re-run: the pick gain (`../modules/sim/dispatch.ts`
 * `levelGain`, computed per call for exactly this), the XP ladder (derived at
 * install in `../modules/run.ts`), `hpMul`, `contactDamageMul`, `localDensity`.
 * That is a RETUNE at each point, which is the only thing worth measuring.
 *
 * It prints; it does not assert. The reading is the cause distribution, not the
 * clock — a run that survives thirty minutes but finishes three beats behind is
 * booked `collection-starvation` (`../modules/run.ts`), so "reaches the timer"
 * and "survives" are different claims with different repairs.
 */

import { categorySpreadOf, formatCategorySpread, spreadOf } from '@/balance';
import { SCHEDULE_BALANCE } from '../data/schedule';
import { THREAT_BALANCE } from '../data/arena';
import { BASELINE_SEAT, SEATS } from '../data/seats';
import { clock, col, runArc } from './_arc';

const SEED_COUNT = Number(process.env.SEEDS ?? 6);
/**
 * The baseline seat alone by default (`SWEEP_ALL=1` for the roster).
 *
 * The declared target names it specifically — *the baseline mostly reaching the
 * timer* — and an arc costs ~a minute, so spending the batch on seeds of the seat
 * the target is about beats spreading it thin across four. Confirm a winning
 * point on the roster afterwards; a sweep and a confirmation are different runs.
 */
const SWEPT = process.env.SWEEP_ALL === '1' ? SEATS : [BASELINE_SEAT];

/**
 * One point of the sweep. `null` keeps the shipping value, so the baseline row
 * is the shipping game rather than a re-statement of it.
 *
 * The two curves are swept together and separately because they are not
 * interchangeable: `../data/schedule.ts` § Balance records that HP and density
 * carry escalation while per-contact damage barely moves, and that reusing `m_hp`
 * for `m_dmg` killed every seat by ~15 minutes regardless of draft. A sweep that
 * only moved the pair would not be able to tell which one binds.
 */
interface Point {
  label: string;
  hpGrowth?: number;
  spawnGrowth?: number;
  contactDamageGrowth?: number;
}

const SHIPPED = {
  hpGrowth: SCHEDULE_BALANCE.hpGrowthPerMinute,
  spawnGrowth: THREAT_BALANCE.spawnGrowthPerMinute,
  contactDamageGrowth: SCHEDULE_BALANCE.contactDamageGrowthPerMinute,
};

/**
 * The sweep that settled `m_d`, kept runnable so the decision can be re-checked.
 *
 * `m_d` is now shipped at 1.048 (`../data/arena.ts` carries the receipt), so
 * these points BRACKET it: 1.080 is what it was, 1.037 is the point that meets
 * the declared target outright, and the `m_hp` row is the control that says the
 * sweep is still reading the same thing.
 *
 * What it found, baseline seat, six seeds a point: `m_d` 1.080 → 1.058 → 1.048 →
 * 1.037 gives 0% / 33% / 50% / 100% on the timer, monotone, with the schedule
 * deficit tracking it. `m_hp` 1.150 → 1.104 → 1.058 gives 0% / 0% / 0% and moves
 * the modal cause the WRONG way (`hp-floor` → `traversal-collapse`), because
 * `m_hp` is inside the `offensivePickGain` solve — a softer floor gives a slower
 * DPS curve and the operator clears less. Halving `m_dmg` does nothing at all.
 *
 * Re-run this after anything that moves the pilot: the whole curve is read
 * through it, and a policy that collects differently changes every row's cost.
 */
const POINTS: Point[] = [
  { label: 'shipped 1.048' },
  { label: 'm_d 1.080 (was)', spawnGrowth: 1.08 },
  { label: 'm_d 1.058', spawnGrowth: 1.058 },
  { label: 'm_d 1.037', spawnGrowth: 1.037 },
  { label: 'hp 1.104 (ctl)', hpGrowth: 1.104 },
];

function apply(p: Point): void {
  SCHEDULE_BALANCE.hpGrowthPerMinute = p.hpGrowth ?? SHIPPED.hpGrowth;
  THREAT_BALANCE.spawnGrowthPerMinute = p.spawnGrowth ?? SHIPPED.spawnGrowth;
  SCHEDULE_BALANCE.contactDamageGrowthPerMinute =
    p.contactDamageGrowth ?? SHIPPED.contactDamageGrowth;
}

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

async function main(): Promise<void> {
  console.log('Survivor — escalation probe (shipping module, headless, constants retuned)');
  console.log(
    `${POINTS.length} points x ${SWEPT.length} seat(s) x ${SEED_COUNT} seeds, ` +
      `30 sim-minutes each. Seats: ${SWEPT.map((s) => s.id).join(', ')}.\n`,
  );
  console.log(
    col('  point', 17) +
      col('m_hp', 8) +
      col('m_d', 8) +
      col('median end', 13) +
      col('timer', 8) +
      col('sched', 9) +
      col('level', 8) +
      'cause distribution',
  );

  for (const point of POINTS) {
    apply(point);
    const runs = [];
    for (const seat of SWEPT) {
      for (let i = 0; i < SEED_COUNT; i++) runs.push(await runArc(seat.id, 12345 + i * 7919));
    }
    const s = spreadOf(runs, {
      elapsed: (r) => r.elapsed,
      scheduleDelta: (r) => r.scheduleDelta,
      level: (r) => r.level,
    });
    const causes = categorySpreadOf(runs, (r) => r.bindingCause);
    const timerShare = (causes.counts['timer'] ?? 0) / runs.length;
    console.log(
      col(`  ${point.label}`, 17) +
        col(SCHEDULE_BALANCE.hpGrowthPerMinute.toFixed(3), 8) +
        col(THREAT_BALANCE.spawnGrowthPerMinute.toFixed(3), 8) +
        col(clock(s.elapsed!.median), 13) +
        col(pct(timerShare), 8) +
        col(s.scheduleDelta!.median.toFixed(0), 9) +
        col(s.level!.median.toFixed(0), 8) +
        formatCategorySpread(causes),
    );
  }
  apply({ label: 'restore' });

  console.log(
    '\n  Read the CAUSE, not the clock. `collection-starvation` at thirty minutes is a\n' +
      '  run that survived and fell behind; `hp-floor` is one that died. Only the first\n' +
      '  is an income problem, and only the second is what a softer curve repairs.',
  );
}

main();
