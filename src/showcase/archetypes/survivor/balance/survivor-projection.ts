/**
 * Survivor — closed-form balance projection (no engine).
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/survivor-projection.ts`
 *
 * Pure math, NO engine (`.claude/rules/archetype-authoring.md` § Balance — where
 * each surface lands). The spine in runnable form: it predicts the run's shape on
 * paper so the coverage boundary in `../IDENTITY.md` § Rate-function spine can be
 * falsified before it is built on. Predicts; does not discover.
 *
 * Bucket: geometric discrete on minute marks over a modifier-product chain. Both
 * sides compound — device DPS through the draft, specimen HP and annulus density
 * through the escalation schedule — so the closed core is a crossing between two
 * geometric curves. Per-subsystem buckets and receipts:
 * `open-loop-research/methodology/techniques/closed-form-progression/per-archetype/survivor.md`.
 *
 * Every constant lives in `../data/`; the derivations (`beatTime`,
 * `offensivePickGain`, `deriveXpLadder`, the income model) live there too, so the
 * ladder this projects and the ladder the game runs are produced by the same
 * functions rather than by two agreeing implementations.
 */

import {
  ARENA_BALANCE,
  COLLECTOR_BALANCE,
  THREAT_BALANCE,
  contactChance,
  localDensity,
  spawnRate,
} from '../data/arena';
import {
  cumulativeIncome,
  cumulativeIncomeAmortized,
  cumulativeIncomeWithCollectors,
} from '../data/income';
import {
  SCHEDULE_BALANCE,
  beatTime,
  contactDamageMul,
  deriveXpLadder,
  hpMul,
  offensivePickGain,
  scheduledBeatsBy,
} from '../data/schedule';
import { BASELINE_SEAT, SEATS, type SeatDef } from '../data/seats';
import { DEVICES, EVOLUTIONS, draftPoolSize, nominalDps, startingDevice } from '../data/devices';
import { BASE_SPECIMEN_HP, activeSpecimens, meanHpFactor, meanMoteYield } from '../data/specimens';
import { META_UPGRADES, maxRunBaseline, notesForRun, totalCost, upgradeCost } from '../data/meta';

const { runSeconds: RUN_SECONDS, beatCount: BEAT_COUNT } = SCHEDULE_BALANCE;

/** How much the roster's mean HP factor rises across the run — a required-DPS term. */
const MIX_HP_GROWTH = meanHpFactor(RUN_SECONDS) / meanHpFactor(0);
const PICK_GAIN = offensivePickGain(
  BASELINE_SEAT.defenseShare,
  THREAT_BALANCE.spawnGrowthPerMinute,
  MIX_HP_GROWTH,
);
const DT = 0.5;

// ─── Survival side of the crossing ───

/** Damage per second taken at `t`, after armour and per-contact escalation. */
const damageTakenRate = (t: number, seat: SeatDef): number =>
  (contactChance(t, seat.engage, seat.dps, seat.speed) *
    THREAT_BALANCE.contactDps *
    contactDamageMul(t)) /
  seat.toughness;

/** Effective-HP pool after `beats` picks, of which `defenseShare` went defensive. */
const effectiveHp = (seat: SeatDef, beats: number): number =>
  THREAT_BALANCE.baseHp *
  seat.toughness *
  Math.pow(SCHEDULE_BALANCE.hpPickGain, beats * seat.defenseShare);

/**
 * First time cumulative damage exceeds the pool, or Infinity if the seat lasts
 * the arc. The pool grows as beats land, so this integrates against a moving
 * ceiling — which is what makes the run a race rather than a countdown.
 */
function deathTime(seat: SeatDef, landings: number[]): number {
  let taken = 0;
  for (let t = 0; t <= RUN_SECONDS; t += DT) {
    taken += damageTakenRate(t, seat) * DT;
    const beats = landings.filter((b) => b <= t).length;
    if (taken >= effectiveHp(seat, beats)) return t;
  }
  return Number.POSITIVE_INFINITY;
}

/** Walk a ladder against a seat's income and report when each beat fires. */
function beatLandings(ladder: number[], seat: SeatDef, withCollectors: boolean): number[] {
  const landings: number[] = [];
  let need = ladder[0];
  let idx = 0;
  for (let t = 0; t <= RUN_SECONDS && idx < ladder.length; t += DT) {
    const acc = withCollectors
      ? cumulativeIncomeWithCollectors(t, seat)
      : cumulativeIncome(t, seat);
    while (idx < ladder.length && acc >= need) {
      landings.push(t);
      idx++;
      if (idx < ladder.length) need += ladder[idx];
    }
  }
  while (landings.length < ladder.length) landings.push(Number.POSITIVE_INFINITY);
  return landings;
}

