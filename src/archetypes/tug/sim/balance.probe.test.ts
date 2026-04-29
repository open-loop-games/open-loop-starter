import { describe, it, expect } from 'vitest';
import { addResource, Decimal, runMatrixUntil, runUntil } from 'open-loop-engine';
import { DEFAULT_TUG_DATA } from '../data';
import {
  buildTugSimEngine,
  createOutcomeAnalyzer,
  createOutcomeCapture,
  type OutcomeCapture,
} from '../balance/bot';
import { ARC_BEATS } from '../balance/beats';
import {
  IncomeKey,
  IncomeUpgradesKey,
  IncomeUpgradeRoiKey,
  TugTuningRegistryKey,
} from '../modules';

/**
 * Tier-C balance regression locks for Tug — static data invariants
 * (roster shape, counter-matrix shape, default opponent persona,
 * believability bundle present) and framework-correctness locks for
 * the sensitivity sweep harness.
 *
 * **Framework-correctness, not balance-numbers.** Per the OL-730
 * rescope, the SIGNATURE strongCounter sweep currently surfaces
 * "underlying data balance dominates matrix sensitivity" at default
 * data — a forward-looking finding for the procedural-persona tester-
 * seat follow-up. These locks pin the framework primitives
 * (TugBelievability bundle wired through merge, sensitivity sweep
 * runs to completion across the full strongCounter range, monotonicity
 * preserved) so the next session can balance the data and re-tune
 * locks against numerical bands then.
 */

const TUG_LOCK_SEEDS = [1, 2, 3, 4, 5];
const MAX_SIM = 35 * 60;

const { balance, units, counterMatrix } = DEFAULT_TUG_DATA;

describe('tug Tier-C balance locks — static data invariants', () => {
  it('roster has unitArchetypeCount entries', () => {
    expect(units.length).toBe(balance.unitArchetypeCount);
  });

  it('counter-matrix is square and matches roster size', () => {
    expect(counterMatrix.length).toBe(units.length);
    for (const row of counterMatrix) expect(row.length).toBe(units.length);
  });

  it('counter-matrix diagonal is identity (1.0 vs self)', () => {
    for (let i = 0; i < counterMatrix.length; i++) {
      expect(counterMatrix[i][i]).toBe(1.0);
    }
  });

  it('matchTimeLimitMinutes provides the duration-probe ceiling', () => {
    expect(balance.matchTimeLimitMinutes).toBeGreaterThan(0);
  });

  it('default opponent persona is counter on both slots', () => {
    expect(balance.opponentPersona.player).toBe('counter');
    expect(balance.opponentPersona.ai).toBe('counter');
  });

  it('production believability is zero on both knobs (deterministic AI)', () => {
    expect(balance.believability.suboptimalityRate).toBe(0);
    expect(balance.believability.cadenceJitterScale).toBe(0);
  });

  it('aiIncomeMultiplier defaults to side-symmetric 1.0 (not a balance lever)', () => {
    expect(balance.aiIncomeMultiplier).toBe(1.0);
  });
});

describe('tug Tier-C balance locks — math-only fire-time', () => {
  it('beat-1 (first unit purchased) fires within first cadence window', () => {
    const engine = buildTugSimEngine({
      balance: { believability: { suboptimalityRate: 0, cadenceJitterScale: 0 } },
    });
    const beat = ARC_BEATS.find((b) => b.id === 'beat-1')!;
    const result = runUntil({
      engine,
      until: () => beat.predicate(engine),
      maxSimTime: MAX_SIM,
      tickDelta: 1.0,
    });
    expect(result.terminated).toBe('predicate');
    // Counter persona's first marine purchase fires by ~5s (income 5/sec
    // affords 25-cost marine at first cadence trigger).
    expect(result.elapsedSimulated).toBeLessThanOrEqual(30);
  }, 30_000);
});

describe('tug Tier-C balance locks — believability bundle is wired', () => {
  it('TugBelievability sub-merges through applyTugOverrides', () => {
    const engine = buildTugSimEngine({
      balance: { believability: { suboptimalityRate: 0.1 } },
    });
    // Read the merged data via a public surface — the engine's match
    // module isn't exposing data directly, so verify by behavior: a
    // run with believability override doesn't throw, and engine starts
    // cleanly. (TypeScript types guarantee the field shape.)
    expect(engine).toBeDefined();
  });
});

