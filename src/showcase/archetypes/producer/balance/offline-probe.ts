/**
 * Producer — offline probe: what an absence does to the arc.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/offline-probe.ts`
 *
 * The spine reads an absence as a time-base map (`../IDENTITY.md` § Offline is
 * a time-base map): catch-up replays the game, not the player. This probe checks
 * the two claims that statement rests on and measures the part it cannot
 * predict. It prints; it does not assert.
 *
 * § 1 — banked absence. With dispatch locked nothing spends, so the income
 *       over the absence is the frozen rate times the time away, piecewise at
 *       any revision that lands mid-absence. Closed form against the replay.
 * § 2 — an absence inside the arc. The same 8h arc under the shipping ladder,
 *       with and without an hour away, before and after dispatch opens. Beats
 *       the automation drives should hold in sim time; what moves is what the
 *       absent player did not do.
 * § 3 — catch-up cost. Wall-clock time to replay an absence at the 1s chunk —
 *       the measurement `OFFLINE_WINDOW_SECONDS` is derived from.
 */

import { Decimal, addResource } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import {
  DispatchKey,
  OfflineKey,
  createProducerModules,
  getClasses,
  getHeadlineRate,
  getMass,
  getRevisions,
} from '../modules';
import { DEFAULT_PRODUCER_DATA, OFFLINE_WINDOW_SECONDS } from '../data';
import { BEATS } from './beats';
import { hms, num, runArc } from './_engine';

const HOURS = 8;
const AWAY = 3600;
const col = (s: string | number, w: number): string => String(s).padEnd(w);
const pad = (s: string | number, w: number): string => String(s).padStart(w);

function bootOne(namespace: string) {
  const handle = bootTestEngine({
    modules: createProducerModules(DEFAULT_PRODUCER_DATA),
    intervalRate: 1,
    namespacePrefix: namespace,
  });
  const offline = handle.engine.tryInject(OfflineKey);
  const dispatch = handle.engine.tryInject(DispatchKey);
  if (!offline || !dispatch) throw new Error('offline probe: producer modules not provided');
  return { handle, offline, dispatch };
}

const revisionsEarned = (): number =>
  getRevisions()
    .getAll()
    .filter((e) => e.achievement.earned.value).length;

function bankedAbsence(): void {
  console.log('═══ § 1  Banked absence — dispatch locked, nothing spends ═══\n');
  console.log(
    `  ${col('fleet', 10)}${col('lifetime', 10)}${pad('rate/s', 10)}${pad('away', 10)}${pad('replayed', 13)}${pad('closed form', 13)}${pad('ratio', 9)}  splices`,
  );
  // Assigning mass counts toward lifetime, so the stake sets where the lifetime
  // revisions stand: `behind` puts every one of them behind the absence (one
  // band, R·t), `1e3 ahead` leaves the first one to land mid-absence (two bands,
  // R·t* + R·μ·(t − t*)).
  const stakes: [string, number][] = [
    ['behind', 1e12],
    ['1e3 ahead', 900],
  ];
  for (const [stakeLabel, stake] of stakes) {
    for (const count of [1, 10]) {
      for (const away of [600, AWAY, 6 * AWAY]) {
        const { handle, offline } = bootOne(`producer-offline-banked-${stake}-${count}-${away}`);
        getMass().value = new Decimal(stake);
        const seed = getClasses().getProducer('seed')!.repeatable!;
        for (let i = 0; i < count && seed.canPurchase.value; i++) seed.purchase(1);
        // Spend the bank to nothing so the reading is income, not the stake.
        getMass().value = new Decimal(0);
        const lifetimeBefore = num(getMass().cumulative!.value);
        const fleet = num(getClasses().getProducer('seed')!.ownedCount.value);
        const rate = num(getHeadlineRate());
        const revisionsBefore = revisionsEarned();
        const now = Date.now();
        const back = offline.catchUp(handle.engine.tickDriver, now - away * 1000, now);
        const t = back.caughtUpSeconds;
        const spliced = revisionsEarned() - revisionsBefore;
        const mu = num(getHeadlineRate()) / rate;
        const tSplice = spliced > 0 ? Math.min(t, (1e3 - lifetimeBefore) / rate) : t;
        const predicted = rate * tSplice + rate * mu * (t - tSplice);
        const gained = num(back.massGained);
        console.log(
          `  ${col(`${fleet} seed`, 10)}${col(stakeLabel, 10)}${pad(rate.toPrecision(4), 10)}${pad(hms(away), 10)}${pad(gained.toPrecision(6), 13)}${pad(predicted.toPrecision(6), 13)}${pad((gained / predicted).toFixed(4), 9)}  ${spliced === 0 ? 'none' : `+${spliced} (×${mu.toFixed(2)} at ${hms(tSplice)})`}`,
        );
        handle.dispose();
      }
    }
  }
  console.log(
    '\n  Ratio 1.0000 is the closed form holding: one band where no revision is in\n' +
      '  reach, a piecewise splice where one lands mid-absence. A ratio off 1 by\n' +
      '  less than a tick of income is the 1s chunk landing past the threshold.\n',
  );
}

