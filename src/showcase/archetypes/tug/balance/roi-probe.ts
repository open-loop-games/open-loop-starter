/**
 * Tug income-ladder probe — does the refinery ladder behave the way
 * `data/income.ts` § Balance says it does?
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/tug/balance/roi-probe.ts`.
 *
 * The ladder's design is stated in prose beside the constants: costs climb
 * faster than the payoff, multipliers taper, and the last rung's payback sits
 * near enough to the match limit to be a real bet. Nothing compared the two,
 * and the data drifted — Refinery II shipped *cheaper* than Refinery I while
 * the comment above it described a ladder that climbs.
 *
 * A test cannot own this. Payback seconds are measured values, so asserting
 * them reds on every legitimate retune. But "costs ascend", "multipliers
 * taper" and "the ladder is affordable inside a match" are design claims with
 * yes/no answers, so those print as verdicts and the numbers print as a table.
 *
 * Sequential gating matters for the arithmetic: tier N is only ever bought
 * from the state tier N-1 left, so each rung's payback is computed against the
 * rate the prior rungs already granted, not against the base rate.
 *
 * The same shape generalises past this archetype — a design stated in prose
 * beside the data it describes, with nothing comparing the two. See
 * `candidate-balance-methods.md` § Design prose and shipping data drift apart.
 */

import { DEFAULT_TUG_DATA } from '../data';
import { BASE_INCOME_RATE } from '../modules';

/** Match length the ladder has to pay back inside, in seconds. */
const MATCH_LIMIT_SEC = 30 * 60;

interface RungRow {
  id: string;
  name: string;
  cost: number;
  multiplier: number;
  /** Income rate in effect when this rung is the next purchase. */
  rateBefore: number;
  paybackSec: number;
  cumulativeMultiplier: number;
}

function ladder(): RungRow[] {
  const base = Number(BASE_INCOME_RATE);
  let rate = base;
  let cumulative = 1;
  return DEFAULT_TUG_DATA.incomeUpgrades.map((def) => {
    const cost = Number(def.cost);
    const multiplier = Number(def.multiplier);
    const row: RungRow = {
      id: def.id,
      name: def.name,
      cost,
      multiplier,
      rateBefore: rate,
      paybackSec: cost / (rate * (multiplier - 1)),
      cumulativeMultiplier: cumulative * multiplier,
    };
    rate *= multiplier;
    cumulative *= multiplier;
    return row;
  });
}

function main(): void {
  const rows = ladder();

  console.log('# Tug income ladder\n');
  console.log(`Base rate ${Number(BASE_INCOME_RATE)}/s; match limit ${MATCH_LIMIT_SEC / 60}min.\n`);
  console.log('| rung | cost | mult | rate before | payback | cumulative |');
  console.log('|---|---|---|---|---|---|');
  for (const r of rows) {
    console.log(
      `| ${r.name} | ${r.cost.toLocaleString()} | ×${r.multiplier} | ${r.rateBefore.toFixed(1)}/s | ` +
        `${r.paybackSec.toFixed(0)}s | ×${r.cumulativeMultiplier.toFixed(2)} |`,
    );
  }

  // Design claims from `data/income.ts` § Balance. Each has a yes/no answer,
  // so each prints a verdict rather than a number with a band around it.
  const costsAscend = rows.every((r, i) => i === 0 || r.cost > rows[i - 1]!.cost);
  const multsTaper = rows.every((r, i) => i === 0 || r.multiplier <= rows[i - 1]!.multiplier);
  const costsOutpacePayoff = rows.every((r, i) => {
    if (i === 0) return true;
    return r.cost / rows[i - 1]!.cost > r.multiplier;
  });

  console.log('\n## Against the stated design\n');
  console.log(`  costs ascend along the path:        ${costsAscend ? 'OK' : 'MISMATCH'}`);
  console.log(`  multipliers taper down the path:    ${multsTaper ? 'OK' : 'MISMATCH'}`);
  console.log(`  cost ratio outruns payoff ratio:    ${costsOutpacePayoff ? 'OK' : 'MISMATCH'}`);

  if (!costsAscend) {
    console.log('\n  A cheaper rung further along makes the gate meaningless — the');
    console.log('  player is never choosing, only walking. Check `data/income.ts`.');
  }

  // Not a verdict: how much of the match each rung needs to earn back is a
  // pacing reading, and "marginal" is the intent for the last rung.
  console.log('\n## Payback as a share of the match\n');
  for (const r of rows) {
    const share = (r.paybackSec / MATCH_LIMIT_SEC) * 100;
    const note = share > 100 ? '  ← cannot pay back inside a match' : '';
    console.log(`  ${r.name}: ${share.toFixed(0)}% of the match limit${note}`);
  }
  console.log();
}

main();
