import { inject } from 'vue';
import type { Engine } from 'open-loop-engine';
import { ArcKey, type ArcState } from '../modules';

export function useArc(): ArcState {
  const engine = inject<Engine>('engine');
  const arc = engine?.tryInject(ArcKey);
  if (!arc) {
    throw new Error('useArc() called outside an active ambient engine');
  }
  return arc;
}
