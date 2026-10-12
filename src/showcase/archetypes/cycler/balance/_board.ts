import type { BuildApi } from '../modules';
import { BOARD, REFERENCE_DEFENSE } from '../data/pieces';

/**
 * Place the shared `REFERENCE_DEFENSE` board (`data/pieces.ts`) on a build module — the
 * competent forward-Lance defense the wave-model probes drive so a run reaches the
 * pegged crossing + Δ_wall tail rather than breaching at wave 0 with an empty board.
 * One source with `sim/harness.ts` placeDefense, so probe and test harness can't drift.
 */
export function placeReference(build: BuildApi): void {
  for (let y = 0; y < BOARD.height; y++) {
    for (let x = 0; x < BOARD.width; x++) {
      const kind = REFERENCE_DEFENSE[y * BOARD.width + x];
      if (kind) build.placeAt(x, y, kind);
    }
  }
}
