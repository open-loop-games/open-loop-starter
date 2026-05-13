import type { InjectionKey } from '@open-loop/engine';
import { useGame } from './useGame';

/**
 * Resolve a module's provided state from the engine's injection map.
 * Use in Vue component setup — only valid after engine.start().
 */
export function useModule<T>(key: InjectionKey<T>): T {
  const { engine } = useGame();
  const state = engine.tryInject(key);
  if (!state) throw new Error(`Module not available: ${key.toString()}`);
  return state;
}
