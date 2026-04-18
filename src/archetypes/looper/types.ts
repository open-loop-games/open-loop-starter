/**
 * Looper archetype — vars types.
 *
 * The canonical type contract for a Looper-archetype game. Mirrors the
 * vars schema in archetypes/looper.md § 5. Games under
 * src/modules/mods/<game>/vars/ implement these interfaces.
 */
import type { DecimalSource } from 'open-loop-engine';

export type LoopTriggerMode = 'resource-depletion' | 'death' | 'manual' | 'hybrid';
export type QueueMode = 'single' | 'dual-edit-active';
export type AutomationUnlockTier = 'beat-6' | 'beat-7' | 'beat-8' | 'disabled';
export type XpToLevelFormula = 'sqrt' | 'log2' | 'linear';
export type ZoneUnlockTrigger = 'action-completion-count' | 'skill-level' | 'loop-count';

/**
 * Skeleton shape. Diverging here constitutes "forking the skeleton"
 * rather than tuning — the retention architecture, queue shape, and
 * loop-trigger mode distinguish sub-variants of Looper.
 */
export interface LooperArchetypeVars {
  loopTriggerMode: LoopTriggerMode;
  queueMode: QueueMode;
  zoneCount: number;
  skillCount: number;
  actionCount: number;
  retentionTrackCount: number;
  automationUnlockTier: AutomationUnlockTier;
}

/**
 * Costume over the skeleton. Zero mechanical impact — names, flavour,
 * UI copy only. Swapping themes does not affect beat timing.
 */
export interface LooperThemeVars {
  timeResourceName: { singular: string; plural: string };
  loopCompletionVerb: string;
  /** Length must equal LooperArchetypeVars.retentionTrackCount. */
  retentionTrackNames: string[];
  /** Length must equal LooperArchetypeVars.zoneCount. */
  zoneNames: string[];
  /** Length must equal LooperArchetypeVars.skillCount. */
  skillNames: string[];
  actionFlavour: Array<{ label: string; description: string; zone: string }>;
  endOfArcMessage: string;
}

export interface ZoneUnlockThreshold {
  zone: string;
  trigger: ZoneUnlockTrigger;
  value: number;
}

/**
 * Mechanical overrides. Beat timing is a function of these; changes
 * must be validated against beat-map tolerances in archetypes/looper.md § 6.
 */
export interface LooperBalanceVars {
  timeResourcePoolBase: DecimalSource;
  /** Target sim-seconds for the first loop to complete. */
  firstLoopTargetDuration: number;

  actionCostScaling: {
    baseCost: DecimalSource;
    /** cost = base / (1 + level / skillLevelDivisor) */
    skillLevelDivisor: number;
  };

  skillLeveling: {
    xpPerAction: DecimalSource;
    xpToLevelFormula: XpToLevelFormula;
    xpToLevelDivisor: number;
  };

  /**
   * Canonical retention curve: multiplier = 1 + (track^exponent) / divisor.
   * Default shape (exponent 0.8, divisor 30) mirrors idle-loops-ng soulstones.
   */
  retentionCurve: {
    exponent: number;
    divisor: number;
  };

  zoneUnlockThresholds: ZoneUnlockThreshold[];

  /** Loop N at which automation tier 1 becomes available. */
  automationUnlockLoop: number;
}

export interface LooperVars {
  archetype: LooperArchetypeVars;
  theme: LooperThemeVars;
  balance: LooperBalanceVars;
}

export type LooperVarsOverride = {
  archetype?: Partial<LooperArchetypeVars>;
  theme?: Partial<LooperThemeVars>;
  balance?: DeepPartial<LooperBalanceVars>;
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<U>
      : DeepPartial<T[K]>
    : T[K];
};
