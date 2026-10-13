/**
 * Producer: allocation probe. What does the acquisitions desk's rule carry?
 * Plays the same arc under variants of the desk and prints each against the
 * shipping desk. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/allocation-probe.ts [minutes]`
 *
 * The variants:
 * - `shipping`: payback-greedy, holding back the cheapest open memo once the board sits;
 * - `cheapest`: the cheapest affordable unit, memo reserve kept;
 * - `no reserve`: payback-greedy with nothing held back for the board;
 * - `saves`: payback-greedy, and the desk may save for a unit it cannot yet afford;
 * - `hand ×½` and `hand ×2`: the shipping desk, behind a slower or faster hand.
 *
 * How to read it: income is at the horizon, against the projection's. Counts are
 * owned units per tier. The projection evaluates only the shipping desk's order,
 * so a variant that moves the arc far is a rule the spine cannot follow.
 */

import { Decimal, selectionCheapest, type Producer } from '@open-loop/engine';
import { ACTIVE_DEAL_RATE, LADDER, projectArc } from '../data';
import type { AutomationModuleOptions } from '../modules';
import { fmt, runArc } from './_engine';

const HORIZON = Number(process.argv[2] ?? 30) * 60;

const cheapest = selectionCheapest<Producer>((p) =>
  p.repeatable ? p.repeatable.getCost(1) : Infinity,
);

const variants: { name: string; automation?: AutomationModuleOptions; dealRate?: number }[] = [
  { name: 'shipping' },
  { name: 'cheapest', automation: { policy: cheapest } },
  { name: 'no reserve', automation: { memoReserve: false } },
  { name: 'saves', automation: { waitForCost: true } },
  { name: 'hand ×½', dealRate: ACTIVE_DEAL_RATE / 2 },
  { name: 'hand ×2', dealRate: ACTIVE_DEAL_RATE * 2 },
];

const projection = projectArc(LADDER, HORIZON);
console.log(`Producer: allocation probe (${fmt(HORIZON)})\n`);
console.log(
  `${'variant'.padEnd(11)} ${'income /s'.padStart(10)}  ${'vs proj'.padStart(7)}  ${'top tier'.padStart(8)}  memos  counts`,
);
console.log(
  `${'projection'.padEnd(11)} ${projection.finalRate.toExponential(2).padStart(10)}  ${''.padStart(7)}  ${fmt(projection.tierOpen.at(-1)!).padStart(8)}         ${projection.counts.join(' ')}`,
);
for (const v of variants) {
  const run = await runArc({
    seconds: HORIZON,
    automation: v.automation,
    dealRate: v.dealRate,
    persistenceNamespacePrefix: `producer-alloc-${v.name}`,
  });
  const { firm } = run;
  const income = firm.incomeRate.value.toNumber();
  const top = run.beats.find((b) => b.key === `open:${firm.subsidiaries.getAll().at(-1)!.def.id}`);
  const counts = firm.subsidiaries
    .getAll()
    .map((e) => Decimal.fromValue(e.producer.ownedCount.value).toNumber());
  console.log(
    `${v.name.padEnd(11)} ${income.toExponential(2).padStart(10)}  ${`${((100 * income) / projection.finalRate).toFixed(0)}%`.padStart(7)}  ${fmt(top?.t ?? Infinity).padStart(8)}  ${String(firm.management.purchasedCount.value).padStart(2)}/${firm.management.size}  ${counts.join(' ')}`,
  );
  run.dispose();
}
