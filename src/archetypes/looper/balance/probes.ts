/**
 * Looper sim-driven balance probes — three reset-spanning probes per
 * `archetypes/looper.md` § 6. Math-only locks (initialMana / costDivisor /
 * talentAccrualRatio receipts, prereq graph shape, content cardinality, and
 * the gold↔mana exchange algebraic identity) live in
 * `sim/balance.probe.test.ts` per the doc's Locator column split.
 *
 * Run: `pnpm balance:probes:looper`. Prints three report sections.
 *
 * - **manapot-perceptibility** (beats 3, 4) — sweep
 *   `progressVars/roam/scales/cache/perLevel ×{0.75, 1.0, 1.25}`. Per-loop
 *   `manaAdded` from the canonical bot's LoopLog should grow across loops as
 *   roam levels extend the cache pool. Baseline = first loop with non-zero
 *   `manaAdded`; compared = baseline + 3 loops; pass requires ≥10% growth.
 *
 * - **cost-reduction-perceptibility** (beat 6) — sweep
 *   `balance/talentAccrualRatio ×{0.5, 1.0, 2.0}`. After Talent crosses 1 on
 *   any capability, the next loop runs with elevated `talentMult` from tick
 *   zero — same plan completes in fewer engine ticks. Compared via LoopLog
 *   `loopElapsed`: post-threshold loop should be shorter than pre.
 *
 * - **loop-reset-correctness** — 5-loop sweep verifying per-loop refs zero
 *   on restart (Level XP, mana == initialMana, gold == 0, action progress,
 *   regularVar `checked`) AND persistent refs survive (Talent XP, action
 *   `timesCompleted`, progressVar XP, regularVar `total`). Tap `beforeRestart`
 *   for pre-snapshot, `afterRestart` for post-snapshot, diff.
 *
 * Reporter helpers (`renderTable`, `fmtNum`) duplicated from
 * `archetypes/ambient/balance/probes.ts`. TODO(expansion): graduate to
 * `open-loop-engine/src/harness/` when a third consumer wants the same shape.
 */

import { Decimal, runUntil, type Engine } from 'open-loop-engine';
import {
  ActionsKey,
  CapabilitiesKey,
  GoldKey,
  LoopKey,
  ManaAddedKey,
  ManaKey,
  ProgressVarsKey,
  QueueKey,
  RegularVarsKey,
  type LooperTunables,
} from '../modules';
import { buildLooperSimEngine } from './bot';

// ─── Per-loop sampler ────────────────────────────────────────────────────

/**
 * Subscribes to `loop.beforeRestart` and pushes one record per loop. Bypasses
 * the bot's LoopLog (capped at 32 entries) so probes can find threshold loops
 * past that horizon. Snapshot is taken at end-of-loop, before retention runs,
 * so persistent refs reflect the just-finished loop's gains.
 */
interface PerLoopSample {
  loopNumber: number;
  loopElapsed: number;
  manaAdded: number;
  maxTalentLevel: number;
}

function attachPerLoopSampler(engine: Engine): PerLoopSample[] {
  const loop = engine.tryInject(LoopKey)!;
  const capabilities = engine.tryInject(CapabilitiesKey)!;
  const manaAdded = engine.tryInject(ManaAddedKey)!;
  const samples: PerLoopSample[] = [];
  loop.on('beforeRestart', () => {
    let maxTL = 0;
    for (const e of capabilities.getAll()) {
      const tl = Number(e.state.talent.level.value);
      if (tl > maxTL) maxTL = tl;
    }
    samples.push({
      loopNumber: loop.count.value,
      loopElapsed: loop.elapsed.value,
      manaAdded: Number(manaAdded.value),
      maxTalentLevel: maxTL,
    });
  });
  return samples;
}

// ─── Probe: manapot-perceptibility ──────────────────────────────────────

