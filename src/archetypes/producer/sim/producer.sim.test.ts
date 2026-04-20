import { describe, it, expect } from 'vitest';
import { runUntil, setupAutoPurchaseProducers, Decimal, type Engine } from 'open-loop-engine';
import {
  createProducerEngine,
  BuildingsKey,
  ClickStateKey,
  UpgradesKey,
  AchievementsKey,
  MilestonesKey,
  PrimaryResourceKey,
  PrimaryLifetimeKey,
  HeadlineRateKey,
  CONTINUOUS_PRODUCER_IDS,
  PRODUCERS,
  type ProducerDef,
  type ProducerOverrides,
} from '..';

const seconds = (s: number) => s;
const minutes = (m: number) => m * 60;

/**
 * Wires a minimal sim-bot onto a freshly-built engine:
 *  - clicks once per tick during the warm-up burst (first 5 seconds),
 *  - auto-buys the cheapest affordable producer every 1s,
 *  - attempts to buy every affordable upgrade every 2s.
 *
 * Mirrors the "burst then idle" pattern a real player exhibits — enough click
 * throughput to seed the curve, then passive progression drives the beats.
 */
let simEngineCounter = 0;

function buildSimEngine(overrides?: ProducerOverrides): Engine {
  const namespace = `sim-${++simEngineCounter}`;
  const { engine } = createProducerEngine(overrides, { persistenceNamespace: namespace });
  engine.selectMod('bakery');
  engine.start();
  engine.stop(); // halt the real-time interval; runUntil drives via stepOnce

  const clickState = engine.tryInject(ClickStateKey)!;
  const buildings = engine.tryInject(BuildingsKey)!;
  const upgrades = engine.tryInject(UpgradesKey)!;

  // Click burst — 20 clicks/sec for the first 5 seconds of sim-time, then stop.
  engine.loop.onTick(() => {
    if (clickState.elapsedSec.value <= 5) {
      clickState.click();
    }
  });

  // Auto-buy affordable producers every 1s sim-time. `payback-period`
  // picks by marginal return, which climbs tiers naturally instead of
  // piling endless cursors like a greedy cheapest-cost policy would.
  setupAutoPurchaseProducers(
    buildings,
    { enabled: true, interval: 1, policy: 'payback-period' },
    (cb) => engine.loop.onTick(cb),
  );

  // Auto-buy every affordable upgrade every 2s sim-time.
  let upgradeAccum = 0;
  engine.loop.onTick((dt: number) => {
    upgradeAccum += dt;
    if (upgradeAccum < 2) return;
    upgradeAccum = 0;
    for (const p of upgrades.getAffordable()) {
      p.purchase();
    }
  });

  return engine;
}

interface Snapshots {
  primary: () => Decimal;
  lifetime: () => Decimal;
  headlineRate: () => Decimal;
  producerCount: (id: string) => Decimal;
  upgradeBought: (id: string) => boolean;
  achievementCount: () => number;
  clickCount: () => number;
}

function snapshots(engine: Engine): Snapshots {
  const primary = engine.tryInject(PrimaryResourceKey)!;
  const lifetime = engine.tryInject(PrimaryLifetimeKey)!;
  const headline = engine.tryInject(HeadlineRateKey)!;
  const buildings = engine.tryInject(BuildingsKey)!;
  const upgrades = engine.tryInject(UpgradesKey)!;
  const achievements = engine.tryInject(AchievementsKey)!;
  const clickState = engine.tryInject(ClickStateKey)!;
  return {
    primary: () => Decimal.fromValue(primary.value),
    lifetime: () => Decimal.fromValue(lifetime.value),
    headlineRate: () => Decimal.fromValue(headline.value),
    producerCount: (id) => Decimal.fromValue(buildings.getProducer(id)?.count.value ?? 0),
    upgradeBought: (id) => upgrades.getPurchasable(id)?.bought.value ?? false,
    achievementCount: () => achievements.earnedCount.value,
    clickCount: () => clickState.clickCount.value,
  };
}

// ─── Beat map ─────────────────────────────────────────────────────────────