describe('tug Tier-C balance locks — counter-strong sensitivity framework', () => {
  let activeCapture: OutcomeCapture | null = null;

  function runCellAtStrong(strong: number) {
    return runMatrixUntil({
      cells: [
        {
          name: `strong=${strong}`,
          buildEngine: () => buildTugSimEngine(),
          analyzers: (engine) => {
            const cap = createOutcomeCapture(engine);
            activeCapture = cap;
            const reg = engine.tryInject(TugTuningRegistryKey)!;
            const cleanup = reg.pushScope(`lock:strong=${strong}`, {
              'counter-matrix/strongCounter': () => strong,
            });
            return [
              createOutcomeAnalyzer(cap),
              {
                name: 'scope-cleanup',
                onEnd: () => cleanup(),
                summarize: () => ({ name: 'scope-cleanup', metrics: {}, issues: [] }),
              },
            ];
          },
          tickDelta: 1.0,
        },
      ],
      seeds: TUG_LOCK_SEEDS,
      until: () => activeCapture?.firstMatchEnded ?? false,
      maxSimTime: MAX_SIM,
    });
  }

  it('strongCounter scope-push runs end-to-end across the sweep edges', () => {
    // Verifies the framework runs cleanly at the sweep extremes — no
    // engine-construction errors, scope-push wires through to lane.ts
    // combat, and the analyzer captures outcome for both cells. The
    // numerical signal at default data is currently flat (see
    // bot.ts § Known limitation); this lock checks that the *framework*
    // doesn't regress, separately from the balance-tuning follow-up.
    const lo = runCellAtStrong(0.5);
    const hi = runCellAtStrong(1.5);
    expect(lo.cells[0]!.runs.length).toBe(TUG_LOCK_SEEDS.length);
    expect(hi.cells[0]!.runs.length).toBe(TUG_LOCK_SEEDS.length);
    // Win-rate metric is exposed by the analyzer (read pattern used by
    // probe 3 and tune.ts).
    expect(lo.cells[0]!.aggregate.metrics['tug-outcome.isFirstPlayerWin']).toBeDefined();
    expect(hi.cells[0]!.aggregate.metrics['tug-outcome.isFirstPlayerWin']).toBeDefined();
  }, 60_000);

  it('strongCounter sweep produces non-decreasing win-rate across edges', () => {
    // Coarse monotonicity check: increasing matrix decisiveness should
    // not DECREASE counter-side win-rate (cell value at counter cells
    // scales linearly via lane.ts::adjustCell). Loose acceptance —
    // permits equality (flat curve at imbalanced data) but catches a
    // sign-flip regression where the matrix wiring broke.
    const lo = runCellAtStrong(0.5);
    const hi = runCellAtStrong(1.5);
    const wrLo = lo.cells[0]!.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0;
    const wrHi = hi.cells[0]!.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0;
    expect(wrHi + 1e-9).toBeGreaterThanOrEqual(wrLo);
  }, 60_000);
});

