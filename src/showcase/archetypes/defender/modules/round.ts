import {
  addResource,
  createResource,
  persistent,
  subtractResource,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Resource,
} from '@open-loop/engine';
import type { BloonId, DefenderData } from '../data/types';
import { getBloons } from './bloons';
import { DefenderTuningRegistryKey } from './tuning';

export type MatchOutcome = 'in-progress' | 'victory' | 'defeat';

export interface RoundApi {
  /** Player cash. Per-pop grants + round-clear bonuses add via
   *  `addResource()`; tower purchases call `spendMoney()`; sells call
   *  `refundMoney()`. */
  money: Resource<DecimalSource>;
  /** Lives remaining. Decremented by bloon-leak handler (`livesOnLeak =
   *  rank` per BloonsTD.as:1151). Game ends when this hits 0. */
  lives: Persistent<number>;
  /** Active round (1..10 in arc 1). Incremented after `onWaveCleared`. */
  currentRound: Persistent<number>;
  /** Match outcome. `'in-progress'` during play; flips to `'victory'` on
   *  round-N-clear past the last wave or `'defeat'` on lives-reach-0. */
  outcome: Persistent<MatchOutcome>;
  /** Begin round N. Delegates to the bloons module's wave sequencer. */
  startRound(n: number): void;
  /** Reset to fresh game state — money = `economy.startingMoney`, lives =
   *  `economy.maxLives`, round = 1, outcome = `'in-progress'`. Called by
   *  the AppRoot on new-game and after defeat. */
  resetGame(): void;
  /** Try to debit `amount` from `money`. Returns false on insufficient funds
   *  (resource unchanged). Used by the towers module on placement. */
  spendMoney(amount: DecimalSource): boolean;
  /** Refund `amount` to `money`. Used by the towers module on sell. */
  refundMoney(amount: DecimalSource): void;
}

export const RoundKey: InjectionKey<RoundApi> = Symbol('defender/round') as InjectionKey<RoundApi>;

let round: RoundApi | null = null;

export function getRound(): RoundApi {
  if (!round) throw new Error('defender/round: not installed yet');
  return round;
}

/**
 * Round module — orchestrates money + lives + round-counter + win/loss
 * predicate + round-clear bonus. Subscribes to the bloons module's pop /
 * leak / wave-cleared events at install time and mutates money + lives +
 * round + outcome in response.
 *
 * Discrete-event income via direct `addResource()` — NOT a
 * `createProducerCategory` (locked Phase 1 triage: ProducerCategory's idiom
 * is continuous rate × dt; no sibling archetype uses it for discrete event
 * payouts). This bifurcates against tug's continuous-`getRate` income for
 * the stasis-aware-tick verdict — surfaced in `BALANCING-defender.md` at
 * Phase 5.
 */
export function createRoundModule(data: DefenderData): EngineModule {
  return {
    id: 'defender/round',
    dependencies: ['defender/tuning', 'defender/bloons', 'defender/towers'],
    install(ctx) {
      const registry = ctx.inject(DefenderTuningRegistryKey);

      // Economy tunables. Citations BloonsTD.as:824-826 + :1142. Reader sites
      // bind the keys declared in `DefenderTunableKey`.
      const startingMoney = tunable<DecimalSource>(
        registry,
        'economy/startingMoney',
        () => data.economy.startingMoney,
      );
      const maxLives = tunable<number>(registry, 'economy/maxLives', () => data.economy.maxLives);
      const moneyPerPop = tunable<number>(
        registry,
        'economy/moneyPerPop',
        () => data.economy.moneyPerPop,
      );
      // sellRate is read by the towers module on sell. Registered here
      // because `economy/*` is round's namespace per the structural split.
      tunable<number>(registry, 'economy/sellRate', () => data.economy.sellRate);

      // Per-bloon lives-on-leak readers. Bloons module registers these too
      // (its own leak handler doesn't read them — it emits `defId` and the
      // subscriber subtracts); `setDefault` is idempotent so the duplicate
      // registration is a no-op. Citation: BloonsTD.as:1151.
      const livesOnLeakById = new Map<BloonId, ReturnType<typeof tunable<number>>>();
      for (const def of data.bloons) {
        livesOnLeakById.set(
          def.id,
          tunable<number>(registry, `bloons/${def.id}/livesOnLeak`, () => def.livesOnLeak),
        );
      }

      // Persistent state. `createResource()` and `persistent()` participate
      // in the `defender/round` persistent context the engine wraps
      // `install()` in, so save/load roundtrips work without an explicit
      // `withPersistentContext`.
      const money = createResource<DecimalSource>(startingMoney.value, {
        id: 'money',
        displayName: 'cash',
        precision: 0,
      });
      const lives = persistent<number>(maxLives.value, { name: 'lives' });
      const currentRound = persistent<number>(1, { name: 'current-round' });
      const outcome = persistent<MatchOutcome>('in-progress', { name: 'outcome' });

      // Subscribe to bloons events. `getBloons()` is safe here because
      // `defender/round` declares `defender/bloons` as a dependency, so
      // bloons has already finished installing.
      const bloons = getBloons();

      bloons.onBloonPopped(() => {
        if (outcome.value !== 'in-progress') return;
        addResource(money, moneyPerPop.value);
      });

      bloons.onBloonLeaked(({ defId }) => {
        if (outcome.value !== 'in-progress') return;
        const cost = livesOnLeakById.get(defId)?.value ?? 0;
        lives.value = Math.max(0, lives.value - cost);
        if (lives.value <= 0) {
          outcome.value = 'defeat';
        }
      });

      bloons.onWaveCleared(() => {
        if (outcome.value !== 'in-progress') return;
        const n = currentRound.value;
        const wave = data.waves[n - 1];
        if (wave) addResource(money, wave.cashReward);
        currentRound.value = n + 1;
        if (currentRound.value > data.waves.length) {
          outcome.value = 'victory';
        }
      });

      function startRound(n: number): void {
        if (outcome.value !== 'in-progress') return;
        bloons.startWave(n);
      }

      function resetGame(): void {
        money.value = startingMoney.value;
        lives.value = maxLives.value;
        currentRound.value = 1;
        outcome.value = 'in-progress';
      }

      function spendMoney(amount: DecimalSource): boolean {
        return subtractResource(money, amount);
      }

      function refundMoney(amount: DecimalSource): void {
        addResource(money, amount);
      }

      round = {
        money,
        lives,
        currentRound,
        outcome,
        startRound,
        resetGame,
        spendMoney,
        refundMoney,
      };
      ctx.provide(RoundKey, round);
    },
  };
}
