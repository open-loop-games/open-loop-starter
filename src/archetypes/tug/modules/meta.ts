import {
  persistent,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from 'open-loop-engine';
import type { TugData } from '../data/types';
import { MatchKey } from './match';

export interface MetaApi {
  /** Number of factions unlocked via meta-progression. Drives the
   *  `metaProgressionEnabled` arc-closure branch. Increments are owned by
   *  prestige.ts (when installed) or fork extensions. */
  factionsUnlocked: Persistent<number>;
  /** All-time best counter-pivot count across any single match. Updated on
   *  the `'matchEnded'` event with `Math.max(prev, counterPivots)`. Drives
   *  the meta-off skeleton arc-closure branch (`>= 3`). */
  maxCounterPivotsAnyMatch: Persistent<number>;
  /** Total completed matches across the lifetime of this save. Increments on
   *  `'matchEnded'` regardless of outcome — survives match resets. */
  matchesPlayed: Persistent<number>;
}

export const MetaKey: InjectionKey<MetaApi> = Symbol('tug/meta') as InjectionKey<MetaApi>;

/**
 * Cross-match meta-progression state. Always installed (skeleton + meta-on
 * branches both read from it). Persistent refs live under the `tug/meta`
 * context, which is OUTSIDE `tug/match`'s reset scope — these survive every
 * match boundary.
 *
 * `factionsUnlocked` increments belong to prestige.ts when meta-progression
 * is enabled; meta.ts only owns the storage shape and cross-match counters.
 */
export function createMetaModule(_data: TugData): EngineModule {
  return {
    id: 'tug/meta',
    dependencies: ['tug/match'],
    install(ctx) {
      const match = ctx.inject(MatchKey);

      const factionsUnlocked = persistent<number>(0, { name: 'factionsUnlocked' });
      const maxCounterPivotsAnyMatch = persistent<number>(0, {
        name: 'maxCounterPivotsAnyMatch',
      });
      const matchesPlayed = persistent<number>(0, { name: 'matchesPlayed' });

      // Listen for match end. Match emits BEFORE its reset clears
      // counterPivotsThisMatch, so we read the pre-reset value off the
      // payload and update the cross-match high-water mark.
      match.on('matchEnded', (payload) => {
        matchesPlayed.value += 1;
        if (payload.counterPivots > maxCounterPivotsAnyMatch.value) {
          maxCounterPivotsAnyMatch.value = payload.counterPivots;
        }
      });

      const api: MetaApi = {
        factionsUnlocked,
        maxCounterPivotsAnyMatch,
        matchesPlayed,
      };
      ctx.provide(MetaKey, api);
    },
  };
}
