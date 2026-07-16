import { inject } from 'vue';
import type { Engine } from '@open-loop/engine';

export function useGame() {
  const engine = inject<Engine>('engine')!;
  return { engine };
}
