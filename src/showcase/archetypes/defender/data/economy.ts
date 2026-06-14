import type { EconomyConfig } from './types';

// Economy constants verbatim from `BloonsTD.as:824-826` + `:1142`. The
// round-clear bonus formula `101 - round` (BloonsTD.as:1174-1175) lives
// inline on each `WaveDef.cashReward` rather than here — keeps the wave
// table self-describing.

export const ECONOMY: EconomyConfig = {
  startingMoney: 650, // BloonsTD.as:824 STARTING_MONEY = 650
  maxLives: 40, // BloonsTD.as:825 MAX_LIVES = 40
  sellRate: 0.8, // BloonsTD.as:826 SELL_RATE = 0.8
  moneyPerPop: 1, // BloonsTD.as:1142
};