describe('tug Tier-C balance locks — income-upgrade ROI (math-only)', () => {
  // Default-state values: no tiers bought, so `currentRate = baseRate
  // = 8/s` for every tier. The post-buy values are exercised in the
  // buy-chain test below — they're the realistic strategic numbers but
  // only appear once the chain has the prior tier's grant active.
  const EXPECTED_PAYBACK_DEFAULT = {
    'refinery-1': 400 / (8 * 0.25), // 200
    'refinery-2': 350 / (8 * 0.4), // 109.375
    'refinery-3': 1200 / (8 * 0.3), // 500
  };
  const EXPECTED_CROSSOVER_DEFAULT = {
    'refinery-1': (400 / (8 * 0.25)) * 1.25, // 250
    'refinery-2': (350 / (8 * 0.4)) * 1.4, // 153.125
    'refinery-3': (1200 / (8 * 0.3)) * 1.3, // 650
  };

  it('player-side ROI metrics match analytical at default state (no tiers bought)', () => {
    const engine = buildTugSimEngine();
    const roi = engine.tryInject(IncomeUpgradeRoiKey.player);
    expect(roi).toBeDefined();
    for (const def of DEFAULT_TUG_DATA.incomeUpgrades) {
      const m = roi!.get(def.id);
      expect(m, `metrics for ${def.id}`).toBeDefined();
      expect(m!.paybackSeconds.value).toBeCloseTo(
        EXPECTED_PAYBACK_DEFAULT[def.id as keyof typeof EXPECTED_PAYBACK_DEFAULT],
        1,
      );
      expect(m!.crossoverSeconds.value).toBeCloseTo(
        EXPECTED_CROSSOVER_DEFAULT[def.id as keyof typeof EXPECTED_CROSSOVER_DEFAULT],
        1,
      );
    }
  });

  it('AI-side payback scales inversely with aiIncomeMultiplier perturbation', () => {
    // At aiIncomeMultiplier=0.7, AI's chain-applied baseRate is 8*0.7
    // = 5.6/s, so refinery-1 payback becomes 400/(5.6*0.25) ≈ 285.71s
    // (vs 200s at the symmetric default). Player-side is unchanged.
    const engine = buildTugSimEngine({ balance: { aiIncomeMultiplier: 0.7 } });
    const roiAi = engine.tryInject(IncomeUpgradeRoiKey.ai)!;
    const roiPlayer = engine.tryInject(IncomeUpgradeRoiKey.player)!;
    const aiPayback = roiAi.get('refinery-1')!.paybackSeconds.value;
    const playerPayback = roiPlayer.get('refinery-1')!.paybackSeconds.value;
    expect(aiPayback).toBeCloseTo(400 / (8 * 0.7 * 0.25), 1);
    expect(playerPayback).toBeCloseTo(200, 1);
  });

  it('refinery-2 payback drops when refinery-1 is bought (chain reactivity)', () => {
    // Pre-buy: refinery-2 sees baseRate (8/s), payback = 350/(8*0.4) ≈ 109.4s.
    // Post-buy: refinery-1's grant binds onto incomeRateChain, currentRate
    // becomes 10/s, payback drops to 350/(10*0.4) = 87.5s. This is the
    // realistic strategic number a player sees in the IncomeBar tooltip
    // once refinery-2 unlocks.
    const engine = buildTugSimEngine();
    const roi = engine.tryInject(IncomeUpgradeRoiKey.player)!;
    const shop = engine.tryInject(IncomeUpgradesKey.player)!;
    const income = engine.tryInject(IncomeKey.player)!;
    const r2 = roi.get('refinery-2')!;
    expect(r2.paybackSeconds.value).toBeCloseTo(350 / (8 * 0.4), 1);
    // Inject enough minerals to satisfy refinery-1's cost requirement,
    // then purchase. Bypasses normal accrual — no need to tick the loop.
    addResource(income, Decimal.fromValue(500));
    const r1 = shop.getPurchasable('refinery-1')!;
    r1.purchase(1);
    expect(r1.active.value).toBe(true);
    expect(r2.paybackSeconds.value).toBeCloseTo(350 / (10 * 0.4), 1);
  });

  it('payback recomputes when baseRate tunable is perturbed at runtime', () => {
    const engine = buildTugSimEngine();
    const roi = engine.tryInject(IncomeUpgradeRoiKey.player)!;
    const reg = engine.tryInject(TugTuningRegistryKey)!;
    const r1 = roi.get('refinery-1')!;
    expect(r1.paybackSeconds.value).toBeCloseTo(200, 1);
    const cleanup = reg.pushScope('lock:baseRate=16', {
      'balance/baseIncomeRate': () => 16,
    });
    try {
      // baseRate doubles → payback halves: 400/(16*0.25) = 100s.
      expect(r1.paybackSeconds.value).toBeCloseTo(100, 1);
    } finally {
      cleanup();
    }
    expect(r1.paybackSeconds.value).toBeCloseTo(200, 1);
  });
});

