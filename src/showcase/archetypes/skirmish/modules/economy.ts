import {
  Decimal,
  addResource,
  createResource,
  persistent,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Resource,
} from '@open-loop/engine';
import { SkirmishTuningRegistryKey, DEFAULT_FACTIONS, type FactionId, type Side } from './tuning';
import { MatchKey } from './match';
import { ECONOMY_BALANCE } from '../data/economy';

/**
 * The economy half of the macro loop — workers produce supply, supply buys
 * workers or army. This module owns income and the reinvestment channel; the
 * tactical sim owns the field and spends supply on units.
 *
 * The split `φ` is NOT decided here. This module provides the mechanism (buy a
 * worker, see what has been spent on economy so far) and `modules/automation.ts`
 * provides the policy, because the split is the seat's strategy — the thing a
 * persona differs on and a player seat would decide by hand.
 */

export interface EconomyApi {
  factions: readonly FactionId[];
  /** Spendable supply. */
  supply: Record<FactionId, Resource<DecimalSource>>;
  /** `E` — owned workers. */
  workers: Record<FactionId, Persistent<number>>;
  /** Supply produced since match start. Denominator of the realized split. */
  cumulativeIncome: Record<FactionId, Persistent<number>>;
  /** Supply spent on workers since match start. Numerator of the realized split. */
  economySpend: Record<FactionId, Persistent<number>>;
  /**
   * Realized `φ` so far: `economySpend / cumulativeIncome`, and 0 before any
   * income. What a policy steers against — not a target, a measurement.
   */
  realizedShare(side: Side): number;
  /** Live worker price, after any tuning override. */
  workerCost(): number;
  /** Spendable supply as a number, for policies deciding what they can hold back. */
  available(side: Side): number;
  /** Buy one worker for `side` if affordable and under the cap. Did it? */
  buyWorker(side: Side): boolean;
  /** Spend supply on something that is not economy (the army half). */
  spendOnArmy(side: Side, amount: number): boolean;
}

export const EconomyKey: InjectionKey<EconomyApi> = Symbol(
  'skirmish/economy',
) as InjectionKey<EconomyApi>;

export interface EconomyModuleOptions {
  factions?: readonly FactionId[];
}

export function createEconomyModule(options: EconomyModuleOptions = {}): EngineModule {
  const factions = options.factions ?? DEFAULT_FACTIONS;

  return {
    id: 'skirmish/match/economy',
    dependencies: ['skirmish/tuning', 'skirmish/match'],
    install(ctx) {
      const registry = ctx.inject(SkirmishTuningRegistryKey);
      const match = ctx.inject(MatchKey);

      const supply = {} as Record<FactionId, Resource<DecimalSource>>;
      const workers = {} as Record<FactionId, Persistent<number>>;
      const cumulativeIncome = {} as Record<FactionId, Persistent<number>>;
      const economySpend = {} as Record<FactionId, Persistent<number>>;

      for (const side of factions) {
        supply[side] = createResource<DecimalSource>(0, {
          id: `skirmish/match/economy/${side}/supply`,
          displayName: 'supply',
          decimals: 0,
        });
        workers[side] = persistent<number>(ECONOMY_BALANCE.startingWorkers, {
          id: `workers-${side}`,
        });
        cumulativeIncome[side] = persistent<number>(0, { id: `cumulativeIncome-${side}` });
        economySpend[side] = persistent<number>(0, { id: `economySpend-${side}` });
      }

      const incomePerWorker = tunable(
        registry,
        'economy/incomePerWorker',
        () => ECONOMY_BALANCE.incomePerWorker,
      );
      const workerCost = tunable(registry, 'economy/workerCost', () => ECONOMY_BALANCE.workerCost);

      // The match-scope reset runs at `end()`, not `start()`, so a match opened
      // over a live one would inherit its field — the economy clears its own
      // supply and counters on every open.
      match.on('matchStarted', () => {
        for (const side of factions) {
          addResource(supply[side], Decimal.mul(supply[side].value, -1));
          workers[side].value = ECONOMY_BALANCE.startingWorkers;
          cumulativeIncome[side].value = 0;
          economySpend[side].value = 0;
        }
      });

      function realizedShare(side: Side): number {
        const earned = cumulativeIncome[side].value;
        return earned > 0 ? economySpend[side].value / earned : 0;
      }

      function buyWorker(side: Side): boolean {
        if (!match.inMatch.value) return false;
        if (workers[side].value >= ECONOMY_BALANCE.maxWorkers) return false;
        const cost = Number(workerCost.value);
        if (Decimal.lt(supply[side].value, cost)) return false;
        addResource(supply[side], -cost);
        economySpend[side].value += cost;
        workers[side].value += 1;
        return true;
      }

      function spendOnArmy(side: Side, amount: number): boolean {
        if (!match.inMatch.value) return false;
        if (Decimal.lt(supply[side].value, amount)) return false;
        addResource(supply[side], -amount);
        return true;
      }

      ctx.onTick((dt) => {
        if (!match.inMatch.value) return;
        for (const side of factions) {
          // income = ρ · E. The compounding is here and nowhere else: buying a
          // worker raises this term, which is what makes φ an investment rather
          // than a preference.
          const income = Number(incomePerWorker.value) * workers[side].value * dt;
          addResource(supply[side], income);
          cumulativeIncome[side].value += income;
        }
      });

      ctx.provide(EconomyKey, {
        factions,
        supply,
        workers,
        cumulativeIncome,
        economySpend,
        realizedShare,
        workerCost: () => Number(workerCost.value),
        available: (side: Side) => Number(supply[side].value),
        buyWorker,
        spendOnArmy,
      });
    },
  };
}
