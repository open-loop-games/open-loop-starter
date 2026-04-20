import { inject } from 'vue';
import type { Engine } from 'open-loop-engine';
import { ClickStateKey } from '../modules';
import type { ClickState } from '../modules';

export function useClickState(): ClickState {
  const engine = inject<Engine>('engine');
  const state = engine?.tryInject(ClickStateKey);
  if (!state) {
    throw new Error('useClickState() called outside an active producer engine');
  }
  return state;
}
