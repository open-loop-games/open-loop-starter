import { inject, type Ref } from 'vue';
import type { Engine } from '@open-loop/engine';
import type { Screen } from '@/types';

export function useGame() {
  const engine = inject<Engine>('engine')!;
  const currentScreen = inject<Ref<Screen>>('currentScreen')!;
  return { engine, currentScreen };
}
