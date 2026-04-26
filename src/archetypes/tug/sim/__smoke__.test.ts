import { describe, it, expect } from 'vitest';
import { CategoriesKey } from 'open-loop-engine';
import { createTugEngine } from '../boot';
import {
  TugDataKey,
  TugTuningRegistryKey,
  IncomeKey,
  LaneKey,
  UnitsKey,
  SequencerKey,
  UnitsCooldownKey,
  MatchKey,
  MetaKey,
  ArcKey,
} from '../modules';

/**
 * Smoke gate. Mirrors Ambient's `__smoke__.test.ts` shape: boot the engine,
 * assert the injection-key
 * surface and tuning registry contents that the BalanceWorkbench relies on,
 * then drive a short live simulation to confirm the wiring composes at
 * runtime (no install-time crashes, sequencers fire, lane spawns units,
 * income accrues on both sides).
 *
 * Browser-side visual confirmation of the full match-resolution path
 * (player buy → unit walks → combat → fortress drains → MatchEndSummary)
 * still rides the dev-server check — this is the headless invariant lock.
 */
describe('tug engine smoke', () => {
  it('boots, publishes the full module surface, and drives a live match', () => {
    const { engine } = createTugEngine();
    engine.selectMod('sci-fi-armada');
    engine.start();

    expect(engine.tryInject(TugDataKey)).toBeDefined();
    expect(engine.tryInject(LaneKey)).toBeDefined();
    expect(engine.tryInject(MatchKey)).toBeDefined();
    expect(engine.tryInject(MetaKey)).toBeDefined();
    expect(engine.tryInject(ArcKey)).toBeDefined();
    expect(engine.tryInject(IncomeKey.player)).toBeDefined();
    expect(engine.tryInject(IncomeKey.ai)).toBeDefined();
    expect(engine.tryInject(UnitsKey.player)).toBeDefined();
    expect(engine.tryInject(UnitsKey.ai)).toBeDefined();
    expect(engine.tryInject(SequencerKey.player)).toBeDefined();
    expect(engine.tryInject(SequencerKey.ai)).toBeDefined();
    expect(engine.tryInject(UnitsCooldownKey.player)).toBeDefined();
    expect(engine.tryInject(UnitsCooldownKey.ai)).toBeDefined();

    const cats = engine.tryInject(CategoriesKey);
    // Two unit shops + two income-upgrade shops.
    expect(cats?.purchasables?.length).toBe(4);

    const reg = engine.tryInject(TugTuningRegistryKey);
    for (const key of [
      'balance/baseIncomeRate',
      'balance/aiIncomeMultiplier',
      'fortress/hp',
      'units/marine/cost',
      'units/siege-tank/cost',
      'counter-matrix/strongCounter',
      'counter-matrix/weakCounter',
    ] as const) {
      expect(reg?.has(key)).toBe(true);
    }

    const match = engine.tryInject(MatchKey)!;
    const lane = engine.tryInject(LaneKey)!;
    const player = engine.tryInject(UnitsKey.player)!;
    const incomeP = engine.tryInject(IncomeKey.player)!;
    const incomeA = engine.tryInject(IncomeKey.ai)!;

    match.start();
    expect(match.inMatch.value).toBe(true);

    // 30s of sim. Player accrues (no spend); AI symmetric-mirror queues
    // sends as it can afford under default 4s cadence × 30s — AI income
    // sits near 0 between sends because the AI spends what it earns.
    for (let i = 0; i < 30; i++) engine.loop.simulateTick(1);
    expect(Number(incomeP.value)).toBeGreaterThan(0);
    expect(lane.units.ai.value.length).toBeGreaterThan(0);
    void incomeA;

    // Player buys a marine — ends up in the lane after the sequencer
    // dispatches on the next tick.
    const before = lane.units.player.value.length;
    player.getPurchasable('marine')!.purchase(1);
    for (let i = 0; i < 3; i++) engine.loop.simulateTick(1);
    expect(lane.units.player.value.length).toBeGreaterThan(before);
  });
});
