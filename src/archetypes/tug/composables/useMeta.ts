import { inject } from 'vue';
import type { Engine } from 'open-loop-engine';
import { MetaKey, type MetaApi } from '../modules';

/**
 * Cross-match meta state — `factionsUnlocked`, `maxCounterPivotsAnyMatch`,
 * `matchesPlayed`. Survives match boundary (lives under `tug/meta`, outside
 * `tug/match`'s reset scope). Used by `MatchEndSummary.vue` for the
 * lifetime stat row.
 */
export function useMeta(): MetaApi {
  const engine = inject<Engine>('engine');
  const meta = engine?.tryInject(MetaKey);
  if (!meta) {
    throw new Error('useMeta() called outside an active tug engine');
  }
  return meta;
}
