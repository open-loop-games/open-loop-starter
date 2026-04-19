/**
 * Ambient archetype — default vars.
 *
 * Baseline values a fresh Ambient-archetype game starts with. Mirrors the
 * defaults in archetypes/ambient.md § 5. Codegen (OL-546) emits a game's
 * vars/*.ts by snapshotting these and writing them into
 * src/modules/mods/<game>/vars/.
 *
 * Theme defaults are deliberately neutral (reference-only); a real game
 * ships its own theme under src/modules/mods/<game>/vars/theme.ts.
 */
import type {
  AmbientArchetypeVars,
  AmbientBalanceVars,
  AmbientThemeVars,
  AmbientVars,
} from './types';

export const DEFAULT_AMBIENT_ARCHETYPE_VARS: AmbientArchetypeVars = {
  prestigeEnabled: false,
  autoProductionTiers: 5,
  unlockTrackDepth: 12,
  achievementCount: 20,
  glanceCheckWindowMinutes: [5, 20],
  offlineCapHours: 12,
  optionalChallengesEnabled: false,
};

export const DEFAULT_AMBIENT_BALANCE_VARS: AmbientBalanceVars = {
  tier1BaseRate: '0.5',
  producerCostScaling: {
    baseCost: '10',
    growth: 1.08,
  },
  tierCostRatios: [1, 8, 6, 5, 4],
  unlockThresholds: [
    '5', '25', '100', '400', '1500', '5000',
    '2e4', '1e5', '5e5', '2e6', '1e7', '5e7',
  ],
  offlineEfficiency: 1.0,
  achievementMultiplier: 1.02,
  prestigeMultiplierBase: 1.2,
  prestigeEligibleThreshold: '1e8',
};

/**
 * Reference theme — neutral naming, suitable for a stubbed game skeleton.
 * Real games override wholesale. Producer-names length matches
 * DEFAULT_AMBIENT_ARCHETYPE_VARS.autoProductionTiers (5).
 */
export const DEFAULT_AMBIENT_THEME_VARS: AmbientThemeVars = {
  resourceName: { singular: 'unit', plural: 'units' },
  producerNames: ['t1', 't2', 't3', 't4', 't5'],
  idleSceneVariants: ['default'],
  unlockFlavour: [],
  achievementFlavour: [],
  endOfArcMessage: 'Arc complete — the shape is yours to keep.',
  welcomeBackTemplate: 'While you were away, {count} {resourcePlural} accumulated.',
};

export const DEFAULT_AMBIENT_VARS: AmbientVars = {
  archetype: DEFAULT_AMBIENT_ARCHETYPE_VARS,
  theme: DEFAULT_AMBIENT_THEME_VARS,
  balance: DEFAULT_AMBIENT_BALANCE_VARS,
};
