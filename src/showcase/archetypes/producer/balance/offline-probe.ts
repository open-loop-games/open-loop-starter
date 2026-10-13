/**
 * Producer: offline probe. What time away does to the arc, and what a return costs
 * to replay. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/offline-probe.ts`
 *
 * § 1 — accumulation. With every desk off duty nothing spends, so the cash made
 *       over the time away is the frozen income rate times its length, unless a
 *       grade lands inside it. Closed form against the replay.
 * § 2 — time away inside the arc. The shipping arc with the bookkeeper hired, with
 *       and without time away. Beats the desks drive hold in sim-time; what moves
 *       is what the hand, away, did not do. The first row is the arc that never
 *       hires the bookkeeper, so the hire's own cost shows.
 * § 3 — replay cost. Wall-clock milliseconds to replay one second away, mid-arc
 *       with every desk working: the measurement `OFFLINE_REPLAY_COST` records.
 */

import { OFFLINE_REPLAY_COST, OFFLINE_WINDOW_SECONDS, type HireId } from '../data';
import { fmt, runArc, type ArcResult } from './_engine';

const ARC = 30 * 60;

async function hireAndPause(at: number): Promise<ArcResult> {
  const run = await runArc({
    seconds: at,
    hireBookkeeper: true,
    persistenceNamespacePrefix: `offline-${at}`,
  });
  if (!run.offline.bookkeeper.active.value)
    throw new Error(`offline probe: no bookkeeper by ${fmt(at)}`);
  return run;
}

async function accumulation(): Promise<void> {
  console.log('═══ § 1  Accumulation: every desk off duty, nothing spends ═══\n');
  const run = await hireAndPause(12 * 60);
  for (const id of Object.keys(run.automation.deskOn) as HireId[])
    run.automation.deskOn[id].value = false;
  for (const away of [60, 600]) {
    const rate = run.firm.incomeRate.value.toNumber();
    const back = run.offline.catchUp(run.tickDriver, Date.now() - away * 1000);
    const predicted = rate * back.caughtUpSeconds;
    console.log(
      `  ${fmt(away).padStart(7)} away: replayed ${fmt(back.caughtUpSeconds)}, made $${back.cashGained.toExponential(3)}, closed form $${predicted.toExponential(3)} (${((100 * back.cashGained.toNumber()) / predicted).toFixed(2)}%)`,
    );
  }
  run.dispose();
}

async function awayInsideArc(): Promise<void> {
  console.log('\n═══ § 2  Time away inside the arc ═══\n');
  const rows: { name: string; options: Parameters<typeof runArc>[0] }[] = [
    { name: 'never hires it', options: { seconds: ARC } },
    { name: 'hired, never away', options: { seconds: ARC, hireBookkeeper: true } },
    {
      name: '5 min away at 13m',
      options: {
        seconds: ARC,
        hireBookkeeper: true,
        offlinePeriods: [{ at: 13 * 60, seconds: 5 * 60 }],
      },
    },
  ];
  console.log(
    `  ${'run'.padEnd(20)} ${'t5'.padStart(7)} ${'t6'.padStart(7)} ${'t7'.padStart(7)}  income at ${fmt(ARC)}`,
  );
  for (const row of rows) {
    const run = await runArc({ ...row.options, persistenceNamespacePrefix: `offline-${row.name}` });
    const at = (tier: number) =>
      run.beats.find((b) => b.key === `open:${run.firm.subsidiaries.getAll()[tier].def.id}`)?.t ??
      Infinity;
    console.log(
      `  ${row.name.padEnd(20)} ${fmt(at(5)).padStart(7)} ${fmt(at(6)).padStart(7)} ${fmt(at(7)).padStart(7)}  $${run.firm.incomeRate.value.toExponential(3)}/s`,
    );
    run.dispose();
  }
}

async function replayCost(): Promise<void> {
  console.log('\n═══ § 3  Replay cost: every desk working, mid-arc ═══\n');
  const run = await hireAndPause(15 * 60);
  const away = 600;
  const start = performance.now();
  const back = run.offline.catchUp(run.tickDriver, Date.now() - away * 1000);
  const ms = performance.now() - start;
  const perSecond = ms / back.caughtUpSeconds;
  console.log(
    `  replayed ${fmt(back.caughtUpSeconds)} in ${ms.toFixed(0)} ms: ${perSecond.toFixed(3)} ms per second away (recorded ${(OFFLINE_REPLAY_COST * 1000).toFixed(3)})`,
  );
  console.log(
    `  the window, ${fmt(OFFLINE_WINDOW_SECONDS)}, replays in ${((perSecond * OFFLINE_WINDOW_SECONDS) / 1000).toFixed(1)} s`,
  );
  run.dispose();
}

await accumulation();
await awayInsideArc();
await replayCost();