const MANAPOT_BASELINE_PERLEVEL = 5; // matches roam:cache default in data/progress-vars.ts
const MANAPOT_GROWTH_LOOPS = 3;
const MANAPOT_GROWTH_THRESHOLD_PCT = 10;
const MANAPOT_PROBE_DURATION_S = 30 * 60;

interface ManapotRow {
  perLevelMult: number;
  baselineLoop: number;
  baselineMana: number;
  comparedLoop: number;
  comparedMana: number;
  growthPct: number;
  passed: boolean;
  note: string;
}

function runManapotProbe(perLevelMult: number): ManapotRow {
  const perLevel = MANAPOT_BASELINE_PERLEVEL * perLevelMult;
  const tunableScope: Partial<LooperTunables> = {
    'progressVars/roam/scales/cache/perLevel': () => perLevel,
  };
  const engine = buildLooperSimEngine(undefined, { tunableScope });
  const samples = attachPerLoopSampler(engine);
  runUntil({
    engine,
    until: () => false,
    maxSimTime: MANAPOT_PROBE_DURATION_S,
    tickDelta: 1,
  });

  const baselineIdx = samples.findIndex((s) => s.manaAdded > 0);
  if (baselineIdx === -1) {
    return {
      perLevelMult,
      baselineLoop: -1,
      baselineMana: 0,
      comparedLoop: -1,
      comparedMana: 0,
      growthPct: 0,
      passed: false,
      note: `no loop with manaAdded > 0 across ${samples.length} loops`,
    };
  }
  const comparedIdx = baselineIdx + MANAPOT_GROWTH_LOOPS;
  if (comparedIdx >= samples.length) {
    return {
      perLevelMult,
      baselineLoop: samples[baselineIdx].loopNumber,
      baselineMana: samples[baselineIdx].manaAdded,
      comparedLoop: -1,
      comparedMana: 0,
      growthPct: 0,
      passed: false,
      note: `only ${samples.length - baselineIdx - 1} loops after baseline (need ${MANAPOT_GROWTH_LOOPS})`,
    };
  }
  const baselineMana = samples[baselineIdx].manaAdded;
  const comparedMana = samples[comparedIdx].manaAdded;
  const growthPct = baselineMana === 0 ? 0 : (comparedMana / baselineMana - 1) * 100;
  return {
    perLevelMult,
    baselineLoop: samples[baselineIdx].loopNumber,
    baselineMana,
    comparedLoop: samples[comparedIdx].loopNumber,
    comparedMana,
    growthPct,
    passed: growthPct >= MANAPOT_GROWTH_THRESHOLD_PCT,
    note: '',
  };
}

// ─── Probe: cost-reduction-perceptibility ────────────────────────────────

const TALENT_BASELINE_RATIO = 0.01; // matches data baseline
const COST_REDUCTION_PROBE_DURATION_S = 60 * 60;
const COST_REDUCTION_TICK_DELTA = 0.1; // sub-second resolution on loopElapsed

interface CostReductionRow {
  talentAccrualRatio: number;
  thresholdLoop: number;
  preElapsed: number;
  postElapsed: number;
  speedupPct: number;
  passed: boolean;
  note: string;
}

