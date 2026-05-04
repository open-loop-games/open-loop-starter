/**
 * OL-731 step-1 retune sweep — multi-axis Cartesian over the 4×4 persona
 * matrix to find a data slice where mass / counter / tech personas have
 * viable strategies, not just greed.
 *
 * Axes include refinery-1 cost / multiplier and baseIncomeRate — these are
 * the levers the dominance mechanism (greed's economic compound via
 * refinery-1) is gated on. Per BALANCING.md § Retune vs reshape: before
 * reshape, perturb the constants the existing harness already exposes,
 * including the ones the dominance mechanism is gated on.
 *
 * Acceptance bar: for some slice, mass-row-max > 0.3 OR counter-row-max
 * > 0.3 — i.e. mass or counter has a viable matchup against at least one
 * opponent. The structural failure mode this catches is a uniform-zero
 * row (a persona has no viable opponent), not just a uniform-zero column
 * (a persona is universally dominant).
 *
 * If found → small data PR retunes refinery economics; OL-731 closes
 * or rescopes. If not → reshape territory (cardinality, predicate, or
 * persona-knob), and OL-731's procedural-persona agent path indicated
 * with the structural-decisions list.
 *
 * Run: `pnpm balance:sweep:tug-retune`. ~17k runs at 12 seeds × 16
 * personas × 108 slices; tractable in one session at ~30 min wall.
 */

import { runMatrixUntil, type Engine, type UntilCell } from 'open-loop-engine';
import { TugTuningRegistryKey } from '../modules';
import {
  buildTugSimEngine,
  createOutcomeAnalyzer,
  createOutcomeCapture,
  type OutcomeCapture,
} from './bot';
import { DEFAULT_TUG_DATA } from '../data';
import type { TugOverrides } from '../data/overrides';
import type { PersonaKey } from '../data/personality';

// ─── Sweep parameters ────────────────────────────────────────────────────

const PERSONAS: PersonaKey[] = ['mass', 'greed', 'counter', 'tech'];
const ARCHETYPE_IDS = DEFAULT_TUG_DATA.units.map((u) => u.id);
const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);
const MAX_SIM_TIME_SEC = 35 * 60;
const TICK_DELTA_SEC = 1.0;

/** Refinery-1 multiplier — the actual lever for greed's economic edge.
 *  Default 1.5; 1.0 disables the eco strategy entirely. */
const REFINERY_MULT_AXIS = [1.0, 1.25, 1.5];

/** Refinery-1 cost — gates *when* greed gets the income compound. Default
 *  100; 400 = ~80s save (a third of a typical match); 1600 = ~5min save
 *  (greed effectively never gets it). */
const REFINERY_COST_AXIS = [100, 400, 1600];

/** Global base income rate. Interacts with refinery payback. Default 5/s. */
const BASE_INCOME_AXIS = [3, 5, 8];

/** `cost` mult applied to units with base cost ≥ 150 (siege-tank,
 *  battlecruiser, ghost). */
const TOP_TIER_COST_AXIS = [1.0, 2.0];

/** `counter-matrix/strongCounter` tunable scope. */
const STRONG_AXIS = [1.0, 2.0];

const TOP_TIER_COST_FLOOR = 150;

const DEFAULT_REFINERY_MULT = 1.5;
const DEFAULT_REFINERY_COST = 100;
const DEFAULT_BASE_INCOME = 5;
const DEFAULT_TOP_TIER_COST = 1.0;
const DEFAULT_STRONG = 1.0;

/** Acceptance: at least one persona row has a max win-rate above this. */
const VIABILITY_THRESHOLD = 0.3;

// ─── Slice → overrides ───────────────────────────────────────────────────

interface Slice {
  refineryMult: number;
  refineryCost: number;
  baseIncome: number;
  topTierCost: number;
  strong: number;
}

function isDefaultSlice(s: Slice): boolean {
  return (
    s.refineryMult === DEFAULT_REFINERY_MULT &&
    s.refineryCost === DEFAULT_REFINERY_COST &&
    s.baseIncome === DEFAULT_BASE_INCOME &&
    s.topTierCost === DEFAULT_TOP_TIER_COST &&
    s.strong === DEFAULT_STRONG
  );
}