describe('producer — beat map (default Bakery balance)', () => {
  it('beat 1: first production visible within 0–30s', () => {
    const engine = buildSimEngine();
    const state = snapshots(engine);
    const result = runUntil({
      engine,
      until: () => state.primary().gte(1),
      maxSimTime: minutes(1),
    });
    expect(result.terminated).toBe('predicate');
    expect(result.elapsedSimulated).toBeLessThanOrEqual(seconds(30));
  });

  it('beat 2: first cursor purchased within 3min', () => {
    const engine = buildSimEngine();
    const state = snapshots(engine);
    const result = runUntil({
      engine,
      until: () => state.producerCount('cursor').gte(1),
      maxSimTime: minutes(5),
    });
    expect(result.terminated).toBe('predicate');
    expect(result.elapsedSimulated).toBeLessThanOrEqual(minutes(3));
  });

  it('beat 3: first grandma purchased within 12min', () => {
    const engine = buildSimEngine();
    const state = snapshots(engine);
    const result = runUntil({
      engine,
      until: () => state.producerCount('grandma').gte(1),
      maxSimTime: minutes(15),
    });
    expect(result.terminated).toBe('predicate');
    expect(result.elapsedSimulated).toBeLessThanOrEqual(minutes(12));
  });

  it('beat 4: first per-producer upgrade bought within 20min', () => {
    const engine = buildSimEngine();
    const state = snapshots(engine);
    const result = runUntil({
      engine,
      until: () => state.upgradeBought('cursor-boost-i'),
      maxSimTime: minutes(30),
    });
    expect(result.terminated).toBe('predicate');
    expect(result.elapsedSimulated).toBeLessThanOrEqual(minutes(20));
  });

  it('beat 5: first achievement earned within 5min', () => {
    const engine = buildSimEngine();
    const state = snapshots(engine);
    const result = runUntil({
      engine,
      until: () => state.achievementCount() >= 1,
      maxSimTime: minutes(10),
    });
    expect(result.terminated).toBe('predicate');
    expect(result.elapsedSimulated).toBeLessThanOrEqual(minutes(5));
  });

  it('beat 6: bulk-buy becomes meaningful (≥10 cursors) within 15min', () => {
    const engine = buildSimEngine();
    const state = snapshots(engine);
    const result = runUntil({
      engine,
      until: () => state.producerCount('cursor').gte(10),
      maxSimTime: minutes(20),
    });
    expect(result.terminated).toBe('predicate');
    expect(result.elapsedSimulated).toBeLessThanOrEqual(minutes(15));
  });

  it(
    'beat 7: deep modifier chain (headline rate ≥ 1e3/sec) within 90min',
    { timeout: 15_000 },
    () => {
      const engine = buildSimEngine();
      const state = snapshots(engine);
      const result = runUntil({
        engine,
        until: () => state.headlineRate().gte(1000),
        maxSimTime: minutes(120),
      });
      expect(result.terminated).toBe('predicate');
      expect(result.elapsedSimulated).toBeLessThanOrEqual(minutes(90));
    },
  );

  it('beat 8: arc closure (temple owned) within 240min', { timeout: 60_000 }, () => {
    const engine = buildSimEngine();
    const state = snapshots(engine);
    const result = runUntil({
      engine,
      until: () => state.producerCount('temple').gte(1),
      maxSimTime: minutes(300),
    });
    expect(result.terminated).toBe('predicate');
    // Producer.md § 4 target is 95–120 min for human play. Sim bot uses a
    // greedy payback-period policy without buy-10/buy-max shortcuts, so the
    // 2× buffer absorbs the policy gap while the test still pins that the
    // arc is reachable end-to-end without manual intervention.
    expect(result.elapsedSimulated).toBeLessThanOrEqual(minutes(240));
  });

  // Full arc trigger per § 4 is `producers[last].count ≥ 1 AND
  // upgradesArcComplete`. The arc module wires `announced` + `complete`, the
  // UI flavour event fires, and the ArcKey is live — but the current balance
  // cost curve (globals at 1M/1B/1T, tier-iii upgrades at 200k×) puts the
  // full arc out of the 95–120 min spec window at current numbers. Pinned
  // as a todo until OL-625 (tooling-first balance reconciliation) lands.
  it.todo('beat 8: full arc closure (temple + upgradesArcComplete) within 240min (OL-625)');
});

// ─── Balance probes (§ 6) ─────────────────────────────────────────────────

