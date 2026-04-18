/**
 * AI goal-picker (OL-509).
 *
 * Every {@link AI_INTERVAL_S} seconds each non-player faction:
 *   1. sweeps completed goals off its slot (delegated to the goal system),
 *   2. scores every uncompleted candidate from its goal pool,
 *   3. fills open capacity with the top-scoring choices.
 *
 * Personalities share one scoring function; differentiation lives entirely
 * in {@link AI_PERSONALITIES}. Adding a fifth style is a weight table, not
 * a code branch.
 *
 * Completion is handled by the goal system's predicates (claim:hotspot-*
 * drops when any faction claims it; defend:sector-* drops when the faction
 * has no threatened frontier in that quadrant; pressure:faction-Y drops
 * when Y's territory falls at or below this faction's). PES automatically
 * strips the modifier the tick a goal completes; the sweep frees the slot.
 */

import type { SpatialGrid } from 'open-loop-engine';
import {
  AI_INTERVAL_S,
  AI_PERSONALITIES,
  FACTION_IDS,
  FACTION_PERSONALITIES,
  MAP_HEIGHT,
  MAP_WIDTH,
  PLAYER_FACTION,
  type AiWeights,
  type CellState,
  type FactionId,
  type GoalId,
  type HotspotDef,
  type SectorId,
  type SpawnDef,
} from './content';
import type { GoalSystem } from './goals';

const NON_PLAYER_FACTIONS = FACTION_IDS.filter(
  (f): f is Exclude<FactionId, typeof PLAYER_FACTION> => f !== PLAYER_FACTION,
);

interface WorldView {
  /** Territory cell count per faction. */
  territory: Record<FactionId, number>;
  /** Threatened frontier count per (faction, sector). */
  sectorThreat: Record<FactionId, Record<SectorId, number>>;
  /** Map from hotspot id → current owner (null if unclaimed). */
  hotspotOwner: Record<string, FactionId | null>;
}

export interface AiSystemOptions {
  grid: SpatialGrid<CellState>;
  goals: GoalSystem;
  hotspots: readonly HotspotDef[];
  spawns: readonly SpawnDef[];
}

export interface AiSystem {
  /** Run one goal-picker cycle. Exposed for tests and deterministic stepping. */
  tickOnce(): void;
  /** Engine `onTick` handler — accumulates dt and fires `tickOnce` at AI_INTERVAL_S. */
  onEngineTick(dt: number): void;
}

function sectorOf(x: number, y: number): SectorId {
  const midX = Math.floor(MAP_WIDTH / 2);
  const midY = Math.floor(MAP_HEIGHT / 2);
  if (x < midX && y < midY) return 'nw';
  if (x >= midX && y < midY) return 'ne';
  if (x < midX && y >= midY) return 'sw';
  return 'se';
}

function buildWorldView(
  grid: SpatialGrid<CellState>,
  hotspots: readonly HotspotDef[],
): WorldView {
  const territory: Record<FactionId, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
  const sectorThreat: Record<FactionId, Record<SectorId, number>> = {
    red: { nw: 0, ne: 0, sw: 0, se: 0 },
    blue: { nw: 0, ne: 0, sw: 0, se: 0 },
    green: { nw: 0, ne: 0, sw: 0, se: 0 },
    yellow: { nw: 0, ne: 0, sw: 0, se: 0 },
  };

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const cell = grid.at(x, y);
      if (cell.owner === null) continue;
      territory[cell.owner]++;
      let threatened = false;
      for (const n of grid.neighbors(x, y)) {
        const nOwner = grid.at(n.x, n.y).owner;
        if (nOwner !== null && nOwner !== cell.owner) {
          threatened = true;
          break;
        }
      }
      if (threatened) sectorThreat[cell.owner][sectorOf(x, y)]++;
    }
  }

  const hotspotOwner: Record<string, FactionId | null> = {};
  for (const h of hotspots) hotspotOwner[h.id] = grid.at(h.x, h.y).owner;

  return { territory, sectorThreat, hotspotOwner };
}

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function scoreGoal(
  faction: FactionId,
  goalId: GoalId,
  world: WorldView,
  weights: AiWeights,
  hotspots: readonly HotspotDef[],
  spawn: SpawnDef,
  nearestUnclaimedHotspot: HotspotDef | null,
): number {
  if (goalId.startsWith('claim:hotspot-')) {
    const hid = goalId.slice('claim:hotspot-'.length);
    const h = hotspots.find((x) => x.id === hid);
    if (h == null) return 0;
    // Proximity term: farther = lower score. Normalise against map diagonal.
    const dist = manhattan(spawn.x, spawn.y, h.x, h.y);
    const proximity = 1 - dist / (MAP_WIDTH + MAP_HEIGHT);
    const nearestBonus = nearestUnclaimedHotspot?.id === hid ? 1 : 0;
    return weights.hotspotProximity * proximity + weights.hotspotNearestBias * nearestBonus;
  }
  if (goalId.startsWith('defend:sector-')) {
    const sector = goalId.slice('defend:sector-'.length) as SectorId;
    return weights.sectorThreat * world.sectorThreat[faction][sector];
  }
  if (goalId.startsWith('pressure:faction-')) {
    const target = goalId.slice('pressure:faction-'.length) as FactionId;
    const lead = world.territory[target] - world.territory[faction];
    return weights.enemyDominance * Math.max(0, lead);
  }
  return 0;
}

export function createAiSystem(options: AiSystemOptions): AiSystem {
  const { grid, goals, hotspots, spawns } = options;
  const spawnByFaction = new Map<FactionId, SpawnDef>();
  for (const s of spawns) spawnByFaction.set(s.faction, s);
  let acc = 0;

  function tickOnce(): void {
    goals.sweepCompleted();
    const world = buildWorldView(grid, hotspots);

    for (const faction of NON_PLAYER_FACTIONS) {
      const personality = FACTION_PERSONALITIES[faction];
      const weights = AI_PERSONALITIES[personality];
      const slot = goals.slots[faction];
      const spawn = spawnByFaction.get(faction);
      if (spawn == null) continue;

      // "Greedy" bias: identify the single nearest unclaimed hotspot once.
      let nearest: HotspotDef | null = null;
      let nearestDist = Infinity;
      for (const h of hotspots) {
        if (world.hotspotOwner[h.id] !== null) continue;
        const d = manhattan(spawn.x, spawn.y, h.x, h.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = h;
        }
      }

      const selected = new Set(slot.selected.value);
      const candidates: Array<{ id: GoalId; score: number }> = [];
      for (const goalId of goals.goalPoolFor(faction)) {
        if (selected.has(goalId)) continue;
        if (goals.isGoalCompleted(faction, goalId)) continue;
        const score = scoreGoal(faction, goalId, world, weights, hotspots, spawn, nearest);
        candidates.push({ id: goalId, score });
      }
      candidates.sort((a, b) => b.score - a.score);

      // `slot.select` returns false at capacity, so we don't need to pre-count.
      for (const c of candidates) {
        if (c.score <= 0) break;
        if (!slot.select(c.id)) break;
      }
    }
  }

  function onEngineTick(dt: number): void {
    acc += dt;
    while (acc >= AI_INTERVAL_S) {
      acc -= AI_INTERVAL_S;
      tickOnce();
    }
  }

  return { tickOnce, onEngineTick };
}