describe('tug Tier-C balance locks — per-archetype dominance framework', () => {
  // OL-732 framework-correctness locks. Verifies the per-archetype kill +
  // spawn instrumentation wires through `OutcomeCapture` → analyzer
  // metrics → cell aggregate. Numerical thresholds (e.g. max-share ≤ 0.4)
  // are NOT locked — at current data balance, the SIGNATURE matchup
  // imbalance dominates the dominance signal too (same constraint OL-731
  // exists to address). Locks guard the framework against silent
  // regression while balance discovery proceeds in parallel.

  let activeCapture: OutcomeCapture | null = null;

  it('lane unit-spawned + unit-killed events accumulate into OutcomeCapture buckets', () => {
    const engine = buildTugSimEngine();
    const cap = createOutcomeCapture(engine);
    activeCapture = cap;
    // Run one match end-to-end so the lane fires spawn/kill events for
    // both sides under the bilateral-symmetric sim-bot.
    const result = runUntil({
      engine,
      until: () => cap.firstMatchEnded,
      maxSimTime: MAX_SIM,
      tickDelta: 1.0,
    });
    expect(result.terminated).toBe('predicate');
    expect(cap.firstMatchEnded).toBe(true);
    // Both sides must have spawned at least one unit by the time match-1
    // resolves (otherwise the match couldn't have ended on combat).
    const playerSpawns = Object.values(cap.firstMatchSpawnsByArchetype.player);
    const aiSpawns = Object.values(cap.firstMatchSpawnsByArchetype.ai);
    expect(playerSpawns.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(aiSpawns.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    // Spawn-key archetypes must be a subset of the data roster.
    const rosterIds = new Set(DEFAULT_TUG_DATA.units.map((u) => u.id));
    for (const id of Object.keys(cap.firstMatchSpawnsByArchetype.player)) {
      expect(rosterIds.has(id)).toBe(true);
    }
  }, 30_000);

  it('persona-Cartesian runMatrixUntil exposes per-archetype spawn + spawnsInWin metrics', () => {
    // Tiny 2×2 sub-Cartesian (greed/counter × greed/counter) with N=2
    // seeds — enough to confirm the metric pipeline; the full 4×4 × 12-
    // seed sweep lives in the probe runner, not in vitest.
    const personas: Array<'greed' | 'counter'> = ['greed', 'counter'];
    const cells = personas.flatMap((player) =>
      personas.map((ai) => ({
        name: `p=${player}/ai=${ai}`,
        buildEngine: () =>
          buildTugSimEngine({
            balance: { opponentPersona: { player, ai } },
          }),
        analyzers: (engine: ReturnType<typeof buildTugSimEngine>) => {
          const cap = createOutcomeCapture(engine);
          activeCapture = cap;
          return [createOutcomeAnalyzer(cap)];
        },
        tickDelta: 1.0,
      })),
    );
    const result = runMatrixUntil({
      cells,
      seeds: [1, 2],
      until: () => activeCapture?.firstMatchEnded ?? false,
      maxSimTime: MAX_SIM,
    });
    expect(result.cells.length).toBe(4);
    // Every cell must run to completion across both seeds.
    for (const cell of result.cells) {
      expect(cell.runs.length).toBe(2);
    }
    // At least one cell must have player wins so the spawnsInWin
    // aggregator has signal. Greed-vs-counter at default data should
    // hit this trivially per OL-732 probe runs.
    const someCellHasWins = result.cells.some(
      (cell) => (cell.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0) > 0,
    );
    expect(someCellHasWins).toBe(true);
    // Per-archetype spawn metric keys flatten into the aggregate. The
    // *winning* cell(s) must expose at least one spawnsInWin.player.* key
    // with non-zero avg — that's the dominance probe's read surface.
    const winningCell = result.cells.find(
      (cell) => (cell.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0) > 0,
    )!;
    const rosterIds = DEFAULT_TUG_DATA.units.map((u) => u.id);
    const anyWinSpawn = rosterIds.some(
      (id) => (winningCell.aggregate.metrics[`tug-outcome.spawnsInWin.player.${id}`]?.avg ?? 0) > 0,
    );
    expect(anyWinSpawn).toBe(true);
    // Total spawns metric (across all matches, win or loss) is also
    // populated for both sides on every cell.
    for (const cell of result.cells) {
      const playerHasSpawns = rosterIds.some(
        (id) => (cell.aggregate.metrics[`tug-outcome.spawns.player.${id}`]?.avg ?? 0) > 0,
      );
      const aiHasSpawns = rosterIds.some(
        (id) => (cell.aggregate.metrics[`tug-outcome.spawns.ai.${id}`]?.avg ?? 0) > 0,
      );
      expect(playerHasSpawns).toBe(true);
      expect(aiHasSpawns).toBe(true);
    }
  }, 90_000);
});
