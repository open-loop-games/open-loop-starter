/**
 * The spine as a runnable function: no engine, only `../data/spine.ts`. Prints the derived
 * numbers every price and bin reads, the softlock guard, and the first-Exposition
 * prediction the arc probe contradicts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/interlocker/balance/interlocker-projection.ts
 *
 * The prediction is printed twice: on `DEFAULT_PLAN`, the build the spine expects, and on
 * any build passed as `yard,farm,mine,pit,warehouse,cite` (the counts the arc probe prints
 * at an Exposition). A gap on the default plan but none on the probe's build means the plan
 * is off, not the model.
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
  predictFirstExposition,
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

function show(label: string, plan: BuildPlan): void {
  const p = predictFirstExposition(plan);
  console.log(
    `  ${label}: ${fmt(p.seconds)} = raw ${fmt(p.rawSeconds)} + crew ${fmt(p.crewSeconds)} (${JSON.stringify(plan)})`,
  );
}

console.log('== first Exposition ==');
show('default plan', DEFAULT_PLAN);
const arg = process.argv[2];
if (arg) {
  const [yard, farm, mine, pit, warehouse, cite] = arg.split(',').map(Number) as number[];
  show('given build', {
    yard: yard!,
    farm: farm!,
    mine: mine!,
    pit: pit!,
    warehouse: warehouse!,
    cite: cite!,
  });
}