/** The shipping ladder: derived against the baseline seat's HONEST income. */
const LADDER = deriveXpLadder((t) => cumulativeIncomeAmortized(t, BASELINE_SEAT, RUN_SECONDS));

// ─── Report ───

const col = (s: string | number, w: number): string => String(s).padEnd(w);
const fmt = (n: number): string => (Number.isFinite(n) ? n.toFixed(1) : '—');
const clock = (t: number): string => {
  if (!Number.isFinite(t)) return '—';
  const total = Math.round(t);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

function reportSchedule(): void {
  console.log('\n═══ Draft schedule — geometric intervals, 30s → 90s ═══');
  console.log(col('  beat', 8) + col('interval', 11) + col('t', 10) + col('HP ×', 9) + 'XP req');
  for (const n of [1, 5, 10, 15, 20, 25, 30, BEAT_COUNT]) {
    const t = beatTime(n);
    const interval =
      SCHEDULE_BALANCE.beatFirstSeconds * Math.pow(SCHEDULE_BALANCE.beatRatio, n - 1);
    console.log(
      col(`  ${n}`, 8) +
        col(fmt(interval), 11) +
        col(clock(t), 10) +
        col(hpMul(t).toFixed(1), 9) +
        LADDER[n - 1].toFixed(1),
    );
  }
  console.log(
    `\n  ${BEAT_COUNT} beats span ${fmt(beatTime(BEAT_COUNT))}s (target ${RUN_SECONDS}s).` +
      `  Beat count is a consequence of the 30–90s band, not a knob.`,
  );
  console.log(
    `  Per-offensive-pick DPS gain for FLAT time-to-kill at baseline σ=` +
      `${BASELINE_SEAT.defenseShare}: ${PICK_GAIN.toFixed(4)}×  (solved, not authored —` +
      ` covers m_hp · m_d and the roster's ${MIX_HP_GROWTH.toFixed(2)}× mix shift)`,
  );
}

function reportArena(): void {
  const { killRadius, collectRadius, mapWidth, mapHeight } = ARENA_BALANCE;
  console.log('\n═══ Arena — the price of income, and the entity budget ═══');
  console.log(
    `  r_collect / r_kill = ${collectRadius}/${killRadius} = ` +
      `${(collectRadius / killRadius).toFixed(2)}  — the risk premium on every mote.`,
  );
  console.log(
    `  map ${mapWidth}×${mapHeight}, crossing ~${Math.round(mapWidth / 120)}s at 120 u/s.`,
  );
  console.log('\n' + col('  t', 8) + col('spawn/s', 11) + col('live', 8) + 'contact %');
  for (const m of [0, 5, 10, 20, 30]) {
    const t = m * 60;
    const s = BASELINE_SEAT;
    console.log(
      col(`  ${m}:00`, 8) +
        col(spawnRate(t).toFixed(2), 11) +
        col(Math.round(localDensity(t, s.engage, s.dps)).toString(), 8) +
        (contactChance(t, s.engage, s.dps, s.speed) * 100).toFixed(1),
    );
  }
  console.log(
    `\n  Live is bounded by the annulus early, then by the ${THREAT_BALANCE.entityBudget}-entity ` +
      `budget once spawn rate outruns it (measured ~12:00+, see arena-probe.ts census). ` +
      `\`localDensity\` clamps to the same ceiling so this table agrees with the sim past that point.`,
  );
}

function reportContent(): void {
  console.log('\n═══ Content model — sized by the spine, not chosen ═══');
  const pool = draftPoolSize();
  console.log(
    `  draft pool ${pool} picks vs a ${BEAT_COUNT}-pick budget — a run sees ` +
      `${((BEAT_COUNT / pool) * 100).toFixed(0)}%.`,
  );
  console.log(
    `  evolutions: ${EVOLUTIONS.length} defined, ~12 picks each → ` +
      `${Math.floor(BEAT_COUNT / 12)}–${Math.ceil(BEAT_COUNT / 12)} completed per run.`,
  );

  const opener = startingDevice();
  const requiredDps0 = spawnRate(0) * BASELINE_SEAT.engage * BASE_SPECIMEN_HP * meanHpFactor(0);
  const got = nominalDps(opener);
  console.log(
    `\n  Opening DPS — flat-TTK wants ${requiredDps0.toFixed(2)}, ` +
      `${opener.name} delivers ${got.toFixed(2)} ` +
      `(${(((got - requiredDps0) / requiredDps0) * 100).toFixed(1)}%).`,
  );

  console.log('\n' + col('  t', 8) + col('tiers', 8) + col('mote yield', 13) + 'mean HP ×');
  for (const m of [0, 5, 10, 20, 30]) {
    const t = m * 60;
    console.log(
      col(`  ${m}:00`, 8) +
        col(activeSpecimens(t).length.toString(), 8) +
        col(meanMoteYield(t).toFixed(2), 13) +
        meanHpFactor(t).toFixed(2),
    );
  }
  console.log('\n  Mean yield is an income term, not flavour — `income.ts` multiplies');
  console.log('  by it, so the tier mix moves the economy as well as the pressure.');

  console.log(
    '\n' + col('  device', 18) + col('cd', 8) + col('nominal dps', 14) + 'scales w/ density',
  );
  for (const d of DEVICES) {
    console.log(
      col(`  ${d.name}`, 18) +
        col(`${d.cooldownSec}s`, 8) +
        col(nominalDps(d).toFixed(2), 14) +
        (d.maxTargets > 1 ? `yes (≤${d.maxTargets})` : 'no'),
    );
  }
  console.log('\n  Nominal order is deliberately the reverse of the late-run order:');
  console.log('  density climbs ~10× across a run, so the area shapes overtake.');
}

function reportMeta(): void {
  console.log('\n═══ Cross-run meta — runs to buy, and the declared front-load ═══');

  // Kills a baseline run banks before it ends, at its own income.
  const landings = beatLandings(LADDER, BASELINE_SEAT, true);
  const end = Math.min(deathTime(BASELINE_SEAT, landings), RUN_SECONDS);
  let kills = 0;
  for (let t = 0; t < end; t += DT) kills += spawnRate(t) * BASELINE_SEAT.engage * DT;
  const notes = notesForRun(kills, meanMoteYield(end / 2));
  console.log(
    `  A baseline run ends at ${clock(end)}, ~${Math.round(kills)} kills, ` +
      `~${Math.round(notes)} notes.`,
  );

  console.log(
    '\n' + col('  upgrade', 22) + col('side', 11) + col('lv1', 8) + col('max', 8) + 'runs to max',
  );
  for (const u of META_UPGRADES) {
    console.log(
      col(`  ${u.name}`, 22) +
        col(u.side, 11) +
        col(upgradeCost(u, 0).toString(), 8) +
        col(`${u.maxLevel}`, 8) +
        (totalCost(u) / notes).toFixed(1),
    );
  }
  const allRuns = META_UPGRADES.reduce((s, u) => s + totalCost(u), 0) / notes;
  console.log(`\n  Whole shop: ~${allRuns.toFixed(0)} runs of banked notes.`);

  const incomeBaseline = maxRunBaseline('income');
  const survivalBaseline = maxRunBaseline('survival');
  console.log(
    `\n  runBaseline at full investment — survival ×${survivalBaseline.toFixed(2)}` +
      ` (ladder-safe), income ×${incomeBaseline.toFixed(2)} (shifts the ladder).`,
  );

  // The declared bound: how early beats land for a fully-metaed income build.
  // Income is linear in both η and mote yield, and the meta moves one of each, so
  // scaling the ladder down by the combined multiplier is exactly equivalent to
  // scaling income up — and avoids pushing η past 1, which it cannot exceed.
  const juicedLandings = beatLandings(
    LADDER.map((x) => x / incomeBaseline),
    BASELINE_SEAT,
    true,
  );
  const last = juicedLandings[BEAT_COUNT - 1];
  console.log(
    `  Fully-metaed income run reaches beat ${BEAT_COUNT} at ${clock(last)} vs ` +
      `${clock(beatTime(BEAT_COUNT))} — ${fmt(beatTime(BEAT_COUNT) - last)}s earlier.`,
  );
  console.log('  Bounded and intended: the ladder is derived for a ZERO-meta run, and');
  console.log('  the arc is capped by maxLevel. Unlike the collector case, this front-');
  console.log('  loading is declared — but an added income-side tile moves this number.');
}

function reportDerivationCheck(): void {
  const naive = deriveXpLadder((t) => cumulativeIncome(t, BASELINE_SEAT));
  const landings = beatLandings(naive, BASELINE_SEAT, true);

  console.log('\n═══ Derivation check — why collectors belong IN the ladder ═══');
  console.log('  A ladder derived on SMOOTH income, walked against honest income:');
  console.log('\n' + col('  beat', 8) + col('scheduled', 12) + col('actual', 10) + 'drift');
  let worst = 0;
  for (let n = 1; n <= BEAT_COUNT; n++) {
    const drift = landings[n - 1] - beatTime(n);
    if (Math.abs(drift) > Math.abs(worst)) worst = drift;
    if ([10, 11, 20, 25, 30, BEAT_COUNT].includes(n)) {
      console.log(
        col(`  ${n}`, 8) +
          col(clock(beatTime(n)), 12) +
          col(clock(landings[n - 1]), 10) +
          `${drift > 0 ? '+' : ''}${fmt(drift)}s`,
      );
    }
  }
  const smooth = cumulativeIncome(RUN_SECONDS, BASELINE_SEAT);
  const honest = cumulativeIncomeWithCollectors(RUN_SECONDS, BASELINE_SEAT);
  console.log(
    `\n  Collectors are ${(((honest - smooth) / honest) * 100).toFixed(1)}% of run income` +
      ` in ${COLLECTOR_BALANCE.perRun} bursts. Worst drift ${fmt(worst)}s, monotone.`,
  );

  const shipped = beatLandings(LADDER, BASELINE_SEAT, true);
  let worstShipped = 0;
  for (let n = 1; n <= BEAT_COUNT; n++) {
    const drift = shipped[n - 1] - beatTime(n);
    if (Math.abs(drift) > Math.abs(worstShipped)) worstShipped = drift;
  }
  console.log(
    `  The shipping ladder (derived on AMORTIZED income): worst deviation ` +
      `${fmt(worstShipped)}s, and it oscillates rather than accumulating — a seat` +
      ` runs\n  slightly behind before the first collector and slightly ahead after` +
      ` one. Bounded\n  jitter around the schedule is the honest price of impulsive` +
      ` income; monotone\n  drift is a broken derivation.`,
  );
}

function reportSeats(): void {
  console.log('\n═══ Seat spread — shipping ladder, each seat’s own run ═══');
  console.log(
    col('  seat', 13) +
      col('income', 9) +
      col('σ', 7) +
      col('ends', 8) +
      col('beats', 9) +
      'predicted bind',
  );
  for (const seat of SEATS) {
    const landings = beatLandings(LADDER, seat, true);
    const death = deathTime(seat, landings);
    const end = Math.min(death, RUN_SECONDS);
    const reached = landings.filter((t) => Number.isFinite(t) && t <= end).length;
    const behind = reached < scheduledBeatsBy(end) - 3;
    const bind = Number.isFinite(death)
      ? contactChance(death, seat.engage, seat.dps, seat.speed) > 0.6
        ? 'traversal collapse'
        : 'HP floor'
      : behind
        ? 'collection starvation'
        : 'timer';
    console.log(
      col(`  ${seat.id}`, 13) +
        col((seat.engage * seat.eta).toFixed(3), 9) +
        col(seat.defenseShare.toFixed(2), 7) +
        col(clock(end), 8) +
        col(`${reached}/${BEAT_COUNT}`, 9) +
        bind,
    );
  }
  console.log('\n  READING, as authored: the seats do not yet bind on different causes.');
  console.log('  Guns-versus-butter is unbalanced — DPS reaches survival only through');
  console.log('  the squared density term while σ divides damage directly. That');
  console.log('  conversion rate is a MEASUREMENT; the probe against shipping code');
  console.log('  takes it. Recorded in `../BALANCING.md` § Known thin — not tuned here.');
}

function main(): void {
  console.log('Survivor — closed-form balance projection');
  console.log('Bucket: geometric discrete on minute marks over a modifier-product chain.');
  reportSchedule();
  reportArena();
  reportContent();
  reportMeta();
  reportDerivationCheck();
  reportSeats();
  console.log('\n═══ Coverage boundary ═══');
  console.log('  Closed: draft schedule, ladder derivation, HP/density escalation,');
  console.log('          flat-TTK pick gain, collector impulses, entity budget,');
  console.log('          the survival crossing against a draft-grown HP pool.');
  console.log('  Open:   draft offers are a weighted pick (DPS is a distribution);');
  console.log('          η is a policy output, assumed here, never predicted.');
  console.log('  Measured by: seeded multi-run probes — median survival, η split');
  console.log('          continuous/collector, binding-cause distribution per seat.\n');
}

main();
