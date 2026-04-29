import { useModule } from '@/composables/useModule';
import { MetaKey, type MetaApi } from '../modules';

/**
 * Cross-match meta state — `factionsUnlocked`, `maxCounterPivotsAnyMatch`,
 * `matchesPlayed`. Survives match boundary (lives under `tug/meta`, outside
 * `tug/match`'s reset scope). Used by `MatchEndSummary.vue` for the
 * lifetime stat row.
 */
export function useMeta(): MetaApi {
  return useModule(MetaKey);
}