function buildOverrides(slice: Slice, player: PersonaKey, ai: PersonaKey): TugOverrides {
  const unitPatches = DEFAULT_TUG_DATA.units
    .filter((u) => Number(u.cost) >= TOP_TIER_COST_FLOOR)
    .map((u) => ({ id: u.id, cost: Number(u.cost) * slice.topTierCost }));

  const incomeUpgradePatches: Array<{ id: string; cost?: number; multiplier?: number }> = [];
  if (slice.refineryCost !== DEFAULT_REFINERY_COST) {
    incomeUpgradePatches.push({ id: 'refinery-1', cost: slice.refineryCost });
  }
  if (slice.refineryMult !== DEFAULT_REFINERY_MULT) {
    const existing = incomeUpgradePatches.find((p) => p.id === 'refinery-1');
    if (existing) existing.multiplier = slice.refineryMult;
    else incomeUpgradePatches.push({ id: 'refinery-1', multiplier: slice.refineryMult });
  }

  return {
    units: slice.topTierCost !== DEFAULT_TOP_TIER_COST ? unitPatches : undefined,
    incomeUpgrades: incomeUpgradePatches.length > 0 ? incomeUpgradePatches : undefined,
    balance: {
      baseIncomeRate: slice.baseIncome,
      opponentPersona: { player, ai },
    },
  };
}

// ─── Cell builder ────────────────────────────────────────────────────────

let activeCapture: OutcomeCapture | null = null;

function buildCell(name: string, overrides: TugOverrides, strong: number): UntilCell {
  return {
    name,
    buildEngine: () => buildTugSimEngine(overrides),
    analyzers: (engine: Engine) => {
      const capture = createOutcomeCapture(engine);
      activeCapture = capture;
      const reg = engine.tryInject(TugTuningRegistryKey)!;
      const cleanup = reg.pushScope(`sweep:${name}`, {
        'counter-matrix/strongCounter': () => strong,
      });
      return [
        createOutcomeAnalyzer(capture),
        {
          name: 'scope-cleanup',
          onEnd: () => cleanup(),
          summarize: () => ({ name: 'scope-cleanup', metrics: {}, issues: [] }),
        },
      ];
    },
    tickDelta: TICK_DELTA_SEC,
  };
}

// ─── Per-slice run ───────────────────────────────────────────────────────

type WinMatrix = Record<PersonaKey, Record<PersonaKey, number>>;

function emptyMatrix(): WinMatrix {
  return {
    mass: { mass: 0, greed: 0, counter: 0, tech: 0 },
    greed: { mass: 0, greed: 0, counter: 0, tech: 0 },
    counter: { mass: 0, greed: 0, counter: 0, tech: 0 },
    tech: { mass: 0, greed: 0, counter: 0, tech: 0 },
  };
}

interface SliceResult {
  matrix: WinMatrix;
  /** Aggregate share across the 16-cell persona meta — fraction of player
   *  spawns in winning matches, by archetype. Computed the same way as
   *  probe 6's `aggregateShare`. */
  aggregateShare: Record<string, number>;
  topArchetype: string | null;
  topShare: number;
}

function runSlice(slice: Slice): SliceResult {
  const cells: UntilCell[] = [];
  for (const player of PERSONAS) {
    for (const ai of PERSONAS) {
      const name = `mult=${slice.refineryMult}/cost=${slice.refineryCost}/base=${slice.baseIncome}/top=${slice.topTierCost}/strong=${slice.strong}/p=${player}/ai=${ai}`;
      cells.push(buildCell(name, buildOverrides(slice, player, ai), slice.strong));
    }
  }
  const result = runMatrixUntil({
    cells,
    seeds: SEEDS,
    until: () => activeCapture?.firstMatchEnded ?? false,
    maxSimTime: MAX_SIM_TIME_SEC,
  });

  const matrix = emptyMatrix();
  const totalByArchetype: Record<string, number> = Object.fromEntries(
    ARCHETYPE_IDS.map((id) => [id, 0]),
  );
  let grandTotal = 0;

  let idx = 0;
  for (const player of PERSONAS) {
    for (const ai of PERSONAS) {
      const cell = result.cells[idx++]!;
      matrix[player][ai] = cell.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0;
      for (const archId of ARCHETYPE_IDS) {
        const avg = cell.aggregate.metrics[`tug-outcome.spawnsInWin.player.${archId}`]?.avg ?? 0;
        totalByArchetype[archId] += avg;
        grandTotal += avg;
      }
    }
  }

  const aggregateShare: Record<string, number> = {};
  for (const archId of ARCHETYPE_IDS) {
    aggregateShare[archId] = grandTotal > 0 ? totalByArchetype[archId]! / grandTotal : 0;
  }
  let topArchetype: string | null = null;
  let topShare = 0;
  for (const archId of ARCHETYPE_IDS) {
    if (aggregateShare[archId]! > topShare) {
      topShare = aggregateShare[archId]!;
      topArchetype = archId;
    }
  }

  return { matrix, aggregateShare, topArchetype, topShare };
}

