/**
 * Phase-shifter archetype — public API.
 *
 * Games under src/modules/mods/<game>/vars/ import types and defaults from
 * here, or (once codegen lands) receive copies emitted by
 * `pnpm codegen:archetype-vars phase-shifter`.
 */
export type {
  PhaseShifterArchetypeVars,
  PhaseShifterThemeVars,
  PhaseShifterBalanceVars,
  PhaseShifterVars,
  PhaseShifterVarsOverride,
  PhaseShifterBalanceVarsOverride,
  PhaseShifterPhaseDef,
  PhaseShifterPhaseCopy,
  PhaseShifterMechanicLifecycleCopy,
  PhaseShifterTransitionMode,
  PhaseShifterNarrativePacing,
  PhaseShifterCarryOverMode,
  PhaseShifterLateModifier,
  PhaseShifterTransitionThreshold,
  PhaseShifterTriggerKind,
  PhaseShifterPhaseCostScaling,
  PhaseShifterCostCurve,
  PhaseShifterPhaseDurationTarget,
  PhaseShifterSoftCarryOver,
  PhaseShifterSoftCarryOverFormula,
  PhaseShifterNarrativeMilestone,
  PhaseShifterMilestoneTriggerKind,
} from './types';

export {
  DEFAULT_PHASE_SHIFTER_ARCHETYPE_VARS,
  DEFAULT_PHASE_SHIFTER_THEME_VARS,
  DEFAULT_PHASE_SHIFTER_BALANCE_VARS,
  DEFAULT_PHASE_SHIFTER_VARS,
} from './vars';

export { loadPhaseShifterVars } from './load';
