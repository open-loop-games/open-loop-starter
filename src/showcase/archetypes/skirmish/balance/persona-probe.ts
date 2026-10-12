/**
 * Skirmish persona & stochastic spread probe.
 *
 * Measures:
 * 1. Persona roster tournament (deterministic, jitter = 0) over the 5 canonical
 *    personas (rush, investor, skirmish, boom, combined).
 * 2. Stochastic leg probe (seeded multi-run batch with calibrated cadenceJitter = 0.15)
 *    using `@/balance` (`seedBatch`, `spreadOf`, `categorySpreadOf`).
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/skirmish/balance/persona-probe.ts`
 * Seeds override: `SEEDS=16 pnpm exec vite-node …/persona-probe.ts`
 */

import {
  categorySpreadOf,
  formatCategorySpread,
  formatSpread,
  seedBatch,
  spreadOf,
} from '@/balance';
import { buildSkirmishScratchEngine, createOutcomeCapture, seatsForPersonas } from './_engine';
import { PERSONAS, PERSONA_KEYS, type PersonaKey } from '../data/tactical';

const STEP_SEC = 0.5;
const MAX_SEC = 300;
const SEED_COUNT = Number(process.env.SEEDS ?? 10);
const seeds = seedBatch(SEED_COUNT);

interface MatchResult {
  winner: string;
  durationSec: number;
}

function runMatch(
  personaA: PersonaKey,
  personaB: PersonaKey,
  options?: { seed?: number; jitter?: number },
): MatchResult {
  const engine = buildSkirmishScratchEngine({
    ...seatsForPersonas(personaA, personaB, options?.jitter),
    seed: options?.seed,
    maxDeltaTime: STEP_SEC * 4,
  });
  const capture = createOutcomeCapture(engine);
  let t = 0;
  while (t < MAX_SEC && capture.reason === null) {
    engine.tickDriver.advanceTime(STEP_SEC);
    t += STEP_SEC;
  }
  return {
    winner: capture.winner ?? 'draw',
    durationSec: capture.reason === null ? MAX_SEC : (capture.durationSec ?? MAX_SEC),
  };
}

console.log('# Skirmish persona & stochastic spread probe\n');

console.log('## 1. Persona Roster\n');
for (const key of PERSONA_KEYS) {
  const p = PERSONAS[key];
  const compStr = Object.entries(p.composition)
    .map(([type, weight]) => `${weight}${type[0].toUpperCase()}`)
    .join(' ');
  console.log(
    `  - **${p.displayName}** (\`${key}\`): φ=${p.economyShare}, cadence=${p.cadenceSec}s, burst=${p.maxSpawnPerBurst}, comp=[${compStr}]`,
  );
  console.log(`    *${p.description}*`);
}

console.log('\n## 2. Deterministic Tournament Matrix (row A vs col B, jitter = 0)\n');
console.log('| A \\ B | ' + PERSONA_KEYS.join(' | ') + ' |');
console.log('|---' + PERSONA_KEYS.map(() => '|---').join('') + '|');

for (const a of PERSONA_KEYS) {
  const row: string[] = [];
  for (const b of PERSONA_KEYS) {
    const res = runMatch(a, b, { jitter: 0 });
    const dur = res.durationSec.toFixed(0);
    const winStr = res.winner === 'a' ? 'a win' : res.winner === 'b' ? 'b win' : 'draw';
    row.push(`${winStr} (${dur}s)`);
  }
  console.log(`| **${a}** | ${row.join(' | ')} |`);
}

console.log('\n## 3. Stochastic Leg — Seeded Multi-Run Distributions\n');
console.log(
  `Running ${SEED_COUNT} seeds (${seeds[0]}..${seeds[seeds.length - 1]}) with calibrated cadenceJitter = 0.15\n`,
);

const KEY_MATCHUPS: Array<[PersonaKey, PersonaKey, string]> = [
  ['rush', 'investor', 'Rush vs Investor (Spine opening baseline)'],
  ['rush', 'skirmish', 'Rush vs Archer Skirmish (Melee swarm vs Ranged screen)'],
  ['boom', 'skirmish', 'Cavalry Boom vs Archer Skirmish (Shock cavalry vs Archers)'],
  ['rush', 'boom', 'Rush vs Cavalry Boom (Punishing economic greed)'],
  ['combined', 'rush', 'Combined Arms vs Rush (Triad roster vs Infantry swarm)'],
];

console.log('| Matchup | Win distribution (A / B / Draw) | Duration spread (s) | Description |');
console.log('|---|---|---|---|');

for (const [pA, pB, desc] of KEY_MATCHUPS) {
  const batch: MatchResult[] = [];
  for (const s of seeds) {
    batch.push(runMatch(pA, pB, { seed: s, jitter: 0.15 }));
  }

  const winSpread = categorySpreadOf(batch, (m) => (m.winner === 'draw' ? 'draw' : `${m.winner}`));
  const durSpread = spreadOf(batch, { duration: (m) => m.durationSec });

  const winStr = formatCategorySpread(winSpread);
  const durStr = formatSpread(durSpread.duration, (n) => n.toFixed(1));

  console.log(`| **${pA} vs ${pB}** | ${winStr} | ${durStr} | ${desc} |`);
}

console.log('\n## 4. Verification Checkpoints\n');

// Check diagonal mirror symmetry under jitter = 0
let diagonalSymmetric = true;
for (const p of PERSONA_KEYS) {
  const selfMatch = runMatch(p, p, { jitter: 0 });
  if (selfMatch.winner !== 'draw') {
    diagonalSymmetric = false;
    console.error(
      `ERROR: Mirror asymmetry detected for persona "${p}"! Winner: ${selfMatch.winner}`,
    );
  }
}
if (diagonalSymmetric) {
  console.log('✅ Mirror symmetry: All 5 personas produce draws on the diagonal (jitter = 0).');
} else {
  console.error('❌ Mirror asymmetry failed!');
}
