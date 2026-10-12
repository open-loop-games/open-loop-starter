/**
 * Survivor — lethality probe: is a behind seat a constant, or a feedback loop?
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/lethality-probe.ts`
 * Seeds: `SEEDS=16 …` (default 8).
 *
 * `../BALANCING.md` § Couplings records that realized engagement splits into
 * `reach` (movement, above the authored parameter on every seat) and `lethal` (kills over
 * bodies reached, varying 9.4× across the roster), and that `kinetic` and
 * `shielded` are authored at the SAME `dps` 0.9 yet reach median levels 10 and
 * 22. Three explanations fit that, and they want different repairs:
 *
 *  - **A constant.** One of `kinetic`'s other authored parameters makes it worse at killing
 *    from the first minute. Repair: change the seat.
 *  - **A feedback loop.** It starts level with the roster and falls away, because
 *    lethality feeds income, income feeds the ladder, the ladder feeds device
 *    level, and device level is the DPS that decides lethality. Repair: damp the
 *    loop, which is a systems change no seat constant reaches.
 *  - **Upgrade selection.** The seat's draft persona purchases a different loadout
 *    for the same run level, so the gap is what it CHOSE rather than what it is.
 *    Repair: the offer scoring in `../modules/draft.ts`.
 *
 * Three readings separate them, and none is available from an end-of-run total:
 *
 *  1. **Lethality by minute.** A constant is low from minute one. A loop starts
 *     near the roster and diverges. Cumulative ratios cannot show this — they are
 *     dominated by the early run — so `_arc.ts` samples per-minute deltas and
 *     this differences them.
 *  2. **Lethality by LEVEL, per seat.** The discriminator. If lethality is a
 *     function of level, every seat lies on one curve and the roster's spread is
 *     entirely "who got to which level" — the loop. A seat sitting below the
 *     common curve at the SAME level has a term the loop does not explain.
 *  3. **Loadout at that level.** Summed device levels and realized defensive
 *     share, which is what separates a seat that drafted differently from one
 *     that drafted the same and killed less.
 *
 * A probe prints; it does not assert. The verdict at the bottom is stated with
 * the numbers that produced it, not computed into a pass/fail.
 */

import { formatSpread, seedBatch, spreadOf } from '@/balance';
import { MINUTES, col, runArc, type ArcResult } from './_arc';
import { SEATS } from '../data/seats';

const SEED_COUNT = Number(process.env.SEEDS ?? 8);
const seeds = seedBatch(SEED_COUNT);

/**
 * Minutes with fewer arrivals than this are dropped from every ratio below.
 * A minute in which three bodies came into range yields a lethality of 0, 0.33
 * or 0.66 and nothing between, and pooling those with full minutes lets the tail
 * of a dying run dominate a curve that is supposed to describe the middle of it.
 */
const MIN_ARRIVALS = 20;

const num = (d: number) => (n: number) => n.toFixed(d);

/** Level bands wide enough that every seat contributes to several. */
const LEVEL_BINS = [
  { label: '1–5', min: 1, max: 5 },
  { label: '6–10', min: 6, max: 10 },
  { label: '11–15', min: 11, max: 15 },
  { label: '16–20', min: 16, max: 20 },
  { label: '21–25', min: 21, max: 25 },
  { label: '26+', min: 26, max: Infinity },
];

