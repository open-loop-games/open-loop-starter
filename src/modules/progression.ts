/**
 * Progression domain — achievements, milestone tracking, best-of records.
 *
 * Engine systems demonstrated:
 *   - createAchievementCategory (batch achievement registration with auto-complete)
 *   - createBestOf (per-metric best-of-run tracking)
 *
 * Depends on gathering for resources and skill levels used in achievement
 * conditions. Wires the earned-achievement count back to gathering's
 * automation tier system so queue execution unlocks as milestones are hit.
 *
 * Cross-references:
 *   - gathering.ts provides resources + skills read by achievement conditions
 *   - gathering.ts consumes earnedAchievementCount for automation tiers
 *   - loop.ts (OL-363) will wire best-of into loop-log for automatic tracking
 */
import {
  Decimal,
  createAchievementCategory,
  createBestOf,
  type EngineModule,
  type EngineContext,
  type AchievementCategory,
  type BestOf,
} from 'open-loop-engine';
import { gatheringState, setEarnedAchievementCount } from './gathering';

// ============================================================================
// Types
// ============================================================================

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** Resource or stat to check — closure over gathering state */
  requirement: () => boolean;
}

export interface ProgressionState {
  achievements: AchievementCategory<AchievementDef>;
  bestOf: BestOf;
}

export let progressionState: ProgressionState | null = null;

// ============================================================================
// Module
// ============================================================================

export const progressionModule: EngineModule = {
  id: 'progression',
  dependencies: ['settings', 'ui-registry', 'gathering'],
  install(_ctx: EngineContext) {
    const g = gatheringState!;
    const { wood, stone, gold } = g.resources;
    const woodcutting = g.skills.getSkill('woodcutting')!;

    // --- Achievements (via category) ----------------------------------------
    // Defs carry display + a requirement closure. mapAchievement converts to
    // AchievementOptions with a computed requirement — createAchievement's
    // built-in Vue watch handles auto-complete, no tick polling needed.
    const achievements = createAchievementCategory<AchievementDef>({
      id: 'core-achievements',
      mapAchievement: (def) => ({
        display: { title: def.title, description: def.description },
        requirement: () => def.requirement(),
      }),
    });

    achievements.register([
      {
        id: 'first-wood',
        title: 'First Wood',
        description: 'Gather any wood.',
        requirement: () => Decimal.gt(wood.value, 0),
      },
      {
        id: 'lumberjack',
        title: 'Lumberjack',
        description: 'Accumulate 100 wood.',
        requirement: () => Decimal.gte(wood.value, 100),
      },
      {
        id: 'stonecarver',
        title: 'Stonecarver',
        description: 'Accumulate 50 stone.',
        requirement: () => Decimal.gte(stone.value, 50),
      },
      {
        id: 'merchant',
        title: 'Merchant',
        description: 'Earn 20 gold.',
        requirement: () => Decimal.gte(gold.value, 20),
      },
      {
        id: 'master-woodcutter',
        title: 'Master Woodcutter',
        description: 'Reach Woodcutting level 10.',
        requirement: () => Decimal.gte(woodcutting.level.value, 10),
      },
    ]);

    // Wire earned count to gathering's automation tier system
    setEarnedAchievementCount(() => achievements.earnedCount.value);

    // --- Best-of tracking ---------------------------------------------------
    // Tracks per-run high-water marks for key metrics. Loop integration
    // (auto-submit on finalize) is wired by OL-363 when loop-log lands.
    // For now, metrics are declared but submit() must be called manually.
    const bestOf = createBestOf({
      id: 'progression-best',
      metrics: {
        wood: { mode: 'absolute' },
        stone: { mode: 'absolute' },
        gold: { mode: 'absolute' },
        'woodcutting-level': { mode: 'absolute' },
      },
    });

    progressionState = { achievements, bestOf };
  },
};
