/**
 * Phase-shifter archetype — default vars.
 *
 * Baseline values a fresh Phase-shifter-archetype game starts with. Mirrors
 * the defaults called out in archetypes/phase-shifter.md § 5 and the content
 * sketch in § 8. Balance baseline tuned to the 1–2h first-completion arc:
 * first intra-phase reveal by ~5 min, Phase-1 rhythm by ~15 min, first
 * phase transition by ~55 min, Phase-2 rhythm by ~90 min, arc closure by
 * ~115 min.
 *
 * Defaults lean on the Paperclips shape — 3 phases, 'replace' transition
 * mode, thematic-integration narrative pacing, soft-prestige carry-over.
 * Dark-Room-shape forks swap defaultTransitionMode to 'layer', add
 * lateModifiers: ['spatial'], and raise phaseDurationTargets for Phase-2.
 * Candy-Box-2-shape forks use 'layer' + lateModifiers: ['adventure'] and
 * typically drop to 2 phases with a Phase-1b-style sub-expansion instead.
 */
import type {
  PhaseShifterArchetypeVars,
  PhaseShifterBalanceVars,
  PhaseShifterThemeVars,
  PhaseShifterVars,
} from './types';

export const DEFAULT_PHASE_SHIFTER_ARCHETYPE_VARS: PhaseShifterArchetypeVars = {
  phases: [
    { id: 'phase1', label: 'Phase 1' },
    { id: 'phase2', label: 'Phase 2' },
    { id: 'phase3', label: 'Phase 3' },
  ],
  defaultTransitionMode: 'replace',
  narrativePacing: 'hybrid',
  carryOverMode: 'soft-prestige',
  lateModifiers: [],
  multiEnding: false,
};

export const DEFAULT_PHASE_SHIFTER_BALANCE_VARS: PhaseShifterBalanceVars = {
  transitionThresholds: {
    phase1: {
      kind: 'resource',
      spec: { resourceId: 'primary', threshold: '1000' },
    },
    phase2: {
      kind: 'combined',
      spec: {
        subs: [
          { kind: 'resource', spec: { resourceId: 'primary', threshold: '1e9' } },
          { kind: 'milestone-flag', spec: { flagIds: ['phase2Completed'] } },
        ],
      },
      deferSeconds: 60,
    },
  },
  transitionMode: {
    phase1: 'replace',
    phase2: 'replace',
  },
  phaseCostScaling: {
    phase1: {
      curve: 'polynomial',
      baseCost: '10',
      growth: 1.15,
    },
    phase2: {
      curve: 'exponential',
      baseCost: '1e6',
      growth: 2.25,
    },
    phase3: {
      curve: 'linear',
      baseCost: '1e20',
      growth: 1.0,
    },
  },
  phaseDurationTargets: {
    phase1: { min: 0, max: 45 },
    phase2: { min: 45, max: 105 },
    phase3: { min: 105, max: 120 },
  },
  softCarryOver: {
    perUnitBonus: 0.10,
    sourceResourceId: 'primary',
    conversionFormula: 'sqrt',
    cap: '1000',
  },
  narrativeMilestones: [
    {
      id: 'firstDispatch',
      phase: 'phase1',
      trigger: { kind: 'action-count', spec: { actionId: 'primary', count: 1 } },
    },
    {
      id: 'firstReveal',
      phase: 'phase1',
      trigger: { kind: 'action-count', spec: { actionId: 'primary', count: 10 } },
    },
    {
      id: 'phase1Mid',
      phase: 'phase1',
      trigger: { kind: 'resource', spec: { resourceId: 'primary', threshold: '100' } },
    },
    {
      id: 'phase1Late',
      phase: 'phase1',
      trigger: { kind: 'resource', spec: { resourceId: 'primary', threshold: '500' } },
    },
    {
      id: 'foreshadow',
      phase: 'phase1',
      trigger: { kind: 'time-in-phase', spec: { seconds: 1500 } },
    },
    {
      id: 'phase2Entry',
      phase: 'phase2',
      trigger: { kind: 'time-in-phase', spec: { seconds: 60 } },
    },
    {
      id: 'phase2Mid',
      phase: 'phase2',
      trigger: { kind: 'resource', spec: { resourceId: 'secondary', threshold: '1e12' } },
    },
    {
      id: 'phase2Completed',
      phase: 'phase2',
      trigger: { kind: 'purchasable-owned', spec: { purchasableId: 'phase2Final', count: 1 } },
    },
    {
      id: 'phase3Entry',
      phase: 'phase3',
      trigger: { kind: 'time-in-phase', spec: { seconds: 30 } },
    },
    {
      id: 'arcClosure',
      phase: 'phase3',
      trigger: { kind: 'resource', spec: { resourceId: 'primary', threshold: '1e54' } },
    },
  ],
};

/**
 * Reference theme — neutral naming for the stubbed skeleton. Real games
 * override wholesale (see archetypes/phase-shifter.md § 11 for theme
 * variants: post-apocalyptic, AI-maximizer, sweet absurdism,
 * corporate-decline-to-renaissance).
 */
export const DEFAULT_PHASE_SHIFTER_THEME_VARS: PhaseShifterThemeVars = {
  phaseLabels: {
    phase1: 'Phase 1',
    phase2: 'Phase 2',
    phase3: 'Phase 3',
  },
  phaseCopy: {
    phase1: {
      onEnter: 'Something begins.',
      onExit: 'The first chapter closes.',
    },
    phase2: {
      onEnter: 'The ground shifts.',
      onExit: 'The second chapter closes.',
    },
    phase3: {
      onEnter: 'The end approaches.',
      onExit: 'The arc completes.',
    },
  },
  milestoneCopy: {
    firstDispatch: 'You act for the first time.',
    firstReveal: 'A new affordance appears in the margin.',
    foreshadow: 'Something larger is implied.',
    phase2Entry: 'The world is larger than it was.',
    arcClosure: 'The arc has closed.',
  },
  mechanicLifecycleCopy: {
    onInstall: 'A new mechanic is available.',
    onDisable: 'An old mechanic is no longer available.',
    onReplace: 'The old mechanic has become something else.',
  },
  endOfArcMessage: 'Arc complete.',
};

export const DEFAULT_PHASE_SHIFTER_VARS: PhaseShifterVars = {
  archetype: DEFAULT_PHASE_SHIFTER_ARCHETYPE_VARS,
  theme: DEFAULT_PHASE_SHIFTER_THEME_VARS,
  balance: DEFAULT_PHASE_SHIFTER_BALANCE_VARS,
};
