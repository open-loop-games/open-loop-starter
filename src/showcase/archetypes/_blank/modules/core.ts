import {
  Decimal,
  persistent,
  tunable,
  withPersistentContext,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { computed } from 'vue';
import { GAME_BALANCE, type GameBalance } from '../data/game';
import { GameTuningRegistryKey } from './tuning';
import { AutomationKey } from './automation';

/**
 * Core module — the blank base's single example mechanic: one tracked number
 * (`count`) rising at a tunable rate (see `../data/game.ts` § Balance). It is
 * the shipping-code half of the balance demo — the probe
 * (`../balance/game-probe.ts`) drives THIS module on the real engine to check it
 * against the projection.
 *
 * DELETE-OR-RESHAPE: replace this with your game's real modules. It is here so a
 * clean fork boots with a working economy and a green balance scaffold, not
 * with empty stubs.
 */
export interface CoreApi {
  /** The accumulated headline number. */
  count: ComputedRef<Decimal>;
  /**
   * Live accrual rate (units/game-second), after any tuning override and any
   * automation boost currently unlocked.
   */
  ratePerSecond: ComputedRef<number>;
}

export const CoreKey: InjectionKey<CoreApi> = Symbol('game/core') as InjectionKey<CoreApi>;

export interface CoreModuleOptions {
  balance?: GameBalance;
}

export function createCoreModule(options: CoreModuleOptions = {}): EngineModule {
  const data = options.balance ?? GAME_BALANCE;

  return {
    id: 'game/core',
    dependencies: ['game/tuning', 'game/automation'],
    install(ctx) {
      const registry = ctx.inject(GameTuningRegistryKey);
      const automation = ctx.inject(AutomationKey);

      const state = withPersistentContext('game/core', () => ({
        count: persistent<Decimal>(new Decimal(0), { id: 'count' }),
      }));

      // The one perturbable balance value, read through the tuning registry so
      // probes can override it via pushOverrides. Default closure reads `data/`.
      const ratePerSecond = tunable(registry, 'core/ratePerSecond', () => data.ratePerSecond);

      // Effective rate = the tuned base times whatever automation is
      // contributing. `boostMultiplier` is 1 while the ladder is locked, so a
      // clean fork accrues exactly the linear spine.
      const effectiveRate = computed(
        () => Number(ratePerSecond.value) * automation.boostMultiplier.value,
      );

      ctx.onTick((dt) => {
        state.count.value = state.count.value.add(Decimal.mul(effectiveRate.value, dt));
      });

      ctx.provide(CoreKey, {
        count: computed(() => state.count.value),
        ratePerSecond: effectiveRate,
      });
    },
  };
}
