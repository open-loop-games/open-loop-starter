// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Decimal, type Engine } from 'open-loop-engine';
import { createScalerEngine } from '../boot';
import {
  AntimatterCoinKey,
  AntimatterProducersKey,
  ChallengesKey,
  CrystalUpgradesKey,
  PrestigeConversionKey,
  PrestigePointsKey,
  PrestigeProducersKey,
  PrestigeShardsKey,
  TranscendConversionKey,
  TranscendPointsKey,
  TranscendProducersKey,
  TranscendShardsKey,
} from '../modules';

const MOD_ID = 'synergism-slim';

let activeEngine: Engine | null = null;

afterEach(() => {
  activeEngine?.stop();
  activeEngine?.dispose();
  activeEngine = null;
});

function bootProd(ns: string): Engine {
  const { engine } = createScalerEngine(undefined, { persistenceNamespace: ns });
  const newSlotId = engine.saveManager!.createSlot('Test');
  engine.saveManager!.selectSlot(newSlotId);
  engine.selectMod(MOD_ID);
  engine.start();
  engine.load();
  activeEngine = engine;
  return engine;
}

describe('scaler boot state — smoke: boot + module registration', () => {
  it('boots without throwing', () => {
    expect(() => bootProd('scaler-boot-1')).not.toThrow();
  });

  it('all 3 tier modules provide their core injection keys', () => {
    const engine = bootProd('scaler-boot-2');
    expect(engine.tryInject(AntimatterCoinKey)).toBeDefined();
    expect(engine.tryInject(AntimatterProducersKey)).toBeDefined();
    expect(engine.tryInject(PrestigePointsKey)).toBeDefined();
    expect(engine.tryInject(PrestigeShardsKey)).toBeDefined();
    expect(engine.tryInject(PrestigeProducersKey)).toBeDefined();
    expect(engine.tryInject(CrystalUpgradesKey)).toBeDefined();
    expect(engine.tryInject(TranscendPointsKey)).toBeDefined();
    expect(engine.tryInject(TranscendShardsKey)).toBeDefined();
    expect(engine.tryInject(TranscendProducersKey)).toBeDefined();
    expect(engine.tryInject(ChallengesKey)).toBeDefined();
  });

  it('per-tier conversions are wired in connect() phase', () => {
    const engine = bootProd('scaler-boot-3');
    const prestigeConv = engine.tryInject(PrestigeConversionKey);
    const transcendConv = engine.tryInject(TranscendConversionKey);
    expect(prestigeConv).toBeDefined();
    expect(transcendConv).toBeDefined();
    expect(prestigeConv?.reset).toBeDefined();
    expect(transcendConv?.reset).toBeDefined();
  });

  it('producer counts default to zero, currencies start empty', () => {
    const engine = bootProd('scaler-boot-4');
    const coin = engine.tryInject(AntimatterCoinKey)!;
    const prestigePoints = engine.tryInject(PrestigePointsKey)!;
    const transcendPoints = engine.tryInject(TranscendPointsKey)!;
    expect(Decimal.eq(coin.value, 0)).toBe(true);
    expect(Decimal.eq(prestigePoints.value, 0)).toBe(true);
    expect(Decimal.eq(transcendPoints.value, 0)).toBe(true);
  });
});

describe('scaler boot state — save/load round-trip', () => {
  it('round-trips currency values across save → dispose → reboot → load', () => {
    const ns = 'scaler-roundtrip';
    const slotName = 'Roundtrip';

    // First boot — mutate currencies, then save.
    const { engine: e1 } = createScalerEngine(undefined, { persistenceNamespace: ns });
    const slotId = e1.saveManager!.createSlot(slotName);
    e1.saveManager!.selectSlot(slotId);
    e1.selectMod(MOD_ID);
    e1.start();
    e1.load();
    const coin1 = e1.tryInject(AntimatterCoinKey)!;
    const prestigePoints1 = e1.tryInject(PrestigePointsKey)!;
    coin1.value = new Decimal('1234');
    prestigePoints1.value = new Decimal('56');
    e1.save();
    e1.stop();
    e1.dispose();

    // Second boot — same namespace, same slot. Engine reads the save.
    const { engine: e2 } = createScalerEngine(undefined, { persistenceNamespace: ns });
    e2.saveManager!.selectSlot(slotId);
    e2.selectMod(MOD_ID);
    e2.start();
    const result = e2.load();
    expect(result.success).toBe(true);

    activeEngine = e2;
    const coin2 = e2.tryInject(AntimatterCoinKey)!;
    const prestigePoints2 = e2.tryInject(PrestigePointsKey)!;
    expect(Decimal.eq(coin2.value, 1234)).toBe(true);
    expect(Decimal.eq(prestigePoints2.value, 56)).toBe(true);
  });
});
