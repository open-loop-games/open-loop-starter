/**
 * The spine as a runnable function: no engine, only `../data/spine.ts`. Prints the derived
 * numbers every price and bin reads, the softlock guard, the solved charters, the first
 * run and the arc that `arc-probe.ts` contradicts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/interlocker/balance/interlocker-projection.ts [expositions] [build]
 *
 * The first run is printed on `DEFAULT_PLAN`, and on any build passed as
 * `yard,farm,mine,pit,warehouse,cite`. The arc prints each run's plan and which budget
 * binds it. Instant.
 */

import {
  COST_GROWTH,
  DEFAULT_PLAN,
  RAW_EQ,
  RESEARCH,
  ROLE_RATE,
  T_FILL,
  T_FIRST,
  WAREHOUSES_FOR_EXPO,
  baseCapacity,
  CHARTER_COST,
  CHARTER_EFFECTS,
  CHARTER_IDS,
  FRESH,
  predictArc,
  predictRun,
  warehousesNeeded,
  type BuildPlan,
  type ResourceId,
} from '../data';

declare const process: { argv: string[] };

const fmt = (t: number) => `${Math.floor(t / 60)}m${String(Math.round(t % 60)).padStart(2, '0')}s`;
const round = (o: Record<string, number>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +v.toFixed(3)]));

console.log('== spine ==');
console.log(
  `  first purchase at ${T_FIRST}s; cost growth ${COST_GROWTH.toFixed(4)}; bin fill ${T_FILL}s`,
);
console.log(`  raw-eq: ${JSON.stringify(RAW_EQ)}`);
console.log(`  role rates (cycles/s per compagnon): ${JSON.stringify(round(ROLE_RATE))}`);
console.log(
  `  base bins: ${(['spruce', 'spars', 'aluminium', 'engines', 'aeroplanes'] as ResourceId[])
    .map((r) => `${r} ${baseCapacity(r).toFixed(1)}`)
    .join(', ')}; warehouses before the hangar holds an Exposition: ${WAREHOUSES_FOR_EXPO}`,
);
console.log(
  `  warehouses before each patent fits its bins: ${RESEARCH.map((r) => `${r.id} ${warehousesNeeded(r.cost)}`).join(', ')}`,
);
for (const id of ['sawpit', 'bonded'] as const) {
  const r = RESEARCH.find((x) => x.id === id)!;
  if (warehousesNeeded(r.cost) > 0)
    console.log(`  SOFTLOCK RISK: ${id} does not fit the base bins`);
}

console.log('== charters, solved ==');
for (const c of CHARTER_IDS)
  console.log(`  ${c.padEnd(10)} ${String(CHARTER_COST[c]).padStart(2)} renown`);
console.log(
  `  Crédit Mobilier's stake ${CHARTER_EFFECTS.stake} of each raw stock; the École's labour ×${CHARTER_EFFECTS.ecole}`,
);

function show(label: string, plan: BuildPlan): void {
  const p = predictRun(FRESH, plan);
  console.log(
    `  ${label}: ${fmt(p.seconds)}, raw ${fmt(p.rawSeconds)} · crew ${fmt(p.crewSeconds)} (${Object.entries(
      plan,
    )
      .map(([k, v]) => `${k} ${v}`)
      .join(' ')})`,
  );
}

console.log('== first Exposition ==');
show('default plan', DEFAULT_PLAN);
const build = process.argv[3];
if (build) {
  const [yard, farm, mine, pit, warehouse, cite] = build.split(',').map(Number) as number[];
  show('given build', {
    yard: yard!,
    farm: farm!,
    mine: mine!,
    pit: pit!,
    warehouse: warehouse!,
    cite: cite!,
  });
}

console.log('== the arc ==');
for (const [i, r] of predictArc(Number(process.argv[2] || 12)).entries()) {
  const p = predictRun(r.empire, r.plan);
  console.log(
    `  ${String(i + 1).padStart(2)}: ${fmt(r.seconds).padStart(6)} at ${fmt(r.at).padStart(7)} · ${(p.rawSeconds >= p.crewSeconds ? 'raw' : 'crew') + '-bound'} · renown ${String(r.empire.renown).padStart(2)} [${r.empire.charters.join(', ')}] · ${Object.entries(
      r.plan,
    )
      .map(([k, v]) => `${k} ${v}`)
      .join(' ')}`,
  );
}