function runCostReductionProbe(talentAccrualRatio: number): CostReductionRow {
  const tunableScope: Partial<LooperTunables> = {
    'balance/talentAccrualRatio': () => talentAccrualRatio,
  };
  const engine = buildLooperSimEngine(undefined, { tunableScope });
  const samples = attachPerLoopSampler(engine);
  runUntil({
    engine,
    until: () => false,
    maxSimTime: COST_REDUCTION_PROBE_DURATION_S,
    tickDelta: COST_REDUCTION_TICK_DELTA,
  });

  const thresholdIdx = samples.findIndex((s) => s.maxTalentLevel >= 1);
  if (thresholdIdx === -1) {
    return {
      talentAccrualRatio,
      thresholdLoop: -1,
      preElapsed: 0,
      postElapsed: 0,
      speedupPct: 0,
      passed: false,
      note: `no capability reached talent.level ≥ 1 across ${samples.length} loops`,
    };
  }
  if (thresholdIdx + 1 >= samples.length) {
    return {
      talentAccrualRatio,
      thresholdLoop: samples[thresholdIdx].loopNumber,
      preElapsed: samples[thresholdIdx].loopElapsed,
      postElapsed: 0,
      speedupPct: 0,
      passed: false,
      note: 'threshold loop is final loop in sample',
    };
  }
  const preElapsed = samples[thresholdIdx].loopElapsed;
  const postElapsed = samples[thresholdIdx + 1].loopElapsed;
  const speedupPct = preElapsed === 0 ? 0 : (1 - postElapsed / preElapsed) * 100;
  return {
    talentAccrualRatio,
    thresholdLoop: samples[thresholdIdx].loopNumber,
    preElapsed,
    postElapsed,
    speedupPct,
    passed: postElapsed < preElapsed,
    note: '',
  };
}

// ─── Probe: loop-reset-correctness ───────────────────────────────────────

const RESET_PROBE_LOOPS = 5;
const RESET_PROBE_MAX_SEC = 60 * 60;

type FindingKind = 'should-be-zero' | 'should-be-retained' | 'queue-empty' | 'mana-mismatch';

interface ResetFinding {
  loop: number;
  kind: FindingKind;
  detail: string;
}

interface ResetSnapshot {
  loop: number;
  // persistent (must be ≥ pre across restart)
  talentXp: Map<string, number>;
  timesCompleted: Map<string, number>;
  progressVarXp: Map<string, number>;
  regularVarTotal: Map<string, number>;
  // per-loop (must be zero post-restart)
  levelXp: Map<string, number>;
  actionProgress: Map<string, number>;
  regularVarChecked: Map<string, number>;
  gold: number;
  mana: number;
  // bot regenerates the queue on afterRestart; check non-empty post.
  queueLen: number;
}

function snapshotEngine(engine: Engine): ResetSnapshot {
  const loop = engine.tryInject(LoopKey)!;
  const mana = engine.tryInject(ManaKey)!;
  const gold = engine.tryInject(GoldKey)!;
  const capabilities = engine.tryInject(CapabilitiesKey)!;
  const actions = engine.tryInject(ActionsKey)!;
  const progressVars = engine.tryInject(ProgressVarsKey)!;
  const regularVars = engine.tryInject(RegularVarsKey)!;
  const queue = engine.tryInject(QueueKey)!;

  return {
    loop: loop.count.value,
    talentXp: new Map(
      capabilities.getAll().map((e) => [e.def.id, Number(e.state.talent.xp.value)]),
    ),
    timesCompleted: new Map(
      actions.getAll().map((d) => [d.id, actions.getState(d.id)!.timesCompleted.value]),
    ),
    progressVarXp: new Map(
      progressVars.getAll().map((e) => [e.def.id, Number(e.state.level.xp.value)]),
    ),
    regularVarTotal: new Map(regularVars.getAll().map((s) => [s.def.id, Number(s.total.value)])),
    levelXp: new Map(capabilities.getAll().map((e) => [e.def.id, Number(e.state.level.xp.value)])),
    actionProgress: new Map(
      actions.getAll().map((d) => [d.id, Number(actions.getState(d.id)!.progress.value)]),
    ),
    regularVarChecked: new Map(regularVars.getAll().map((s) => [s.def.id, s.checked.value])),
    gold: Number(gold.value),
    mana: Number(mana.value),
    queueLen: queue.items.value.length,
  };
}

