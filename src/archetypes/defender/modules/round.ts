import type {
  DecimalSource,
  EngineModule,
  InjectionKey,
  Persistent,
  Resource,
} from '@open-loop/engine';
import type { DefenderData } from '../data/types';

export type MatchOutcome = 'in-progress' | 'victory' | 'defeat';

export interface RoundApi {
  /** Player cash. Per-pop grants + round-clear bonuses add via
   *  `addResource()`; tower purchases subtract via the shop's cost
   *  requirement. */
  money: Resource<DecimalSource>;
  /** Lives remaining. Decremented by bloon-leak handler (`livesOnLeak =
   *  rank` per BloonsTD.as:1151). Game ends when this hits 0. */
  lives: Persistent<number>;
  /** Active round (1..10 in arc 1). Incremented after `onWaveCleared`. */
  currentRound: Persistent<number>;
  /** Match outcome. `'in-progress'` during play; flips to `'victory'` on
   *  round-10-clear or `'defeat'` on lives-reach-0. */
  outcome: Persistent<MatchOutcome>;
  /** Begin round N. Wires the bloons module's wave-stream sequencer for
   *  `data.waves[n-1]`. */
  startRound(n: number): void;
  /** Award round-clear bonus + advance counter. Called from the bloons
   *  module's `onWaveCleared` handler. */
  endRoundAwardBonus(n: number): void;
  /** Reset to fresh game state — money = `economy.startingMoney`, lives =
   *  `economy.maxLives`, round = 1, outcome = `'in-progress'`. Called by
   *  the AppRoot on new-game and after defeat. */
  resetGame(): void;
}

export const RoundKey: InjectionKey<RoundApi> = Symbol('defender/round') as InjectionKey<RoundApi>;

let round: RoundApi | null = null;

export function getRound(): RoundApi {
  if (!round) throw new Error('defender/round: not installed yet');
  return round;
}

/**
 * Round module — orchestrates money + lives + round-counter + win/loss
 * predicate + round-clear bonus. Phase 1 STUB — body lands in Phase 3
 * (single-Opus integration pass, post Phase 2 fan-out merge).
 *
 * Phase 3 implementation will (per OL-1021 structural decisions):
 *   1. Create `money: Resource<DecimalSource>` via `createResource()` with
 *      initial value `economy.startingMoney` (tunable
 *      `economy/startingMoney`).
 *   2. Persistent refs: `lives`, `currentRound`, `outcome`.
 *   3. Subscribe to bloons module:
 *      a. `onBloonPopped` → `addResource(money, economy.moneyPerPop)` per pop.
 *      b. `onBloonLeaked({ defId })` → look up `livesOnLeak` from data,
 *         decrement `lives`. If lives ≤ 0, flip `outcome = 'defeat'`.
 *      c. `onWaveCleared` → `addResource(money, waves[n-1].cashReward)`,
 *         increment `currentRound`. If currentRound > 10, flip `outcome
 *         = 'victory'`.
 *   4. `startRound(n)` invokes the bloons module's `startWave(n)`.
 *   5. `resetGame()` clears persistent state to fresh defaults — uses the
 *      starter convention of resetting via `withPersistentContext` scope
 *      rather than `createReset` since no prestige/conversion is involved
 *      in arc 1.
 *
 * Discrete-event income via direct `addResource()` — NOT a
 * `createProducerCategory` (its idiom is continuous rate × dt; no sibling
 * archetype uses it for discrete event payouts).
 */
export function createRoundModule(_data: DefenderData): EngineModule {
  return {
    id: 'defender/round',
    dependencies: ['defender/tuning', 'defender/bloons', 'defender/towers'],
    install(ctx) {
      round = makeStubRound();
      ctx.provide(RoundKey, round);
    },
  };
}

function makeStubRound(): RoundApi {
  const notImplemented = (method: string): never => {
    throw new Error(`defender/round: ${method} not implemented in Phase 1`);
  };
  return {
    get money(): Resource<DecimalSource> {
      return notImplemented('money');
    },
    get lives(): Persistent<number> {
      return notImplemented('lives');
    },
    get currentRound(): Persistent<number> {
      return notImplemented('currentRound');
    },
    get outcome(): Persistent<MatchOutcome> {
      return notImplemented('outcome');
    },
    startRound: () => notImplemented('startRound'),
    endRoundAwardBonus: () => notImplemented('endRoundAwardBonus'),
    resetGame: () => notImplemented('resetGame'),
  };
}
