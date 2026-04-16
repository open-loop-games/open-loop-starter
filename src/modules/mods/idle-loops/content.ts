/**
 * Idle-loops mod — pure data tables.
 *
 * No engine imports. Stat defs, zone defs, action defs, achievement defs,
 * and the tier-0 seed queue. Consumed by the sibling factory files.
 */

// ============================================================================
// Stat definitions
// ============================================================================

export interface StatDef {
  id: string;
  description: string;
  /** XP per level — higher means slower leveling */
  xpDivisor: number;
  /** Fraction of level retained per loop (accumulator mode) */
  retentionRate: number;
}

export const statDefs: StatDef[] = [
  { id: 'str', description: 'Strength', xpDivisor: 10, retentionRate: 0.15 },
  { id: 'int', description: 'Intelligence', xpDivisor: 12, retentionRate: 0.10 },
  { id: 'dex', description: 'Dexterity', xpDivisor: 8, retentionRate: 0.12 },
  { id: 'con', description: 'Constitution', xpDivisor: 14, retentionRate: 0.08 },
];

// ============================================================================
// Zone definitions
// ============================================================================

export interface ZoneDef {
  id: string;
  name: string;
  order: number;
}

export const zoneDefs: ZoneDef[] = [
  { id: 'beginnersville', name: 'Beginnersville', order: 0 },
  { id: 'forest-path', name: 'Forest Path', order: 1 },
];

// ============================================================================
// Action definitions
// ============================================================================

export interface ActionDef {
  id: string;
  display: string;
  zone: string;
  /** Base duration in seconds (reduced by stat levels) */
  baseDuration: number;
  /** Stat weights for duration/mana-cost reduction. Keys are stat IDs. */
  statWeights: Record<string, number>;
  /** XP granted per completion. Keys are stat IDs. */
  xpGrants: Record<string, number>;
  /** Minimum stat levels required to attempt this action. */
  requiredStats?: Record<string, number>;
}

export const actionDefs: ActionDef[] = [
  // --- Beginnersville (7) ---
  {
    id: 'train-str',
    display: 'Train Strength',
    zone: 'beginnersville',
    baseDuration: 2,
    statWeights: { str: 0.8, con: 0.2 },
    xpGrants: { str: 5 },
  },
  {
    id: 'train-int',
    display: 'Study Magic',
    zone: 'beginnersville',
    baseDuration: 2.5,
    statWeights: { int: 0.8, con: 0.2 },
    xpGrants: { int: 5 },
  },
  {
    id: 'train-dex',
    display: 'Practice Agility',
    zone: 'beginnersville',
    baseDuration: 1.5,
    statWeights: { dex: 0.8, con: 0.2 },
    xpGrants: { dex: 3 },
  },
  {
    id: 'train-con',
    display: 'Endurance Drill',
    zone: 'beginnersville',
    baseDuration: 3,
    statWeights: { con: 0.8, str: 0.2 },
    xpGrants: { con: 5 },
  },
  {
    id: 'meditate',
    display: 'Meditate',
    zone: 'beginnersville',
    baseDuration: 4,
    statWeights: { int: 0.5, con: 0.5 },
    xpGrants: { int: 4, con: 3 },
  },
  {
    id: 'rest',
    display: 'Rest at Inn',
    zone: 'beginnersville',
    baseDuration: 1,
    statWeights: { con: 1.0 },
    xpGrants: {},
  },
  {
    id: 'patrol',
    display: 'Patrol Streets',
    zone: 'beginnersville',
    baseDuration: 3,
    statWeights: { str: 0.4, dex: 0.4, con: 0.2 },
    xpGrants: { str: 3, dex: 3 },
  },

  // --- Forest Path (5) ---
  {
    id: 'explore-forest',
    display: 'Explore Forest',
    zone: 'forest-path',
    baseDuration: 4,
    statWeights: { dex: 0.6, con: 0.4 },
    xpGrants: { dex: 8 },
  },
  {
    id: 'chop-lumber',
    display: 'Chop Lumber',
    zone: 'forest-path',
    baseDuration: 5,
    statWeights: { str: 0.7, con: 0.3 },
    xpGrants: { str: 12 },
  },
  {
    id: 'hunt-boar',
    display: 'Hunt Boar',
    zone: 'forest-path',
    baseDuration: 6,
    statWeights: { str: 0.4, dex: 0.3, con: 0.3 },
    xpGrants: { str: 6, dex: 5, con: 4 },
    requiredStats: { str: 8 },
  },
  {
    id: 'study-runes',
    display: 'Study Ancient Runes',
    zone: 'forest-path',
    baseDuration: 7,
    statWeights: { int: 0.7, con: 0.3 },
    xpGrants: { int: 15 },
    requiredStats: { int: 6 },
  },
  {
    id: 'dungeon-sprint',
    display: 'Dungeon Sprint',
    zone: 'forest-path',
    baseDuration: 10,
    statWeights: { str: 0.3, int: 0.2, dex: 0.3, con: 0.2 },
    xpGrants: { str: 8, int: 6, dex: 8, con: 5 },
    requiredStats: { str: 12, dex: 8 },
  },
];

// ============================================================================
// Achievement definitions
// ============================================================================

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export const achievementDefs: AchievementDef[] = [
  { id: 'first-loop', title: 'First Loop', description: 'Complete your first loop.' },
  { id: 'str-5', title: 'Strong Start', description: 'Reach Strength level 5.' },
  { id: 'all-stats-3', title: 'Well-Rounded', description: 'Reach level 3 in all stats.' },
  { id: 'forest-unlocked', title: 'Into the Woods', description: 'Unlock the Forest Path.' },
  { id: 'dungeon-clear', title: 'Dungeon Runner', description: 'Complete a Dungeon Sprint.' },
  { id: 'loop-10', title: 'Looper', description: 'Complete 10 loops.' },
];

// ============================================================================
// Tier-0 seed queue
// ============================================================================

/** Deterministic starting queue — gives tier-0 a complete first run. */
export const seedQueue: string[] = [
  'train-str',
  'train-str',
  'train-str',
  'train-int',
  'train-dex',
  'train-con',
  'patrol',
  'meditate',
];
