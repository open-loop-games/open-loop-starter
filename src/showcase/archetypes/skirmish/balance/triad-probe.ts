/**
 * Skirmish Triad Balance Probe — N=3 spatial mirror symmetry and ecological tournament.
 *
 * Measures:
 * 1. Equilateral Mirror Probe: Tests rotational symmetry and lack of seat bias on
 *    regular N-gon arena ($d_{ij} \approx 65.8$). Verifies that identical personas
 *    (e.g. 3x rush, 3x investor) achieve equal win shares (1/N = 33.3% ± ε) across
 *    seeded batches with calibrated cadence jitter.
 * 2. Triad Ecological Tournament: Heterogeneous 3-player ecologies (Rush vs Boom vs Skirmish)
 *    evaluating non-zero-sum multi-agent dynamics, third-party free-rider effects,
 *    and survival distributions (T_elim1, T_elim2, final victor).
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/skirmish/balance/triad-probe.ts`
 * Seeds override: `SEEDS=15 pnpm exec vite-node …/triad-probe.ts`
 */

import {
  categorySpreadOf,
  formatCategorySpread,
  formatSpread,
  seedBatch,
  spreadOf,
} from '@/balance';
import { buildSkirmishSimEngine, createOutcomeCapture, seatsForTriad } from './_engine';
import { PERSONAS, DEFAULT_TRIAD_FACTIONS, type PersonaKey } from '../data/tactical';

const STEP_SEC = 0.5;
const MAX_SEC = 250;
const SEED_COUNT = Number(process.env.SEEDS ?? 12);
const seeds = seedBatch(SEED_COUNT);

interface TriadMatchResult {
  winner: string;
  durationSec: number;
  eliminations: Array<{ faction: string; timeSec: number }>;
}

function runTriadMatch(
  personas: [PersonaKey, PersonaKey, PersonaKey],
  options?: { seed?: number; jitter?: number },
): TriadMatchResult {
  const engine = buildSkirmishSimEngine({
    ...seatsForTriad(personas, DEFAULT_TRIAD_FACTIONS, options?.jitter ?? 0.15),
    seed: options?.seed,
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
    eliminations: capture.eliminations.map((e) => ({
      faction: e.faction,
      timeSec: e.eliminatedAtSec,
    })),
  };
}

console.log('# Skirmish Triad Balance Probe — N=3 Spatial Mirror & Ecological Dynamics\n');
console.log(`Running ${SEED_COUNT} seeds (${seeds[0]}..${seeds[seeds.length - 1]})\n`);

// ─── 1. Equilateral Mirror Probe (Symmetry Lock) ─────────────────────────────
console.log('## 1. Equilateral Mirror Probe (Rotational Symmetry Lock)\n');
console.log('Verifying equal win share (1/3 = 33.3% ± ε) on regular 3-gon base geometry:\n');

const MIRROR_PERSONAS: PersonaKey[] = ['rush', 'investor', 'combined'];

for (const pKey of MIRROR_PERSONAS) {
  const batch: TriadMatchResult[] = [];

  for (const seed of seeds) {
    batch.push(runTriadMatch([pKey, pKey, pKey], { seed, jitter: 0.15 }));
  }

  const winSpread = categorySpreadOf(batch, (m) => m.winner);
  const durSpread = spreadOf(batch, { duration: (m) => m.durationSec });

  console.log(`- **3x ${PERSONAS[pKey].name}** (\`${pKey}\`):`);
  console.log(`  - Win share: ${formatCategorySpread(winSpread)}`);
  console.log(`  - Match duration: ${formatSpread(durSpread.duration, (n) => n.toFixed(1))}s\n`);
}

// ─── 2. Triad Ecological Tournament ──────────────────────────────────────────
console.log('## 2. Triad Ecological Tournament — Non-Zero-Sum Dynamics\n');

interface TriadEcology {
  id: string;
  name: string;
  personas: [PersonaKey, PersonaKey, PersonaKey];
  description: string;
}

const ECOLOGIES: TriadEcology[] = [
  {
    id: 'rps_triad',
    name: 'Canonical Triad: Rush vs Boom vs Skirmish',
    personas: ['rush', 'boom', 'skirmish'],
    description: 'Swarm (Crimson) vs Cavalry Blitz (Azure) vs Archer Screen (Emerald)',
  },
  {
    id: 'swarm_pincer',
    name: 'Dual Rush vs Single Boom',
    personas: ['rush', 'boom', 'rush'],
    description: 'Two swarms pressuring one high-economy compounding seat',
  },
  {
    id: 'macro_screen',
    name: 'Rush vs Dual Skirmish Screen',
    personas: ['rush', 'skirmish', 'skirmish'],
    description: 'One melee swarm attempting to breach two ranged screens',
  },
  {
    id: 'scaling_standoff',
    name: 'Macro Standoff: Boom vs Investor vs Combined',
    personas: ['boom', 'investor', 'combined'],
    description: 'Late-game economic and composition scaling without early rush pressure',
  },
];

for (const eco of ECOLOGIES) {
  console.log(`### ${eco.name}`);
  console.log(`*${eco.description}*`);
  console.log(
    `Seats: Crimson=\`${eco.personas[0]}\`, Azure=\`${eco.personas[1]}\`, Emerald=\`${eco.personas[2]}\`\n`,
  );

  const batch: TriadMatchResult[] = [];
  for (const seed of seeds) {
    batch.push(runTriadMatch(eco.personas, { seed, jitter: 0.15 }));
  }

  const winSpread = categorySpreadOf(batch, (m) => m.winner);
  const durSpread = spreadOf(batch, { duration: (m) => m.durationSec });

  const firstElimFactions: string[] = [];
  const firstElimTimes: Array<{ time: number }> = [];
  for (const m of batch) {
    if (m.eliminations.length > 0) {
      firstElimFactions.push(m.eliminations[0].faction);
      firstElimTimes.push({ time: m.eliminations[0].timeSec });
    }
  }

  const firstElimSpread = categorySpreadOf(firstElimFactions, (f) => f);

  console.log(`- **Victor Share**: ${formatCategorySpread(winSpread)}`);
  console.log(`- **First Eliminated**: ${formatCategorySpread(firstElimSpread)}`);
  if (firstElimTimes.length > 0) {
    const timeSpread = spreadOf(firstElimTimes, { time: (t) => t.time });
    console.log(
      `- **First Elimination Time (T_elim1)**: ${formatSpread(timeSpread.time, (n) => n.toFixed(1))}s`,
    );
  }
  console.log(`- **Match Duration**: ${formatSpread(durSpread.duration, (n) => n.toFixed(1))}s\n`);
}