async function main(): Promise<void> {
  console.log('Survivor — lethality probe (shipping module, headless)');
  console.log(`${SEED_COUNT} seeds x ${SEATS.length} seats, ${MINUTES} sim-minutes each.\n`);

  const live = process.stdout.isTTY === true;
  const bySeat = new Map<string, ArcResult[]>();
  for (const seat of SEATS) {
    const runs: ArcResult[] = [];
    for (const seed of seeds) {
      runs.push(await runArc(seat.id, seed));
      if (live) process.stdout.write(`  ${seat.id} ${runs.length}/${SEED_COUNT}\r`);
    }
    if (live) process.stdout.write(`${' '.repeat(40)}\r`);
    else console.log(`  ran ${seat.id} x${SEED_COUNT}`);
    bySeat.set(seat.id, runs);
  }
  if (!live) console.log('');

  // ── Reading 1: does a behind seat start behind, or fall behind? ──
  const MARKS = [1, 3, 5, 8, 12, 16, 20, 25];
  console.log('  ── Lethality by minute (kills / bodies reached, that minute) ──');
  console.log(col('  seat', 13) + MARKS.map((m) => col(`m${m}`, 8)).join(''));
  for (const seat of SEATS) {
    const runs = bySeat.get(seat.id)!;
    const cells = MARKS.map((m) => {
      let kills = 0;
      let reached = 0;
      for (const r of runs) {
        const s = r.series.find((x) => x.minute === m);
        if (s) {
          kills += s.kills;
          reached += s.reached;
        }
      }
      return col(reached >= MIN_ARRIVALS ? (kills / reached).toFixed(2) : '—', 8);
    });
    console.log(col(`  ${seat.id}`, 13) + cells.join(''));
  }

  console.log('\n  ── Level by minute (median across seeds) ──');
  console.log(col('  seat', 13) + MARKS.map((m) => col(`m${m}`, 8)).join(''));
  for (const seat of SEATS) {
    const runs = bySeat.get(seat.id)!;
    const cells = MARKS.map((m) => {
      const levels = runs
        .map((r) => r.series.find((x) => x.minute === m)?.level)
        .filter((v): v is number => v !== undefined);
      if (levels.length === 0) return col('—', 8);
      const s = spreadOf(levels, { l: (v) => v });
      return col(s.l!.median.toFixed(0), 8);
    });
    console.log(col(`  ${seat.id}`, 13) + cells.join(''));
  }

  // ── Reading 2: the decisive one ──
  //
  // Every seat-minute in the batch, binned by the level it was played at. If the
  // seats agree inside a band, level is the state variable and the roster spread
  // is downstream of it.
  console.log('\n  ── Lethality by LEVEL, per seat (the discriminator) ──');
  console.log(
    col('  band', 10) + SEATS.map((s) => col(s.id, 13)).join('') + col('spread', 10) + 'minutes',
  );
  for (const bin of LEVEL_BINS) {
    const perSeat = SEATS.map((seat) => {
      let kills = 0;
      let reached = 0;
      let minutes = 0;
      for (const r of bySeat.get(seat.id)!) {
        for (const s of r.series) {
          if (s.level < bin.min || s.level > bin.max) continue;
          if (s.reached < MIN_ARRIVALS) continue;
          kills += s.kills;
          reached += s.reached;
          minutes++;
        }
      }
      return { seat, value: reached > 0 ? kills / reached : null, minutes };
    });
    const present = perSeat.filter((p) => p.value !== null).map((p) => p.value!);
    if (present.length === 0) continue;
    const ratio = Math.max(...present) / Math.max(1e-9, Math.min(...present));
    console.log(
      col(bin.label, 10) +
        perSeat.map((p) => col(p.value === null ? '—' : p.value.toFixed(2), 13)).join('') +
        col(present.length > 1 ? `${ratio.toFixed(1)}x` : '—', 10) +
        perSeat.reduce((n, p) => n + p.minutes, 0),
    );
  }

  // ── Is it what the seat DRAFTED at that level? ──
  //
  // The third explanation, and the one the two tables above cannot separate on
  // their own: a seat's draft persona (`defenseShare`, and the offer scoring
  // in `../modules/draft.ts`) could be picking a different loadout for the same
  // run level, in which case the lethality gap is upgrade selection and the
  // repair is the draft policy rather than the seat or the loop.
  //
  // `dev-lvl` is summed installed device levels — what the picks GAVE, against
  // a run level that says what the ladder GRANTED. `def%` is the realized
  // defensive share against the seat's declared `defenseShare`. If a behind seat
  // holds the same offensive mass at the same run level and still kills less,
  // selection is not the story.
  console.log('\n  ── Loadout at a given run level (selection, not outcome) ──');
  console.log(
    col('  band', 10) + SEATS.map((s) => col(s.id, 16)).join('') + '(dev-lvl · def% vs authored)',
  );
  for (const bin of LEVEL_BINS) {
    const cells = SEATS.map((seat) => {
      const devLevels: number[] = [];
      const defShares: number[] = [];
      for (const r of bySeat.get(seat.id)!) {
        for (const s of r.series) {
          if (s.level < bin.min || s.level > bin.max) continue;
          devLevels.push(s.deviceLevels);
          const picks = s.level;
          if (picks > 0) defShares.push(s.defensivePicks / picks);
        }
      }
      if (devLevels.length === 0) return col('—', 16);
      const dev = spreadOf(devLevels, { v: (x) => x }).v!.median;
      const def = defShares.length > 0 ? spreadOf(defShares, { v: (x) => x }).v!.median : 0;
      return col(`${dev.toFixed(0)} · ${(def * 100).toFixed(0)}%`, 16);
    });
    if (cells.every((c) => c.trim() === '—')) continue;
    console.log(col(bin.label, 10) + cells.join(''));
  }
  console.log(
    `  ${col('authored', 10)}${SEATS.map((s) => col(`${(s.defenseShare * 100).toFixed(0)}%`, 16)).join('')}`,
  );

  // ── The same question asked of density, so the answer is not a coincidence ──
  //
  // Lethality could track level because both track TIME — the floor gets denser
  // and DPS is divided among everything in range. Binning by live population
  // says whether level or crowding is the variable doing the work.
  console.log('\n  ── Lethality by LIVE POPULATION, per seat (the control) ──');
  const POP_BINS = [
    { label: '< 50', min: 0, max: 49 },
    { label: '50–99', min: 50, max: 99 },
    { label: '100–199', min: 100, max: 199 },
    { label: '200+', min: 200, max: Infinity },
  ];
  console.log(col('  band', 10) + SEATS.map((s) => col(s.id, 13)).join('') + 'spread');
  for (const bin of POP_BINS) {
    const perSeat = SEATS.map((seat) => {
      let kills = 0;
      let reached = 0;
      for (const r of bySeat.get(seat.id)!) {
        for (const s of r.series) {
          if (s.liveSpecimens < bin.min || s.liveSpecimens > bin.max) continue;
          if (s.reached < MIN_ARRIVALS) continue;
          kills += s.kills;
          reached += s.reached;
        }
      }
      return reached > 0 ? kills / reached : null;
    });
    const present = perSeat.filter((v): v is number => v !== null);
    if (present.length === 0) continue;
    // A ratio against a seat that killed essentially nothing is not a spread,
    // it is a division artifact — 0.38 over 0.00 printed as 382407407.4x here
    // and read as a number. Past the floor the honest statement is that one seat
    // has stopped killing.
    const lo = Math.min(...present);
    const spread =
      present.length < 2
        ? '—'
        : lo < 0.01
          ? 'floored'
          : `${(Math.max(...present) / lo).toFixed(1)}x`;
    console.log(
      col(bin.label, 10) +
        perSeat.map((v) => col(v === null ? '—' : v.toFixed(2), 13)).join('') +
        spread,
    );
  }

  // ── Where the damage GOES ──
  //
  // `kills / reached` says how many bodies died; it cannot say whether the ones
  // that lived were untouched or nearly dead. Those are different failures with
  // different repairs — a seat that never engages wants movement, a seat that
  // wounds the whole floor and finishes none of it wants its damage to STICK.
  //
  // `waste` is damage spent on bodies that walked away, over all damage that
  // resolved. Both `speed` and crowding predict it rises: a fast operator's
  // in-reach set churns before anything finishes, and `maxTargets` spreads each
  // activation over more bodies as the floor fills. If it is flat, the two
  // findings are unrelated and exit 3 gives nothing.
  console.log('\n  ── Where the damage went (waste = spent on bodies that left alive) ──');
  console.log(
    col('  seat', 13) +
      col('speed', 8) +
      col('waste', 9) +
      col('overkill', 10) +
      col('lethal', 9) +
      'bodies left wounded',
  );
  for (const seat of SEATS) {
    const runs = bySeat.get(seat.id)!;
    let converted = 0;
    let wasted = 0;
    let overkill = 0;
    let bodies = 0;
    let kills = 0;
    let reached = 0;
    for (const r of runs) {
      converted += r.damageConverted;
      wasted += r.damageWasted;
      overkill += r.damageOverkill;
      bodies += r.bodiesWasted;
      kills += r.kills;
      reached += r.reached;
    }
    const total = converted + wasted;
    // Overkill is quoted against the same denominator as waste so the two read
    // as competing destinations for one budget: targeting the closest to dying
    // trades one for the other, and only the pair says whether that was a win.
    console.log(
      col(`  ${seat.id}`, 13) +
        col(seat.speed.toFixed(2), 8) +
        col(total > 0 ? `${((wasted / total) * 100).toFixed(1)}%` : '—', 9) +
        col(total > 0 ? `${((overkill / total) * 100).toFixed(1)}%` : '—', 10) +
        col(reached > 0 ? (kills / reached).toFixed(2) : '—', 9) +
        (bodies / runs.length).toFixed(0),
    );
  }

  console.log('\n  ── Waste by LIVE POPULATION (does crowding spread the damage?) ──');
  console.log(col('  band', 10) + SEATS.map((s) => col(s.id, 13)).join('') + 'spread');
  for (const bin of POP_BINS) {
    const perSeat = SEATS.map((seat) => {
      let converted = 0;
      let wasted = 0;
      for (const r of bySeat.get(seat.id)!) {
        for (const s of r.series) {
          if (s.liveSpecimens < bin.min || s.liveSpecimens > bin.max) continue;
          converted += s.damageConverted;
          wasted += s.damageWasted;
        }
      }
      const total = converted + wasted;
      return total > 0 ? wasted / total : null;
    });
    const present = perSeat.filter((v): v is number => v !== null);
    if (present.length === 0) continue;
    console.log(
      col(bin.label, 10) +
        perSeat.map((v) => col(v === null ? '—' : `${(v * 100).toFixed(1)}%`, 13)).join('') +
        `${(Math.max(...present) - Math.min(...present)).toFixed(2)} abs`,
    );
  }

  // ── Where the seats separate ──
  //
  // The minute a seat's level curve leaves the roster's is the loop's entry
  // point if there is one, and it is what a damping fix would have to act before.
  console.log('\n  ── First minute each seat is 3+ levels below the roster median ──');
  for (const seat of SEATS) {
    const runs = bySeat.get(seat.id)!;
    let found = 0;
    for (let m = 1; m <= MINUTES; m++) {
      const all: number[] = [];
      for (const s of SEATS) {
        for (const r of bySeat.get(s.id)!) {
          const x = r.series.find((y) => y.minute === m);
          if (x) all.push(x.level);
        }
      }
      const mine = runs
        .map((r) => r.series.find((y) => y.minute === m)?.level)
        .filter((v): v is number => v !== undefined);
      if (all.length === 0 || mine.length === 0) continue;
      const rosterMedian = spreadOf(all, { l: (v) => v }).l!.median;
      const myMedian = spreadOf(mine, { l: (v) => v }).l!.median;
      if (rosterMedian - myMedian >= 3) {
        found = m;
        break;
      }
    }
    console.log(`  ${col(seat.id, 13)}${found > 0 ? `minute ${found}` : 'never'}`);
  }

  console.log('\n  ── Final level, for scale ──');
  for (const seat of SEATS) {
    const s = spreadOf(bySeat.get(seat.id)!, { level: (r) => r.level });
    console.log(`  ${col(seat.id, 13)}${formatSpread(s.level!, num(0))}`);
  }
}

main();
