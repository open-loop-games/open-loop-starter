/**
 * Phase-shifter archetype — vars types.
 *
 * The canonical type contract for a Phase-shifter-archetype game. Mirrors
 * the vars schema in archetypes/phase-shifter.md § 5. Games under
 * src/modules/mods/<game>/vars/ implement these interfaces.
 *
 * The archetype is `candidate` — the graduation question is whether the
 * skeleton survives ≥2 real theme passes without collapsing to a modifier
 * layer over Producer or Looper. Types here encode the minimum viable
 * contract; fork-level extension is expected and welcome.
 */
import type { DecimalSource } from 'open-loop-engine';

export type PhaseShifterTransitionMode = 'replace' | 'layer';
export type PhaseShifterNarrativePacing =
  | 'mystery-first'
  | 'thematic-integration'
  | 'hybrid';
export type PhaseShifterCarryOverMode = 'none' | 'soft-prestige' | 'full';
export type PhaseShifterLateModifier = 'spatial' | 'canvas' | 'adventure';

export interface PhaseShifterPhaseDef {
  /** Stable phase identifier used as content-registry tag. */
  id: string;
  /** Display label shown in UI; themeable via theme.phaseLabels. */
  label: string;
}

/**
 * Phase list + transition semantics + narrative pacing. Diverging here
 * constitutes "forking the skeleton" rather than tuning — phase-count,
 * transition mode, and narrative pacing distinguish sub-variants of
 * Phase-shifter (Paperclips 'replace' / Dark-Room + Candy-Box 'layer').
 */
export interface PhaseShifterArchetypeVars {
  /** Named phases in arc order. At least 2 required; 3–4 is the exemplar baseline. */
  phases: PhaseShifterPhaseDef[];

  /**
   * Default transition mode applied to every phase unless overridden per-phase
   * in balance.transitionMode. 'replace' disables Phase-N content on transition;
   * 'layer' keeps Phase-N content active alongside Phase-(N+1).
   */
  defaultTransitionMode: PhaseShifterTransitionMode;

  /** Which Narrative Systems sub-patterns the skeleton adopts. */
  narrativePacing: PhaseShifterNarrativePacing;

  /** Carry-over across phase transitions; 'soft-prestige' activates balance.softCarryOver. */
  carryOverMode: PhaseShifterCarryOverMode;

  /** Late-phase shape tags — each tag activates a corresponding optional modifier. */
  lateModifiers: PhaseShifterLateModifier[];

  /** Does arc closure branch into multiple terminal states? */
  multiEnding: boolean;
}

export type PhaseShifterTriggerKind =
  | 'resource'
  | 'action-count'
  | 'milestone-flag'
  | 'combined';

/**
 * Transition predicate spec. Shape varies by kind; each kind's spec is
 * validated at fork time. `combined` holds an array of sub-specs; all
 * sub-predicates must hold for the combined predicate to fire.
 */
export interface PhaseShifterTransitionThreshold {
  kind: PhaseShifterTriggerKind;
  /**
   * Kind-discriminated payload:
   *  - kind 'resource'        → { resourceId: string; threshold: DecimalSource }
   *  - kind 'action-count'    → { actionId: string; count: number }
   *  - kind 'milestone-flag'  → { flagIds: string[] }
   *  - kind 'combined'        → { subs: Array<{ kind, spec }> }
   * Shape is `unknown` at the type level to keep the surface fork-extensible.
   */
  spec: unknown;
  /** Optional deferred-fire delay in sim-seconds (tension-beat pacing). */
  deferSeconds?: number;
}

export type PhaseShifterCostCurve =
  | 'linear'
  | 'polynomial'
  | 'exponential'
  | 'log-polynomial';

export interface PhaseShifterPhaseCostScaling {
  curve: PhaseShifterCostCurve;
  baseCost: DecimalSource;
  /** Polynomial exponent OR exponential base, depending on curve shape. */
  growth: number;
}

export interface PhaseShifterPhaseDurationTarget {
  /** Sim-minutes lower bound. */
  min: number;
  /** Sim-minutes upper bound; sum across phases ≤ 120 for the 1–2h arc constraint. */
  max: number;
}

export type PhaseShifterSoftCarryOverFormula = 'sqrt' | 'log' | 'linear';

export interface PhaseShifterSoftCarryOver {
  /** Per-unit multiplier bonus; Paperclips prestigeU default ≈ 0.10. */
  perUnitBonus: number;
  /** In-run resource id whose value at transition converts to carry-over units. */
  sourceResourceId: string;
  /** Conversion shape from sourceResource total → carry-over units. */
  conversionFormula: PhaseShifterSoftCarryOverFormula;
  /** Optional cap on carry-over units per transition. */
  cap?: DecimalSource;
}

