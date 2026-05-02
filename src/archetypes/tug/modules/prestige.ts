import { createReset, type EngineModule, type InjectionKey, type Reset } from 'open-loop-engine';
import type { TugData } from '../data/types';

export const PrestigeKey: InjectionKey<Reset> = Symbol('tug/meta/prestige') as InjectionKey<Reset>;

/**
 * Meta-progression reset. Conditionally installed by the composer when
 * `data.balance.metaProgressionEnabled === true`. Resets the `tug/meta`
 * context back to defaults — clears `factionsUnlocked`,
 * `maxCounterPivotsAnyMatch`, and `matchesPlayed`.
 *
 * Mirrors Ambient's `prestige.ts` shape: thin `createReset` provider; any
 * conversion currency / multiplier accrual lives at the call site (a fork
 * extension, not skeleton). Match-scope state is NOT in this reset's scope —
 * the match-boundary reset in `match.ts` owns that surface.
 */
export function createPrestigeModule(_data: TugData): EngineModule {
  return {
    id: 'tug/meta/prestige',
    dependencies: ['tug/meta'],
    install(ctx) {
      const reset = createReset({
        resetModules: ['tug/meta'],
      });
      ctx.provide(PrestigeKey, reset);
    },
  };
}
