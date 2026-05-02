import { createReset, type EngineModule, type InjectionKey, type Reset } from 'open-loop-engine';
import type { AmbientData } from '../data/types';

export const PrestigeKey: InjectionKey<Reset> = Symbol('ambient/prestige') as InjectionKey<Reset>;

/**
 * Ambient prestige reset over the archetype's persistent contexts. Module-id
 * scope: the engine's persistent-ref registry (`createReset({ resetModules })`)
 * resolves these to every `persistent()` ref the listed modules registered.
 *
 * Skipped at engine construction when `data.balance.prestigeEnabled === false`
 * (the default — Ambient ships zero prestige code paths active). When
 * enabled, consumers inject `PrestigeKey` and call `.reset()` to drop the
 * run; currency / multiplier accrual lives at the call site.
 */
export function createPrestigeModule(_data: AmbientData): EngineModule {
  return {
    id: 'ambient/prestige',
    dependencies: [
      'ambient/auto-producers',
      'ambient/unlocks',
      'ambient/scene',
      'ambient/arc',
      'ambient/session-clock',
    ],
    install(ctx) {
      const reset = createReset({
        resetModules: [
          'ambient/auto-producers',
          'ambient/unlocks',
          'ambient/scene',
          'ambient/arc',
          'ambient/session-clock',
        ],
      });
      ctx.provide(PrestigeKey, reset);
    },
  };
}