export type PhaseShifterMilestoneTriggerKind =
  | 'resource'
  | 'action-count'
  | 'time-in-phase'
  | 'purchasable-owned';

export interface PhaseShifterNarrativeMilestone {
  /** Flag id set on trigger; consumed by downstream `when` predicates. */
  id: string;
  /** Phase.id the milestone lives within. */
  phase: string;
  trigger: {
    kind: PhaseShifterMilestoneTriggerKind;
    /**
     * Kind-discriminated payload — mirrors PhaseShifterTransitionThreshold.spec.
     * `time-in-phase` spec: `{ seconds: number }`; others per the transition-
     * threshold doc in archetype § 5.
     */
    spec: unknown;
  };
}

/**
 * Costume over the skeleton. Zero mechanical impact — names, flavour,
 * UI copy only. Swapping themes does not affect beat timing or phase
 * lifecycle semantics.
 */
export interface PhaseShifterPhaseCopy {
  /** Narrative log entry fired on phase-entry. */
  onEnter: string;
  /** Narrative log entry fired on phase-exit; frames the next phase. */
  onExit: string;
  /** Optional ambient narrative lines interspersed across phase duration. */
  ambientLog?: string[];
}

export interface PhaseShifterMechanicLifecycleCopy {
  /** Text shown when new content appears on phase entry. */
  onInstall: string;
  /** Text shown when Phase-N content retires under 'replace' mode. */
  onDisable: string;
  /** Text shown when a mechanic is replaced in place (Dark Room Room → Outside). */
  onReplace: string;
}

export interface PhaseShifterThemeVars {
  /** Per-phase display labels (id → label override; unknown ids ignored). */
  phaseLabels: Record<string, string>;
  /** Per-phase narrative hooks — enter + exit + ambient log copy. */
  phaseCopy: Record<string, PhaseShifterPhaseCopy>;
  /** Milestone flavour copy keyed by milestone.id. */
  milestoneCopy: Record<string, string>;
  /** Mandatory lifecycle-toast copy; fires on phase-transition events. */
  mechanicLifecycleCopy: PhaseShifterMechanicLifecycleCopy;
  /** End-of-arc flavour text; fires at beat 7. */
  endOfArcMessage: string;
}

/**
 * Mechanical overrides. Beat timing is a function of these; changes
 * must be validated against beat-map tolerances in archetypes/phase-shifter.md § 6.
 */
export interface PhaseShifterBalanceVars {
  /** Per-phase transition thresholds (keyed by phase.id). The dominant pacing lever. */
  transitionThresholds: Record<string, PhaseShifterTransitionThreshold>;
  /** Per-phase transition-mode override (archetype-level default otherwise). */
  transitionMode: Record<string, PhaseShifterTransitionMode>;
  /** Per-phase intra-phase cost curves. */
  phaseCostScaling: Record<string, PhaseShifterPhaseCostScaling>;
  /** Per-phase target sim-time duration bands (beat-tolerance anchors). */
  phaseDurationTargets: Record<string, PhaseShifterPhaseDurationTarget>;
  /** Soft carry-over parameters — active only when archetype.carryOverMode === 'soft-prestige'. */
  softCarryOver?: PhaseShifterSoftCarryOver;
  /** Narrative-milestone trigger declarations; shape the intra-phase reveal cadence. */
  narrativeMilestones: PhaseShifterNarrativeMilestone[];
}

export interface PhaseShifterVars {
  archetype: PhaseShifterArchetypeVars;
  theme: PhaseShifterThemeVars;
  balance: PhaseShifterBalanceVars;
}

export interface PhaseShifterBalanceVarsOverride {
  transitionThresholds?: Record<string, PhaseShifterTransitionThreshold>;
  transitionMode?: Record<string, PhaseShifterTransitionMode>;
  phaseCostScaling?: Record<string, PhaseShifterPhaseCostScaling>;
  phaseDurationTargets?: Record<string, PhaseShifterPhaseDurationTarget>;
  softCarryOver?: PhaseShifterSoftCarryOver;
  narrativeMilestones?: PhaseShifterNarrativeMilestone[];
}

export type PhaseShifterVarsOverride = {
  archetype?: Partial<PhaseShifterArchetypeVars>;
  theme?: Partial<PhaseShifterThemeVars>;
  balance?: PhaseShifterBalanceVarsOverride;
};
