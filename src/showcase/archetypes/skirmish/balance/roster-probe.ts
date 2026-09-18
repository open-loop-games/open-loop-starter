/**
 * Skirmish roster probe — verifies counter-matrix dynamics and unit composition
 * matchups across the 3-unit tactical roster.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/skirmish/balance/roster-probe.ts
 */

import { buildSkirmishSimEngine, createOutcomeCapture } from './_engine';
import { UNITS, type UnitTypeId } from '../data/tactical';

const STEP_SEC = 0.5;
const MAX_SEC = 300;
const UNIT_TYPES: UnitTypeId[] = ['trooper', 'archer', 'cavalry'];

function runCompositionMatchup(
  compA: Partial<Record<UnitTypeId, number>>,
  compB: Partial<Record<UnitTypeId, number>>,
) {
  const engine = buildSkirmishSimEngine({
    a: { economyShare: 0, cadenceSec: 2, maxSpawnPerBurst: Infinity, composition: compA },
    b: { economyShare: 0, cadenceSec: 2, maxSpawnPerBurst: Infinity, composition: compB },
    maxDeltaTime: STEP_SEC * 4,
  });
  const capture = createOutcomeCapture(engine);
  let t = 0;
  while (t < MAX_SEC && capture.reason === null) {
    engine.tickDriver.simulateTick(STEP_SEC);
    t += STEP_SEC;
  }
  return {
    winner: capture.winner ?? 'draw',
    durationSec: capture.reason === null ? MAX_SEC : (capture.durationSec ?? MAX_SEC),
  };
}

console.log('# Skirmish roster probe — unit counter matrix verification\n');
console.log('Roster:');
for (const u of UNITS) {
  console.log(
    `  - ${u.name.padEnd(8)} (${u.archetypeTag.padEnd(8)}): cost=${u.cost}, hp=${u.hp}, ` +
      `damage=${u.damage}, range=${u.attackRange}, speed=${u.speed}`,
  );
}

console.log('\n## 1. Pure Type vs Pure Type Payoff Matrix (row A vs col B)\n');
console.log('| A \\ B | ' + UNIT_TYPES.join(' | ') + ' |');
console.log('|---' + UNIT_TYPES.map(() => '|---').join('') + '|');

for (const a of UNIT_TYPES) {
  const row: string[] = [];
  for (const b of UNIT_TYPES) {
    const res = runCompositionMatchup({ [a]: 1 }, { [b]: 1 });
    const dur = res.durationSec.toFixed(0);
    row.push(`${res.winner} (${dur}s)`);
  }
  console.log(`| **${a}** | ${row.join(' | ')} |`);
}

console.log('\n## 2. Triad Verification\n');
const tVsC = runCompositionMatchup({ trooper: 1 }, { cavalry: 1 });
console.log(
  `- Infantry (trooper) vs Cavalry: winner=${tVsC.winner} in ${tVsC.durationSec.toFixed(1)}s (expected: a / infantry)`,
);

const cVsA = runCompositionMatchup({ cavalry: 1 }, { archer: 1 });
console.log(
  `- Cavalry vs Ranged (archer):   winner=${cVsA.winner} in ${cVsA.durationSec.toFixed(1)}s (expected: a / cavalry)`,
);

const aVsT = runCompositionMatchup({ archer: 1 }, { trooper: 1 });
console.log(
  `- Ranged (archer) vs Infantry:   winner=${aVsT.winner} in ${aVsT.durationSec.toFixed(1)}s (expected: a / archer)`,
);