// ─── Diagnostics ─────────────────────────────────────────────────────────

function rowMax(m: WinMatrix, p: PersonaKey): number {
  return Math.max(...PERSONAS.map((a) => m[p][a]));
}

interface Degeneracy {
  degenerate: boolean;
  reasons: string[];
}

function checkDegeneracy(m: WinMatrix): Degeneracy {
  const reasons: string[] = [];
  for (const p of PERSONAS) {
    const row = PERSONAS.map((a) => m[p][a]);
    if (row.every((v) => v <= 0.05)) reasons.push(`${p}_row≈0`);
    if (row.every((v) => v >= 0.95)) reasons.push(`${p}_row≈1`);
  }
  for (const a of PERSONAS) {
    const col = PERSONAS.map((p) => m[p][a]);
    if (col.every((v) => v <= 0.05)) reasons.push(`vs-${a}_col≈0`);
    if (col.every((v) => v >= 0.95)) reasons.push(`vs-${a}_col≈1`);
  }
  return { degenerate: reasons.length > 0, reasons };
}

function matrixSpread(m: WinMatrix): number {
  const cells: number[] = [];
  for (const p of PERSONAS) for (const a of PERSONAS) cells.push(m[p][a]);
  const mean = cells.reduce((s, v) => s + v, 0) / cells.length;
  return Math.sqrt(cells.reduce((s, v) => s + (v - mean) ** 2, 0) / cells.length);
}

interface SliceRow {
  slice: Slice;
  result: SliceResult;
  spread: number;
  massMax: number;
  counterMax: number;
  greedMax: number;
  techMax: number;
  degeneracy: Degeneracy;
  isDefault: boolean;
  elapsedSec: number;
}

// ─── Main ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toFixed(2);
}

function renderMatrix(m: WinMatrix): string {
  const header = `| p ↓ / ai → | ${PERSONAS.join(' | ')} |`;
  const sep = `|---|${PERSONAS.map(() => '---').join('|')}|`;
  const rows = PERSONAS.map((p) => `| ${p} | ${PERSONAS.map((a) => fmt(m[p][a])).join(' | ')} |`);
  return [header, sep, ...rows].join('\n');
}

function sliceLabel(s: Slice): string {
  return `mult=${s.refineryMult}/cost=${s.refineryCost}/base=${s.baseIncome}/top=${s.topTierCost}/strong=${s.strong}`;
}

