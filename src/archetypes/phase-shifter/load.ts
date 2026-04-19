/**
 * Phase-shifter archetype — vars loader.
 *
 * Deep-merges archetype → theme → balance in that order. Mirrors the
 * looper / interlocker / producer / scaler / explorer / scripter loaders
 * — kept deliberately unabstracted so each archetype's merge semantics
 * stay local.
 *
 * Per-phase balance fields (`transitionThresholds`, `transitionMode`,
 * `phaseCostScaling`, `phaseDurationTargets`) merge by-phase-id:
 * overridden entries replace the base entry wholesale, unspecified
 * phases keep the base. `narrativeMilestones` is array-typed and
 * replaces wholesale — forks that want to add milestones rebuild the
 * array explicitly. `softCarryOver` is a single-shape struct that
 * merges shallowly.
 */
import { DEFAULT_PHASE_SHIFTER_VARS } from './defaults';
import type {
  PhaseShifterVars,
  PhaseShifterVarsOverride,
} from './types';

export function loadPhaseShifterVars(
  ...overrides: PhaseShifterVarsOverride[]
): PhaseShifterVars {
  return overrides.reduce<PhaseShifterVars>(
    (acc, override) => mergePhaseShifterVars(acc, override),
    DEFAULT_PHASE_SHIFTER_VARS,
  );
}

function mergePhaseShifterVars(
  base: PhaseShifterVars,
  override: PhaseShifterVarsOverride,
): PhaseShifterVars {
  return {
    archetype: { ...base.archetype, ...(override.archetype ?? {}) },
    theme: mergeTheme(base.theme, override.theme),
    balance: mergeBalance(base.balance, override.balance),
  };
}

function mergeTheme(
  base: PhaseShifterVars['theme'],
  override: PhaseShifterVarsOverride['theme'],
): PhaseShifterVars['theme'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    phaseLabels: { ...base.phaseLabels, ...(override.phaseLabels ?? {}) },
    phaseCopy: { ...base.phaseCopy, ...(override.phaseCopy ?? {}) },
    milestoneCopy: { ...base.milestoneCopy, ...(override.milestoneCopy ?? {}) },
    mechanicLifecycleCopy: {
      ...base.mechanicLifecycleCopy,
      ...(override.mechanicLifecycleCopy ?? {}),
    },
  };
}

function mergeBalance(
  base: PhaseShifterVars['balance'],
  override: PhaseShifterVarsOverride['balance'],
): PhaseShifterVars['balance'] {
  if (!override) return base;
  return {
    ...base,
    transitionThresholds: {
      ...base.transitionThresholds,
      ...(override.transitionThresholds ?? {}),
    },
    transitionMode: {
      ...base.transitionMode,
      ...(override.transitionMode ?? {}),
    },
    phaseCostScaling: {
      ...base.phaseCostScaling,
      ...(override.phaseCostScaling ?? {}),
    },
    phaseDurationTargets: {
      ...base.phaseDurationTargets,
      ...(override.phaseDurationTargets ?? {}),
    },
    softCarryOver: override.softCarryOver
      ? { ...base.softCarryOver, ...override.softCarryOver }
      : base.softCarryOver,
    narrativeMilestones: override.narrativeMilestones ?? base.narrativeMilestones,
  };
}
