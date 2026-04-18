/**
 * Looper archetype — default vars.
 *
 * Baseline values a fresh Looper-archetype game starts with. Mirrors the
 * defaults called out in archetypes/looper.md § 5. Balance baseline is
 * tuned to the 1–2h first-completion arc.
 *
 * Defaults lean on the idle-loops-ng lineage (mana-pool 4000, retention
 * curve `1 + ss^0.8/30`) as the most-validated Looper shape in the
 * research corpus. Forks that want death-triggered or manual resets
 * override `archetype.loopTriggerMode` and tune `timeResourcePoolBase`
 * accordingly.
 */
import type {
  LooperArchetypeVars,
  LooperBalanceVars,
  LooperThemeVars,
  LooperVars,
} from './types';

export const DEFAULT_LOOPER_ARCHETYPE_VARS: LooperArchetypeVars = {
  loopTriggerMode: 'resource-depletion',
  queueMode: 'single',
  zoneCount: 4,
  skillCount: 5,
  actionCount: 20,
  retentionTrackCount: 2,
  automationUnlockTier: 'beat-7',
};

export const DEFAULT_LOOPER_BALANCE_VARS: LooperBalanceVars = {
  timeResourcePoolBase: '4000',
  firstLoopTargetDuration: 180,
  actionCostScaling: {
    baseCost: '250',
    skillLevelDivisor: 100,
  },
  skillLeveling: {
    xpPerAction: '10',
    xpToLevelFormula: 'sqrt',
    xpToLevelDivisor: 100,
  },
  retentionCurve: {
    exponent: 0.8,
    divisor: 30,
  },
  zoneUnlockThresholds: [
    { zone: 'zone-2', trigger: 'action-completion-count', value: 25 },
    { zone: 'zone-3', trigger: 'skill-level', value: 5 },
    { zone: 'zone-4', trigger: 'loop-count', value: 8 },
  ],
  automationUnlockLoop: 8,
};

/**
 * Reference theme — neutral naming for the stubbed skeleton. Real games
 * override wholesale. Array lengths match the archetype vars (4 zones,
 * 5 skills, 2 retention tracks).
 */
export const DEFAULT_LOOPER_THEME_VARS: LooperThemeVars = {
  timeResourceName: { singular: 'mana', plural: 'mana' },
  loopCompletionVerb: 'reset',
  retentionTrackNames: ['soulstone', 'talent'],
  zoneNames: ['zone-1', 'zone-2', 'zone-3', 'zone-4'],
  skillNames: ['skill-1', 'skill-2', 'skill-3', 'skill-4', 'skill-5'],
  actionFlavour: [],
  endOfArcMessage: 'Arc complete.',
};

export const DEFAULT_LOOPER_VARS: LooperVars = {
  archetype: DEFAULT_LOOPER_ARCHETYPE_VARS,
  theme: DEFAULT_LOOPER_THEME_VARS,
  balance: DEFAULT_LOOPER_BALANCE_VARS,
};
