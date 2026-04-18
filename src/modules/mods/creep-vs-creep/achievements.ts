/**
 * Territorial achievements — free composition win (OL-528 half of OL-513).
 *
 * Five milestones, all evaluated via `createAchievementCategory` requirement
 * closures. Reactivity breaks cleanly into two cases:
 *
 * 1. Round-end milestones (landslide / sole-survivor / blitzkrieg) read
 *    `round.stats` + `round.phase`, both `Ref`s frozen by `round.endRound()`.
 *    Requirement closures stay reactive with no extra plumbing.
 *
 * 2. Active-play milestones (first-quarter / total-dominance) depend on grid
 *    ownership counts. Grid cells are plain objects, not reactive refs — a
 *    computed reading `grid.at(x, y).owner` caches on first read and never
 *    invalidates. Rather than push a version ref into the grid, we mirror
 *    the two metrics we care about into `ref()`s updated from
 *    {@link onEngineTick}. Closures read the refs; Vue's reactivity tracks
 *    those writes normally.
 *
 * `total-dominance` needs a continuous-hold timer: accumulates `dt` while the
 * player owns every hotspot, resets to zero the tick condition breaks. Round
 * transitions also reset it so the next round starts a fresh 30s window.
 *
 * Earned status persists via the category's own persistent context
 * (`creep-warfare-achievements/{def.id}`). Once earned, achievements stay
 * earned — the later-round requirement-false case doesn't un-earn them.
 */

import {
  createAchievementCategory,
  type AchievementCategory,
  type SpatialGrid,
} from 'open-loop-engine';
import { ref } from 'vue';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  PLAYER_FACTION,
  type CellState,
  type HotspotDef,
} from './content';
import type { RoundSystem } from './round';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

const TOTAL_CELLS = MAP_WIDTH * MAP_HEIGHT;
const FIRST_QUARTER_THRESHOLD = 0.25;
const LANDSLIDE_THRESHOLD = 0.75;
const BLITZKRIEG_MAX_ELAPSED_S = 60;
const TOTAL_DOMINANCE_REQUIRED_S = 30;

export const ACHIEVEMENT_DEFS: readonly AchievementDef[] = [
  {
    id: 'first-quarter',
    title: 'Staked a Claim',
    description: `Own 25% of the map as the ${PLAYER_FACTION} faction.`,
  },
  {
    id: 'landslide',
    title: 'Landslide Victory',
    description: 'End a round holding 75% or more of the map.',
  },
  {
    id: 'sole-survivor',
    title: 'Sole Survivor',
    description: 'End a round as the only surviving faction.',
  },
  {
    id: 'blitzkrieg',
    title: 'Blitzkrieg',
    description: `Wipe out every rival faction in under ${BLITZKRIEG_MAX_ELAPSED_S} seconds.`,
  },
  {
    id: 'total-dominance',
    title: 'Total Dominance',
    description: `Hold every hotspot simultaneously for ${TOTAL_DOMINANCE_REQUIRED_S} continuous seconds.`,
  },
];

export interface AchievementSystem {
  readonly achievements: AchievementCategory<AchievementDef>;
  onEngineTick(dt: number): void;
}

export interface AchievementSystemOptions {
  grid: SpatialGrid<CellState>;
  hotspots: readonly HotspotDef[];
  round: RoundSystem;
}

export function createAchievementSystem(opts: AchievementSystemOptions): AchievementSystem {
  const { grid, hotspots, round } = opts;

  const playerTerritory = ref(0);
  const dominanceHoldS = ref(0);

  const achievements = createAchievementCategory<AchievementDef>({
    id: 'creep-warfare-achievements',
    mapAchievement: (def) => ({
      display: { title: def.title, description: def.description },
      requirement: () => {
        switch (def.id) {
          case 'first-quarter':
            return playerTerritory.value / TOTAL_CELLS >= FIRST_QUARTER_THRESHOLD;
          case 'landslide':
            return (
              round.phase.value === 'ended' &&
              round.stats.value.territory / TOTAL_CELLS >= LANDSLIDE_THRESHOLD
            );
          case 'sole-survivor':
            return round.phase.value === 'ended' && round.stats.value.survivingFactions === 1;
          case 'blitzkrieg':
            return (
              round.phase.value === 'ended' &&
              round.stats.value.survivingFactions === 1 &&
              round.stats.value.elapsed < BLITZKRIEG_MAX_ELAPSED_S
            );
          case 'total-dominance':
            return dominanceHoldS.value >= TOTAL_DOMINANCE_REQUIRED_S;
          default:
            return false;
        }
      },
    }),
  });
  achievements.register([...ACHIEVEMENT_DEFS]);

  function countPlayerTerritory(): number {
    let n = 0;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (grid.at(x, y).owner === PLAYER_FACTION) n++;
      }
    }
    return n;
  }

  function playerHoldsAllHotspots(): boolean {
    for (const h of hotspots) {
      if (grid.at(h.x, h.y).owner !== PLAYER_FACTION) return false;
    }
    return true;
  }

  function onEngineTick(dt: number): void {
    if (dt <= 0) return;
    if (round.phase.value !== 'active') {
      dominanceHoldS.value = 0;
      return;
    }
    playerTerritory.value = countPlayerTerritory();
    if (playerHoldsAllHotspots()) {
      dominanceHoldS.value += dt;
    } else {
      dominanceHoldS.value = 0;
    }
  }

  return { achievements, onEngineTick };
}