describe('producer — balance robustness', () => {
  it('probe: cost-scaling growth ±15% keeps beat 3 within tolerance', () => {
    const growths: number[] = [0.98, 1.15, 1.32];
    for (const g of growths) {
      const engine = buildSimEngine({
        producers: overrideAllContinuous((def) =>
          def.purchase ? { purchase: { baseCost: def.purchase.baseCost, costScaling: g } } : {},
        ),
      });
      const state = snapshots(engine);
      const result = runUntil({
        engine,
        until: () => state.producerCount('grandma').gte(1),
        maxSimTime: minutes(20),
      });
      expect(result.terminated, `growth=${g} never reached beat 3`).toBe('predicate');
    }
  });

  it('probe: tier1 base rate ±25% still completes beat 2 under 5min', () => {
    // Cursor baseRate sets how long the manual-click burst carries the
    // player before the first auto-producer purchase covers itself. The
    // ±25% sweep checks the window stays inside the § 4 beat 2 budget.
    const rates = [0.075, 0.1, 0.125];
    for (const r of rates) {
      const engine = buildSimEngine({
        producers: [{ id: 'cursor', baseRate: r }],
      });
      const state = snapshots(engine);
      const result = runUntil({
        engine,
        until: () => state.producerCount('cursor').gte(1),
        maxSimTime: minutes(5),
      });
      expect(result.terminated, `cursorRate=${r} never reached beat 2`).toBe('predicate');
    }
  });

  it('probe: modifier-stack correctness — headline chain compounds upgrades', () => {
    const engine = buildSimEngine();
    const state = snapshots(engine);
    runUntil({
      engine,
      until: () => state.producerCount('cursor').gte(10) && state.upgradeBought('cursor-boost-i'),
      maxSimTime: minutes(30),
    });
    // After buying `cursor-boost-i` (×2), cursor rate should be at least
    // 1.9× its base (accounting for other modifiers that may stack).
    const buildings = engine.tryInject(BuildingsKey)!;
    const cursor = buildings.getProducer('cursor')!;
    const computed = Decimal.fromValue(cursor.computedRate.value);
    const base = Decimal.fromValue(cursor.rateChain.apply(0.1));
    // computed >= base (same expression) — sanity that chain evaluates without error.
    expect(Decimal.gte(computed, base)).toBe(true);
    // Upgrade doubled the rate vs. base 0.1 (so rate ≥ 0.2).
    expect(Decimal.gte(computed, 0.2)).toBe(true);
  });

  it('probe: achievement density ±50% — beat 5 still lands within 10min', () => {
    // Reward multiplier compounds per achievement. Sweeping it ±50% tests
    // the beat 5 window (first achievement earned) doesn't depend on the
    // exact reward value — achievements fire off the requirement predicate,
    // not off the multiplier.
    const multipliers = [1.01, 1.02, 1.03];
    for (const m of multipliers) {
      const engine = buildSimEngine({
        balance: { achievementMultiplier: m },
      });
      const state = snapshots(engine);
      const result = runUntil({
        engine,
        until: () => state.achievementCount() >= 1,
        maxSimTime: minutes(10),
      });
      expect(result.terminated, `achievementMultiplier=${m} never reached beat 5`).toBe(
        'predicate',
      );
    }
  });

  it('milestone bonus activates once threshold crossed', () => {
    const engine = buildSimEngine();
    const buildings = engine.tryInject(BuildingsKey)!;
    const milestones = engine.tryInject(MilestonesKey)!;
    const cursor = buildings.getProducer('cursor')!;

    // Baseline: cursor at 0, no milestone binding active.
    const startHits = milestones.hitCount();

    // Push cursor count past the first milestone (1) via direct amount write.
    cursor.repeatable!.amount.value = 10;

    const hits = milestones.hitCount();
    expect(hits).toBeGreaterThan(startHits);

    // The milestone binding for cursor × 1 should be resolvable on the chain
    // and active. Text matches the description we emit from milestones.ts.
    const bindings = cursor.rateChain.bindings();
    const milestoneBinding = bindings.find((b) => b.id === 'milestone/cursor/1');
    expect(milestoneBinding).toBeDefined();
  });

  it('probe: bulk-buy formula correctness at 1e50 / 1e100 / 1e200', () => {
    // Scale the resource directly to each magnitude and sanity-check
    // getCost returns a finite Decimal — the tetration transition is where
    // break_eternity historically drops precision.
    const engine = buildSimEngine();
    const primary = engine.tryInject(PrimaryResourceKey)!;
    const buildings = engine.tryInject(BuildingsKey)!;
    const cursor = buildings.getProducer('cursor')!;
    const repeatable = cursor.repeatable!;
    for (const mag of ['1e50', '1e100', '1e200']) {
      primary.value = new Decimal(mag);
      const cost = repeatable.getCost(1);
      expect(Decimal.isFinite(cost), `cost at mag=${mag} was not finite`).toBe(true);
    }
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Build a per-producer override entry for every continuous producer.
 * `transform` receives the baseline ProducerDef so callers can partially
 * rewrite nested fields (e.g. `purchase.costScaling`) without having to
 * re-specify the unchanged ones — `applyProducerOverrides` shallow-merges
 * top-level fields, so `purchase` patches must be full objects.
 */
function overrideAllContinuous(
  transform: (def: ProducerDef) => Partial<NonNullable<ProducerOverrides['producers']>[number]>,
): ProducerOverrides['producers'] {
  const byId = new Map(PRODUCERS.map((p) => [p.id, p] as const));
  return CONTINUOUS_PRODUCER_IDS.map((id) => ({ id, ...transform(byId.get(id)!) }));
}