function diffSnapshots(pre: ResetSnapshot, post: ResetSnapshot): ResetFinding[] {
  const findings: ResetFinding[] = [];
  const loopNum = post.loop;

  // Per-loop refs must be zero/initial post-restart.
  for (const [id, xp] of post.levelXp) {
    if (xp !== 0) {
      findings.push({
        loop: loopNum,
        kind: 'should-be-zero',
        detail: `capability/${id}/level.xp = ${xp} (expected 0)`,
      });
    }
  }
  for (const [id, prog] of post.actionProgress) {
    if (prog !== 0) {
      findings.push({
        loop: loopNum,
        kind: 'should-be-zero',
        detail: `action/${id}/progress = ${prog} (expected 0)`,
      });
    }
  }
  for (const [id, checked] of post.regularVarChecked) {
    if (checked !== 0) {
      findings.push({
        loop: loopNum,
        kind: 'should-be-zero',
        detail: `regularVar/${id}/checked = ${checked} (expected 0)`,
      });
    }
  }
  if (post.gold !== 0) {
    findings.push({
      loop: loopNum,
      kind: 'should-be-zero',
      detail: `gold = ${post.gold} (expected 0)`,
    });
  }

  // Persistent refs must be ≥ pre-restart values.
  const checkRetained = (
    map: 'talentXp' | 'timesCompleted' | 'progressVarXp' | 'regularVarTotal',
    label: string,
  ): void => {
    for (const [id, postVal] of post[map]) {
      const preVal = pre[map].get(id) ?? 0;
      if (postVal < preVal) {
        findings.push({
          loop: loopNum,
          kind: 'should-be-retained',
          detail: `${label}/${id} dropped from ${preVal} to ${postVal}`,
        });
      }
    }
  };
  checkRetained('talentXp', 'capability.talent.xp');
  checkRetained('timesCompleted', 'action.timesCompleted');
  checkRetained('progressVarXp', 'progressVar.xp');
  checkRetained('regularVarTotal', 'regularVar.total');

  // Bot's applyPlan should have re-enqueued for the next loop.
  if (post.queueLen === 0) {
    findings.push({
      loop: loopNum,
      kind: 'queue-empty',
      detail: 'queue empty after restart — bot did not regenerate plan',
    });
  }

  return findings;
}

interface ResetReport {
  loopsRun: number;
  findings: ResetFinding[];
  initialMana: number;
}

function runLoopResetProbe(): ResetReport {
  const engine = buildLooperSimEngine();
  const loop = engine.tryInject(LoopKey)!;
  const mana = engine.tryInject(ManaKey)!;
  const initialMana = Number(mana.value); // mana === initialMana at start
  const findings: ResetFinding[] = [];
  let preRestart: ResetSnapshot | null = null;

  loop.on('beforeRestart', () => {
    preRestart = snapshotEngine(engine);
  });
  loop.on('afterRestart', () => {
    if (!preRestart) return;
    const post = snapshotEngine(engine);
    findings.push(...diffSnapshots(preRestart, post));
    if (Math.abs(post.mana - initialMana) > 0.0001) {
      findings.push({
        loop: post.loop,
        kind: 'mana-mismatch',
        detail: `mana = ${post.mana} (expected ${initialMana})`,
      });
    }
    preRestart = null;
  });

  runUntil({
    engine,
    until: () => loop.count.value >= RESET_PROBE_LOOPS,
    maxSimTime: RESET_PROBE_MAX_SEC,
    tickDelta: 1,
  });

  return { loopsRun: loop.count.value, findings, initialMana };
}

// ─── Reporter ────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (!isFinite(n)) return '∞';
  if (Math.abs(n) >= 1e6) return n.toExponential(3);
  if (Math.abs(n) >= 100) return n.toFixed(1);
  return n.toFixed(2);
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