async function absenceInArc(): Promise<void> {
  console.log(`═══ § 2  An hour away inside the ${HOURS}h arc ═══\n`);
  const seconds = HOURS * 3600;
  const live = await runArc({ seconds, namespace: 'producer-offline-live' });
  const dispatchAt = live.tierAt.get('assisted');
  const early = dispatchAt === undefined ? 600 : Math.floor(dispatchAt / 2);
  const late = dispatchAt === undefined ? undefined : dispatchAt + 600;

  const variants: [string, Awaited<ReturnType<typeof runArc>>][] = [['live', live]];
  variants.push([
    `away @${hms(early)}`,
    await runArc({
      seconds,
      namespace: 'producer-offline-early',
      absences: [{ at: early, seconds: AWAY }],
    }),
  ]);
  if (late !== undefined) {
    variants.push([
      `away @${hms(late)}`,
      await runArc({
        seconds,
        namespace: 'producer-offline-late',
        absences: [{ at: late, seconds: AWAY }],
      }),
    ]);
  }

  console.log(`  ${col('beat', 6)}${variants.map(([name]) => pad(name, 16)).join('')}`);
  for (const beat of BEATS) {
    const cells = variants.map(([, arc]) => {
      const t = arc.beatAt.get(beat.n);
      return pad(t === undefined ? 'NEVER' : hms(t), 16);
    });
    console.log(`  ${col(beat.n, 6)}${cells.join('')}`);
  }
  console.log('');
  const row = (label: string, read: (a: Awaited<ReturnType<typeof runArc>>) => string) =>
    console.log(`  ${col(label, 22)}${variants.map(([, a]) => pad(read(a), 16)).join('')}`);
  row('final headline rate', (a) => a.final.headlineRate.toPrecision(4));
  row('final fleet', (a) => String(a.final.fleetSize));
  row('refinements owned', (a) => String(a.final.refinementsOwned));
  row('revisions earned', (a) => String(a.final.revisionsEarned));
  row('hand-buys', (a) => String(a.handBuys));
  console.log(
    '\n  Beats are sim time, so an absence costs nothing on beats automation drives\n' +
      '  and delays the ones that wait on the player — a hand-buy, a refinement.\n',
  );
}

function catchUpCost(): void {
  console.log('═══ § 3  Catch-up cost — wall-clock time to replay an absence ═══\n');
  for (const away of [AWAY, OFFLINE_WINDOW_SECONDS, 72 * AWAY]) {
    const { handle, offline, dispatch } = bootOne(`producer-offline-cost-${away}`);
    addResource(getMass(), 1e12);
    const seed = getClasses().getProducer('seed')!.repeatable!;
    for (let i = 0; i < 30; i++) seed.purchase(1);
    dispatch.isActive.value = true;
    const now = Date.now();
    const started = performance.now();
    const back = offline.catchUp(handle.engine.tickDriver, now - away * 1000, now);
    const ms = performance.now() - started;
    console.log(
      `  away ${pad(hms(away), 9)}  replayed ${pad(hms(back.caughtUpSeconds), 9)}  in ${pad(ms.toFixed(0), 6)} ms`,
    );
    handle.dispose();
  }
  console.log(
    `\n  The window is OFFLINE_WINDOW_SECONDS (${hms(OFFLINE_WINDOW_SECONDS)}); an absence past it replays\n` +
      '  the window. Catch-up blocks the load, so the window row is the longest a\n' +
      '  returning player waits — the wait budget the window is derived from.\n',
  );
}

async function main(): Promise<void> {
  console.log('Producer — offline probe (real engine, shipping modules)\n');
  bankedAbsence();
  await absenceInArc();
  catchUpCost();
}

void main();
