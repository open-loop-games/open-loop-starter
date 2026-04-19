/**
 * Scripter archetype — vars types.
 *
 * The canonical type contract for a Scripter-archetype game. Mirrors
 * the vars schema in archetypes/scripter.md § 5. Games under
 * src/modules/mods/<game>/vars/ implement these interfaces.
 */
import type { DecimalSource } from 'open-loop-engine';

export type ScripterTierCeiling = 'queue' | 'dsl' | 'meta';
export type ScripterAuthoringSurface = 'text' | 'visual-blocks' | 'hybrid';
export type ScripterSafetyMode = 'strict' | 'lenient';
export type Tier2UnlockTrigger = 'action-count' | 'resource' | 'script-execution-count';
export type Tier3UnlockTrigger = 'prestige-count' | 'resource' | 'augmentations-owned';

/**
 * Authoring-surface + tier-ceiling + persistence shape. Diverging here
 * constitutes "forking the skeleton" rather than tuning — tier ceiling
 * and authoring surface distinguish sub-variants of Scripter (tier-1
 * queue vs tier-2 DSL vs tier-3 meta-programming).
 */
export interface ScripterArchetypeVars {
  /** Tier ceiling for the skeleton. 'queue' = tier-1 only (Cavernous II shape); 'dsl' = tier-2 unlocked (Antimatter Automator shape); 'meta' = tier-3 unlocked (Bitburner shape). Default 'dsl'. */
  tierCeiling: ScripterTierCeiling;
  /** Authoring surface. 'text' is default for DSL+; 'visual-blocks' is Antimatter-Automator-style; 'hybrid' ships both compiling to the same AST. Default 'text'. */
  authoringSurface: ScripterAuthoringSurface;

  /** Dispatchable commands at tier-1. Default 12. */
  commandCount: number;
  /** Additional commands unlocked at tier-2. Default 24. */
  tier2CommandCount: number;
  /** Additional commands unlocked at tier-3; unset unless tierCeiling === 'meta'. Default 0. */
  tier3CommandCount: number;

  /** Number of saved script slots. Default 5. */
  scriptSlotCount: number;
  /** Scripts survive prestige resets — signature archetype commitment. Default true. */
  persistAcrossPrestige: boolean;

  /** Concurrent scripts; > 1 activates Bitburner-style multi-agent scheduling. Default 1. */
  concurrentScripts: number;
  /** Sandbox safety mode. 'lenient' disables iteration caps for debugging. Default 'strict'. */
  safetyMode: ScripterSafetyMode;
}

export interface ScripterCommandName {
  /** Stable command id referenced by scripts (`buy`, `hack`, etc.). */
  id: string;
  /** Display label for the command reference UI. */
  label: string;
  /** One-line description used in tooltips / help panels. */
  description: string;
  /** Tier at which this command becomes available. */
  tier: 1 | 2 | 3;
}

/**
 * Costume over the skeleton. Zero mechanical impact — names, flavour,
 * UI copy only. Swapping themes does not affect beat timing.
 */
export interface ScripterThemeVars {
  /** Command-name mapping. Length ≈ commandCount + tier2CommandCount (+ tier3CommandCount when meta). */
  commandNames: ScripterCommandName[];
  /** Keyword mapping for the DSL — 'buy' could become 'cast', 'acquire', 'dispatch'. */
  dslKeywords: Record<string, string>;
  /** Execution verb ('run' / 'execute' / 'invoke' / 'dispatch' / 'cast' / 'tend'). */
  runVerb: string;
  /** Editor label ('Script Editor' / 'Grimoire' / "Captain's Terminal" / 'Growth Plan'). */
  editorLabel: string;
  /** End-of-arc flavour text; fires at beat 8. */
  endOfArcMessage: string;
}

export interface ScripterTier2UnlockThreshold {
  trigger: Tier2UnlockTrigger;
  value: DecimalSource;
}

export interface ScripterTier3UnlockThreshold {
  trigger: Tier3UnlockTrigger;
  value: DecimalSource;
}

export interface ScripterActionTiming {
  /** Sim-seconds the action takes to complete. */
  baseDuration: number;
  /** Resource costs consumed on dispatch. */
  costs: Record<string, DecimalSource>;
  /** Optional yields produced on completion. */
  yield?: Record<string, DecimalSource>;
}

/**
 * Mechanical overrides. Beat timing is a function of these; changes
 * must be validated against beat-map tolerances in archetypes/scripter.md § 6.
 */
export interface ScripterBalanceVars {
  /** Beat-6 pacing lever — when the text DSL unlocks. */
  tier2UnlockThreshold: ScripterTier2UnlockThreshold;
  /** Optional tier-3 gate; undefined disables tier-3 regardless of tierCeiling. */
  tier3UnlockThreshold?: ScripterTier3UnlockThreshold;

  /** Per-command dispatch timing + cost + yield. Keyed by command id. */
  actionTimings: Record<string, ScripterActionTiming>;

  /** Maximum script iterations per frame — sandbox safety limit. Default 10_000. */
  maxIterationsPerFrame: number;
  /** Maximum nested loop depth. Default 10. */
  maxLoopDepth: number;
  /** Maximum per-invocation script runtime in ms. Default 5_000. */
  maxScriptRuntimeMs: number;
  /** Concurrent actions the script can dispatch simultaneously. Default 1 at tier-1. */
  maxConcurrentActions: number;

  /** Augmentation / glyph / source-file multiplier curve. */
  augmentationCurve: {
    /** Canonical form: multiplier = 1 + (augs^exponent) / divisor. Default 0.75. */
    exponent: number;
    /** Divisor in the canonical form. Default 20. */
    divisor: number;
  };
  augmentationCostScaling: {
    baseCost: DecimalSource;
    /** Multiplier per purchase. Default 1.5. */
    costGrowth: number;
  };

  /** How script quality compounds. */
  scriptEfficiencyBonus: {
    /** Per-statement efficiency bonus; 0.002 = 0.2% per statement in a running script. */
    perStatementBonus: number;
    /** Per-distinct-command bonus; 0.05 = 5% per distinct command used. */
    perUniqueCommandBonus: number;
    /** Cap on the combined script-quality multiplier. Default 3.0. */
    efficiencyCap: number;
  };
}

export interface ScripterVars {
  archetype: ScripterArchetypeVars;
  theme: ScripterThemeVars;
  balance: ScripterBalanceVars;
}

export interface ScripterBalanceVarsOverride {
  tier2UnlockThreshold?: ScripterTier2UnlockThreshold;
  tier3UnlockThreshold?: ScripterTier3UnlockThreshold;
  actionTimings?: Record<string, ScripterActionTiming>;
  maxIterationsPerFrame?: number;
  maxLoopDepth?: number;
  maxScriptRuntimeMs?: number;
  maxConcurrentActions?: number;
  augmentationCurve?: Partial<ScripterBalanceVars['augmentationCurve']>;
  augmentationCostScaling?: Partial<ScripterBalanceVars['augmentationCostScaling']>;
  scriptEfficiencyBonus?: Partial<ScripterBalanceVars['scriptEfficiencyBonus']>;
}

export type ScripterVarsOverride = {
  archetype?: Partial<ScripterArchetypeVars>;
  theme?: Partial<ScripterThemeVars>;
  balance?: ScripterBalanceVarsOverride;
};