function main(): void {
  const t0 = Date.now();
  const totalSlices =
    REFINERY_MULT_AXIS.length *
    REFINERY_COST_AXIS.length *
    BASE_INCOME_AXIS.length *
    TOP_TIER_COST_AXIS.length *
    STRONG_AXIS.length;
  const totalRuns = totalSlices * 16 * SEEDS.length;

  console.log('# OL-731 step 1 — multi-axis retune sweep\n');
  console.log(`Run at ${new Date().toISOString()}`);
  console.log(`Axes:`);
  console.log(`  refinery-1 multiplier ∈ {${REFINERY_MULT_AXIS.join(', ')}}`);
  console.log(`  refinery-1 cost ∈ {${REFINERY_COST_AXIS.join(', ')}}`);
  console.log(`  base income rate ∈ {${BASE_INCOME_AXIS.join(', ')}}`);
  console.log(`  top-tier-cost ∈ {${TOP_TIER_COST_AXIS.join(', ')}}`);
  console.log(`  strongCounter ∈ {${STRONG_AXIS.join(', ')}}`);
  console.log(`Personas: ${PERSONAS.length}×${PERSONAS.length} = 16 cells per slice`);
  console.log(`Seeds: ${SEEDS.length} per cell`);
  console.log(
    `Total: ${totalSlices} slices × 16 cells × ${SEEDS.length} seeds = ${totalRuns} runs\n`,
  );

  const rows: SliceRow[] = [];
  let i = 0;
  for (const refineryMult of REFINERY_MULT_AXIS) {
    for (const refineryCost of REFINERY_COST_AXIS) {
      for (const baseIncome of BASE_INCOME_AXIS) {
        for (const topTierCost of TOP_TIER_COST_AXIS) {
          for (const strong of STRONG_AXIS) {
            i++;
            const slice: Slice = {
              refineryMult,
              refineryCost,
              baseIncome,
              topTierCost,
              strong,
            };
            const sliceT0 = Date.now();
            const result = runSlice(slice);
            const elapsedSec = (Date.now() - sliceT0) / 1000;
            const spread = matrixSpread(result.matrix);
            const massMax = rowMax(result.matrix, 'mass');
            const counterMax = rowMax(result.matrix, 'counter');
            const greedMax = rowMax(result.matrix, 'greed');
            const techMax = rowMax(result.matrix, 'tech');
            const degeneracy = checkDegeneracy(result.matrix);
            rows.push({
              slice,
              result,
              spread,
              massMax,
              counterMax,
              greedMax,
              techMax,
              degeneracy,
              isDefault: isDefaultSlice(slice),
              elapsedSec,
            });
            const tag = isDefaultSlice(slice) ? ' [DEFAULT]' : '';
            const degTag = degeneracy.degenerate
              ? ` DEGEN[${degeneracy.reasons.join(',')}]`
              : ' NON-DEGEN';
            console.log(
              `[${i}/${totalSlices}] ${sliceLabel(slice)}${tag}:${degTag} spread=${spread.toFixed(3)}, ` +
                `m=${fmt(massMax)}/g=${fmt(greedMax)}/c=${fmt(counterMax)}/t=${fmt(techMax)}, ` +
                `top=${result.topArchetype}@${fmt(result.topShare)} ` +
                `(${elapsedSec.toFixed(1)}s)`,
            );
          }
        }
      }
    }
  }

  const defaultRow = rows.find((r) => r.isDefault);
  if (!defaultRow) {
    console.log('\nWARNING: no default slice in axis grid — cannot compute diffAggregates.');
  }

  // ─── Non-degeneracy summary ─────────────────────────────────────────────
  // mass-max=1 etc. is too coarse: it only requires winning one cell out of
  // 16, and beating-tech almost always trivially passes. The real question
  // is whether any slice has no uniform row or column — every persona AND
  // every opponent both wins and loses at least once.
  console.log('\n## Non-degeneracy summary\n');
  const nondegen = rows.filter((r) => !r.degeneracy.degenerate);
  console.log(`non-degenerate matrices: ${nondegen.length}/${rows.length}`);
  if (nondegen.length > 0) {
    console.log('\nNon-degenerate slices:');
    for (const r of nondegen) {
      console.log(
        `  ${sliceLabel(r.slice)}${r.isDefault ? ' [DEFAULT]' : ''}: spread=${r.spread.toFixed(3)}, top=${r.result.topArchetype}@${fmt(r.result.topShare)}`,
      );
    }
  }

  // ─── Viability summary (kept as secondary signal) ───────────────────────
  console.log('\n## Persona-row-max viability (coarse — beating tech counts)\n');
  console.log(`Threshold: persona-row-max ≥ ${VIABILITY_THRESHOLD}.`);
  const massViable = rows.filter((r) => r.massMax >= VIABILITY_THRESHOLD);
  const counterViable = rows.filter((r) => r.counterMax >= VIABILITY_THRESHOLD);
  const bothViable = rows.filter(
    (r) => r.massMax >= VIABILITY_THRESHOLD && r.counterMax >= VIABILITY_THRESHOLD,
  );
  console.log(`mass viable in ${massViable.length}/${rows.length} slices`);
  console.log(`counter viable in ${counterViable.length}/${rows.length} slices`);
  console.log(`both viable in ${bothViable.length}/${rows.length} slices\n`);

  // ─── Top slices ranked by mass-max + counter-max ────────────────────────
  console.log('## Top slices by (mass-max + counter-max) — best mass/counter unlock\n');
  const ranked = [...rows].sort((a, b) => b.massMax + b.counterMax - (a.massMax + a.counterMax));
  console.log('| slice | spread | mass-max | counter-max | greed-max | tech-max | top archetype |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of ranked.slice(0, 12)) {
    const tag = r.isDefault ? ' [DEFAULT]' : '';
    console.log(
      `| ${sliceLabel(r.slice)}${tag} | ${r.spread.toFixed(3)} | ${fmt(r.massMax)} | ${fmt(r.counterMax)} | ${fmt(r.greedMax)} | ${fmt(r.techMax)} | ${r.result.topArchetype}@${fmt(r.result.topShare)} |`,
    );
  }

  // ─── Default slice + matrix ─────────────────────────────────────────────
  if (defaultRow) {
    console.log('\n## Default slice — current data\n');
    console.log(`spread=${defaultRow.spread.toFixed(3)}`);
    console.log(
      `mass-max=${fmt(defaultRow.massMax)}, counter-max=${fmt(defaultRow.counterMax)}, greed-max=${fmt(defaultRow.greedMax)}, tech-max=${fmt(defaultRow.techMax)}`,
    );
    console.log(
      `top archetype: ${defaultRow.result.topArchetype}@${fmt(defaultRow.result.topShare)}`,
    );
    console.log(renderMatrix(defaultRow.result.matrix));
    console.log('\nAggregate share (default):');
    for (const id of ARCHETYPE_IDS) {
      console.log(`  ${id}: ${fmt(defaultRow.result.aggregateShare[id]!)}`);
    }
  }

  // ─── Top unlock slices: matrix + aggregate share ────────────────────────
  if (ranked.length > 0) {
    console.log('\n## Top-5 unlock slices — matrix + aggregate share\n');
    const topUnlock = ranked.filter((r) => !r.isDefault).slice(0, 5);
    for (const r of topUnlock) {
      console.log(`\n### ${sliceLabel(r.slice)}`);
      console.log(
        `mass-max=${fmt(r.massMax)}, counter-max=${fmt(r.counterMax)}, top=${r.result.topArchetype}@${fmt(r.result.topShare)}`,
      );
      console.log(renderMatrix(r.result.matrix));
      console.log('\nAggregate share:');
      for (const id of ARCHETYPE_IDS) {
        console.log(`  ${id}: ${fmt(r.result.aggregateShare[id]!)}`);
      }
    }
  }

  // ─── All matrices + aggregate shares ────────────────────────────────────
  console.log('\n## Full per-slice scalars\n');
  console.log('| slice | degen | spread | m | g | c | t | top |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const tag = r.isDefault ? ' [DEFAULT]' : '';
    const dg = r.degeneracy.degenerate ? r.degeneracy.reasons.join(',') : 'NON-DEGEN';
    console.log(
      `| ${sliceLabel(r.slice)}${tag} | ${dg} | ${r.spread.toFixed(3)} | ${fmt(r.massMax)} | ${fmt(r.greedMax)} | ${fmt(r.counterMax)} | ${fmt(r.techMax)} | ${r.result.topArchetype}@${fmt(r.result.topShare)} |`,
    );
  }

  // ─── All matrices ───────────────────────────────────────────────────────
  console.log('\n## All per-slice win-rate matrices\n');
  for (const r of rows) {
    const tag = r.isDefault ? ' [DEFAULT]' : '';
    const dg = r.degeneracy.degenerate ? ` DEGEN[${r.degeneracy.reasons.join(',')}]` : ' NON-DEGEN';
    console.log(`\n### ${sliceLabel(r.slice)}${tag}${dg}`);
    console.log(`top=${r.result.topArchetype}@${fmt(r.result.topShare)}`);
    console.log(renderMatrix(r.result.matrix));
  }

  console.log(`\nTotal: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main();