function main(): void {
  const t0 = Date.now();

  console.log('# Looper sim-driven probes (manapot + cost-reduction + loop-reset)\n');
  console.log(`Run at ${new Date().toISOString()}\n`);

  // ─── Probe 1 ────────────────────────────────────────────────────────────
  console.log('## Probe — manapot-perceptibility (beats 3, 4)\n');
  console.log(
    `Sweep: progressVars/roam/scales/cache/perLevel × {0.75, 1.0, 1.25} of baseline ${MANAPOT_BASELINE_PERLEVEL}.`,
  );
  console.log(
    `Compare loop[baseline+${MANAPOT_GROWTH_LOOPS}].manaAdded vs loop[baseline].manaAdded; pass requires ≥${MANAPOT_GROWTH_THRESHOLD_PCT}% growth.\n`,
  );
  const manapotRows = [0.75, 1.0, 1.25].map(runManapotProbe);
  console.log(
    renderTable(
      ['perLevel ×', 'base loop', 'base mana', 'cmp loop', 'cmp mana', 'growth %', 'pass', 'note'],
      manapotRows.map((r) => [
        `${r.perLevelMult.toFixed(2)}x`,
        r.baselineLoop === -1 ? '—' : String(r.baselineLoop),
        fmtNum(r.baselineMana),
        r.comparedLoop === -1 ? '—' : String(r.comparedLoop),
        fmtNum(r.comparedMana),
        r.growthPct.toFixed(1),
        r.passed ? 'yes' : 'NO',
        r.note,
      ]),
    ),
  );
  console.log();

  // ─── Probe 2 ────────────────────────────────────────────────────────────
  console.log('## Probe — cost-reduction-perceptibility (beat 6)\n');
  console.log(
    `Sweep: balance/talentAccrualRatio × {0.5, 1.0, 2.0} of baseline ${TALENT_BASELINE_RATIO}.`,
  );
  console.log(
    `Compare loopElapsed of first loop with talent.level ≥ 1 vs the next loop; pass requires post < pre.\n`,
  );
  const costRows = [0.5, 1.0, 2.0].map((mult) =>
    runCostReductionProbe(TALENT_BASELINE_RATIO * mult),
  );
  console.log(
    renderTable(
      ['ratio', 'thresh loop', 'pre elapsed', 'post elapsed', 'speedup %', 'pass', 'note'],
      costRows.map((r) => [
        r.talentAccrualRatio.toFixed(4),
        r.thresholdLoop === -1 ? '—' : String(r.thresholdLoop),
        fmtNum(r.preElapsed),
        fmtNum(r.postElapsed),
        r.speedupPct.toFixed(1),
        r.passed ? 'yes' : 'NO',
        r.note,
      ]),
    ),
  );
  console.log();

  // ─── Probe 3 ────────────────────────────────────────────────────────────
  console.log('## Probe — loop-reset-correctness (5 loops)\n');
  const resetReport = runLoopResetProbe();
  console.log(`Loops completed: ${resetReport.loopsRun}`);
  console.log(`initialMana baseline: ${resetReport.initialMana}`);
  if (resetReport.findings.length === 0) {
    console.log('Findings: none — per-loop reset and persistent retention hold.\n');
  } else {
    console.log(`Findings: ${resetReport.findings.length} state-drift event(s):\n`);
    console.log(
      renderTable(
        ['loop', 'kind', 'detail'],
        resetReport.findings.slice(0, 30).map((f) => [String(f.loop), f.kind, f.detail]),
      ),
    );
    if (resetReport.findings.length > 30) {
      console.log(`...and ${resetReport.findings.length - 30} more (truncated).`);
    }
    console.log();
  }

  // ─── Summary ────────────────────────────────────────────────────────────
  const allManapotPassed = manapotRows.every((r) => r.passed);
  const allCostPassed = costRows.every((r) => r.passed);
  const resetPassed =
    resetReport.findings.length === 0 && resetReport.loopsRun >= RESET_PROBE_LOOPS;
  console.log(
    `Summary — manapot: ${allManapotPassed ? 'pass' : 'FAIL'}; cost-reduction: ${allCostPassed ? 'pass' : 'FAIL'}; loop-reset: ${resetPassed ? 'pass' : 'FAIL'}.`,
  );
  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  // Touch Decimal so the import isn't pruned — the LoopLog deltas are Decimal
  // instances internally; coercing via Number() reads them safely.
  void Decimal;
}

main();
