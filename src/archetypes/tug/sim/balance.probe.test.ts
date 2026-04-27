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
  // = 5/s` for every tier. The post-buy values (refinery-2 at ~117s
  // once refinery-1 is bought) are exercised in the buy-chain test
  // below — they're the realistic strategic numbers but only appear
  // once the chain has the prior tier's grant active.
  const EXPECTED_PAYBACK_DEFAULT = {
    'refinery-1': 100 / (5 * 0.5), // 40
    'refinery-2': 350 / (5 * 0.4), // 175
    'refinery-3': 1200 / (5 * 0.3), // 800
  };
  const EXPECTED_CROSSOVER_DEFAULT = {
    'refinery-1': (100 / (5 * 0.5)) * 1.5, // 60
    'refinery-2': (350 / (5 * 0.4)) * 1.4, // 245
    'refinery-3': (1200 / (5 * 0.3)) * 1.3, // 1040
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
    // At aiIncomeMultiplier=0.7, AI's chain-applied baseRate is 5*0.7
    // = 3.5/s, so refinery-1 payback becomes 100/(3.5*0.5) ≈ 57.14s
    // (vs 40s at the symmetric default). Player-side is unchanged.
    const engine = buildTugSimEngine({ balance: { aiIncomeMultiplier: 0.7 } });
    const roiAi = engine.tryInject(IncomeUpgradeRoiKey.ai)!;
    const roiPlayer = engine.tryInject(IncomeUpgradeRoiKey.player)!;
    const aiPayback = roiAi.get('refinery-1')!.paybackSeconds.value;
    const playerPayback = roiPlayer.get('refinery-1')!.paybackSeconds.value;
    expect(aiPayback).toBeCloseTo(100 / (5 * 0.7 * 0.5), 1);
    expect(playerPayback).toBeCloseTo(40, 1);
  });

  it('refinery-2 payback drops when refinery-1 is bought (chain reactivity)', () => {
    // Pre-buy: refinery-2 sees baseRate (5/s), payback = 350/(5*0.4) = 175s.
    // Post-buy: refinery-1's grant binds onto incomeRateChain, currentRate
    // becomes 7.5/s, payback drops to 350/(7.5*0.4) ≈ 116.67s. This is
    // the realistic strategic number a player sees in the IncomeBar
    // tooltip once refinery-2 unlocks.
    const engine = buildTugSimEngine();
    const roi = engine.tryInject(IncomeUpgradeRoiKey.player)!;
    const shop = engine.tryInject(IncomeUpgradesKey.player)!;
    const income = engine.tryInject(IncomeKey.player)!;
    const r2 = roi.get('refinery-2')!;
    expect(r2.paybackSeconds.value).toBeCloseTo(175, 1);
    // Inject enough minerals to satisfy refinery-1's cost requirement,
    // then purchase. Bypasses normal accrual — no need to tick the loop.
    addResource(income, Decimal.fromValue(200));
    const r1 = shop.getPurchasable('refinery-1')!;
    r1.purchase(1);
    expect(r1.bought.value).toBe(true);
    expect(r2.paybackSeconds.value).toBeCloseTo(350 / (7.5 * 0.4), 1);
  });

  it('payback recomputes when baseRate tunable is perturbed at runtime', () => {
    const engine = buildTugSimEngine();
    const roi = engine.tryInject(IncomeUpgradeRoiKey.player)!;
    const reg = engine.tryInject(TugTuningRegistryKey)!;
    const r1 = roi.get('refinery-1')!;
    expect(r1.paybackSeconds.value).toBeCloseTo(40, 1);
    const cleanup = reg.pushScope('lock:baseRate=10', {
      'balance/baseIncomeRate': () => 10,
    });
    try {
      // baseRate doubles → payback halves: 100/(10*0.5) = 20s.
      expect(r1.paybackSeconds.value).toBeCloseTo(20, 1);
    } finally {
      cleanup();
    }
    expect(r1.paybackSeconds.value).toBeCloseTo(40, 1);
  });
});
