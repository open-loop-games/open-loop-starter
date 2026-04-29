import { useModule } from '@/composables/useModule';
import { ClickStateKey } from '../modules';
import type { ClickState } from '../modules';

export function useClickState(): ClickState {
  return useModule(ClickStateKey);
}
