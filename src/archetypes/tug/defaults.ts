/**
 * Tug archetype — default vars.
 *
 * Baseline values a fresh Tug-archetype game starts with. Mirrors the
 * defaults in archetypes/tug.md § 5 and § 8. Codegen (OL-546) emits a game's
 * vars/*.ts by snapshotting these and writing them into
 * src/modules/mods/<game>/vars/.
 *
 * Theme defaults are deliberately neutral (reference-only); a real game
 * ships its own theme under src/modules/mods/<game>/vars/theme.ts — the
 * Fantasy Legion / Historical Warfare / SciFi Armada / Minimalist Abstract
 * shapes from § 11 are candidate starting points.
 */
import type {
  TugArchetypeVars,
  TugBalanceVars,
  TugThemeVars,
  TugVars,
} from './types';

export const DEFAULT_TUG_ARCHETYPE_VARS: TugArchetypeVars = {
  spatialMode: 'pure-routing',
  laneCount: 1,
  matchMode: 'pve',
  aiOpponentMode: 'symmetric-mirror',
  unitArchetypeCount: 6,
  metaProgressionEnabled: false,
  spendableAbilitiesEnabled: true,
  incomeUpgradeTiers: 3,
};

/**
 * Default 6×6 counter matrix with a crossed rock-paper-scissors+2-axis
 * structure: two primary cycles (indices 0→1→2→0 and 3→4→5→3) plus weak
 * cross-cycle interactions. Diagonal 1.0; strong counter 1.75; weak 0.6.
 *
 * Intended shape:
 *   0: Light melee   | 3: Ranged
 *   1: Anti-cavalry  | 4: Heavy armor
 *   2: Area damage   | 5: Flying
 */
const DEFAULT_COUNTER_MATRIX: number[][] = [
  // attacker 0 (Light melee) vs defenders 0..5
  [1.0, 1.75, 0.6, 1.0, 0.6, 1.0],
  // attacker 1 (Anti-cavalry)
  [0.6, 1.0, 1.75, 1.0, 1.75, 0.6],
  // attacker 2 (Area damage)
  [1.75, 0.6, 1.0, 1.0, 0.6, 1.0],
  // attacker 3 (Ranged)
  [1.0, 1.0, 1.0, 1.0, 1.75, 0.6],
  // attacker 4 (Heavy armor)
  [1.75, 0.6, 1.75, 0.6, 1.0, 0.6],
  // attacker 5 (Flying)
  [1.0, 1.75, 1.0, 1.75, 1.0, 1.0],
];

export const DEFAULT_TUG_BALANCE_VARS: TugBalanceVars = {
  baseIncomeRate: '5',
  incomeUpgradeMultipliers: [1.5, 1.4, 1.3],
  incomeUpgradeCosts: ['100', '400', '1500'],
  unitCosts: ['20', '50', '90', '60', '150', '200'],
  counterMatrix: DEFAULT_COUNTER_MATRIX,
  fortressHp: '1000',
  sendCooldownSeconds: 3,
  matchTimeLimitMinutes: 30,
  aiIncomeMultiplier: 1.0,
  abilityCosts: {
    artillery: '200',
    reinforcement: '300',
  },
};

/**
 * Reference theme — neutral placeholder naming (Theme D "Minimalist Abstract"
 * from § 11), suitable for a stubbed game skeleton. Real games override
 * wholesale. unitNames / unitRoles length matches
 * DEFAULT_TUG_ARCHETYPE_VARS.unitArchetypeCount (6).
 */
export const DEFAULT_TUG_THEME_VARS: TugThemeVars = {
  resourceName: { singular: 'spark', plural: 'sparks' },
  factionNames: ['Azure', 'Amber'],
  fortressName: 'core',
  unitNames: ['circle', 'triangle', 'square', 'pentagon', 'hexagon', 'star'],
  unitRoles: ['Fast', 'Area', 'Armor', 'Ranged', 'Siege', 'Support'],
  abilityLabels: {
    artillery: 'pulse',
    reinforcement: 'rally',
  },
  matchEndMessage: {
    victory: 'Core held — the Azure line advances.',
    defeat: 'Core breached — regroup and read the next matchup.',
  },
};

export const DEFAULT_TUG_VARS: TugVars = {
  archetype: DEFAULT_TUG_ARCHETYPE_VARS,
  theme: DEFAULT_TUG_THEME_VARS,
  balance: DEFAULT_TUG_BALANCE_VARS,
};
