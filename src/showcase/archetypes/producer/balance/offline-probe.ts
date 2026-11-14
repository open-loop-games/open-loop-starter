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
 *       and without time away. The desks work through the replay; the player does
 *       not, so tips go uncaught and press waits, and the beats after the return
 *       slip by more than the time away. Read the slip in the tier columns; income
 *       at one moment swings with whatever tip is in force. The first row is the
 *       arc that never hires the bookkeeper, so the hire's own cost shows.
 * § 3 — replay cost. Wall-clock milliseconds to replay one second away, mid-arc
 *       with every desk working: the measurement `OFFLINE_REPLAY_COST` records.
 */

import { OFFLINE_REPLAY_COST, OFFLINE_WINDOW_SECONDS, type HireId } from '../data';
import { formatClock } from '@/composables/useFormatting';
import { runArc, type ArcResult } from './_engine';

/** `formatClock`, with an em dash for never. */
const clock = (s: number): string => (Number.isFinite(s) ? formatClock(s) : '—');

const ARC = 30 * 60;

/** A load result for a save written `seconds` ago. */
const savedAgo = (seconds: number) => ({ success: true, timestamp: Date.now() - seconds * 1000 });

function hireAndPause(at: number): ArcResult {
  const run = runArc({
    seconds: at,
    hireBookkeeper: true,
    persistenceNamespacePrefix: `offline-${at}`,
  });
  if (!run.offline.bookkeeper.active.value)
    throw new Error(`offline probe: no bookkeeper by ${clock(at)}`);
  return run;
}

function accumulation(): void {
  console.log('═══ § 1  Accumulation: every desk off duty, nothing spends ═══\n');
  const run = hireAndPause(12 * 60);
  for (const id of Object.keys(run.automation.deskOn) as HireId[])
    run.automation.deskOn[id].value = false;
  for (const away of [60, 600]) {
    const rate = run.firm.incomeRate.value.toNumber();
    const back = run.offline.catchUp(run.engine, savedAgo(away));
    const predicted = rate * back.caughtUpSeconds;
    console.log(
      `  ${clock(away).padStart(7)} away: replayed ${clock(back.caughtUpSeconds)}, made $${back.cashGained.toExponential(3)}, closed form $${predicted.toExponential(3)} (${((100 * back.cashGained.toNumber()) / predicted).toFixed(2)}%)`,
    );
  }
  run.dispose();
}

function awayInsideArc(): void {
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
    `  ${'run'.padEnd(20)} ${'t5'.padStart(7)} ${'t6'.padStart(7)} ${'t7'.padStart(7)}  income at ${clock(ARC)}`,
  );
  for (const row of rows) {
    const run = runArc({ ...row.options, persistenceNamespacePrefix: `offline-${row.name}` });
    const at = (tier: number) =>
      run.beats.find((b) => b.key === `open:${run.firm.subsidiaries.getAll()[tier].def.id}`)?.t ??
      Infinity;
    console.log(
      `  ${row.name.padEnd(20)} ${clock(at(5)).padStart(7)} ${clock(at(6)).padStart(7)} ${clock(at(7)).padStart(7)}  $${run.firm.incomeRate.value.toExponential(3)}/s`,
    );
    run.dispose();
  }
}

function replayCost(): void {
  console.log('\n═══ § 3  Replay cost: every desk working, mid-arc ═══\n');
  const run = hireAndPause(15 * 60);
  const away = 600;
  const start = performance.now();
  const back = run.offline.catchUp(run.engine, savedAgo(away));
  const ms = performance.now() - start;
  const perSecond = ms / back.caughtUpSeconds;
  console.log(
    `  replayed ${clock(back.caughtUpSeconds)} in ${ms.toFixed(0)} ms: ${perSecond.toFixed(3)} ms per second away (recorded ${(OFFLINE_REPLAY_COST * 1000).toFixed(3)})`,
  );
  console.log(
    `  the window, ${clock(OFFLINE_WINDOW_SECONDS)}, replays in ${((perSecond * OFFLINE_WINDOW_SECONDS) / 1000).toFixed(1)} s`,
  );
  run.dispose();
}

accumulation();
awayInsideArc();
replayCost();
