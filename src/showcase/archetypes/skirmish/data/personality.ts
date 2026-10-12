import type { PersonaDef, PersonaKey } from './types';

// ─── Skeleton ───
// Parameterized-personality roster for skirmish AI (Port 3).
// Plain consumer composition over `modules/automation.ts` — no engine primitive
// needed. Each persona is a parameter vector covering the guns-versus-butter split (φ),
// spawn cadence, burst cap, unit composition, and calibrated cadence jitter.
//
// Follows the research pattern `open-loop-research/patterns/adjacent/ai-rosters.md`
// and the tug `data/personality.ts` seed.

export const PERSONA_KEYS: readonly PersonaKey[] = [
  'rush',
  'investor',
  'skirmish',
  'boom',
  'combined',
];

export const PERSONAS: Record<PersonaKey, PersonaDef> = {
  rush: {
    id: 'rush',
    displayName: 'Vanguard Rush',
    role: 'Early infantry swarm',
    description:
      'All-in early aggression committing 100% of income into troopers with high decision frequency.',
    economyShare: 0,
    cadenceSec: 2,
    maxSpawnPerBurst: Infinity,
    cadenceJitter: 0.15,
    composition: { trooper: 1 },
    targeting: {
      armyWeight: -0.5,
      economyWeight: 0.5,
      distanceExponent: 2.0,
      focusWeight: 0.3,
      weaknessWeight: 1.5,
    },
  },
  investor: {
    id: 'investor',
    displayName: 'Compounding Investor',
    role: 'Steady economic expansion',
    description:
      'Devotes 20% of income to economic compounding while drafting standard trooper waves.',
    economyShare: 0.2,
    cadenceSec: 2,
    maxSpawnPerBurst: Infinity,
    cadenceJitter: 0.15,
    composition: { trooper: 1 },
    targeting: {
      armyWeight: 1.5,
      economyWeight: 0.5,
      distanceExponent: 1.0,
      focusWeight: 0.2,
      weaknessWeight: 0.5,
    },
  },
  skirmish: {
    id: 'skirmish',
    displayName: 'Ranged Skirmish',
    role: 'Archer harass & screen',
    description:
      'Light economic hedge (15%) fielding a mobile archer screen backed by infantry to punish slow melee.',
    economyShare: 0.15,
    cadenceSec: 2,
    maxSpawnPerBurst: 3,
    cadenceJitter: 0.15,
    composition: { archer: 3, trooper: 1 },
    targeting: {
      armyWeight: 0.5,
      economyWeight: 2.0,
      distanceExponent: 0.8,
      focusWeight: 0.2,
      weaknessWeight: 0.5,
    },
  },
  boom: {
    id: 'boom',
    displayName: 'Cavalry Blitz',
    role: 'Heavy macro & shock cavalry',
    description:
      'Heavy economic reinvestment (35%) banking for devastating late-game cavalry shock bursts.',
    economyShare: 0.35,
    cadenceSec: 2.5,
    maxSpawnPerBurst: Infinity,
    cadenceJitter: 0.15,
    composition: { cavalry: 2, trooper: 1 },
    targeting: {
      armyWeight: 1.0,
      economyWeight: 2.5,
      distanceExponent: 0.5,
      focusWeight: 0.25,
      weaknessWeight: 0,
    },
  },
  combined: {
    id: 'combined',
    displayName: 'Combined Arms',
    role: 'Adaptable triad roster',
    description:
      'Moderate economic split (20%) drafting a balanced infantry, archer, and cavalry triad.',
    economyShare: 0.2,
    cadenceSec: 2,
    maxSpawnPerBurst: Infinity,
    cadenceJitter: 0.15,
    composition: { trooper: 2, archer: 1, cavalry: 1 },
    targeting: {
      armyWeight: 1.0,
      economyWeight: 1.0,
      distanceExponent: 1.0,
      focusWeight: 0.2,
      weaknessWeight: 0.5,
    },
  },
};

// ─── Balance ───
// Persona couplings across the tactical and economic axes:
// 1. `rush` vs `boom`: Rush hits before boom's economy compounds; Trooper beats Cavalry
//    in the counter matrix (1.75x) AND on cost (10 vs 20), decisively punishing greed.
// 2. `boom` vs `skirmish`: Cavalry counters Archer (1.75x) and moves at 13 speed vs 7,
//    closing the gap and wiping out ranged screens.
// 3. `skirmish` vs `rush`: Archer counters Trooper (1.75x) with attack range 9 vs 3,
//    kiting and shredding pure infantry swarms.
// 4. `combined`: Holds answers to all pure drafts, stabilizing outcome variance.
// 5. Cadence jitter (0.15): In close matchups, breaks deterministic ties into
//    realistic probability distributions.

export function getPersonaDef(id: PersonaKey): PersonaDef {
  const def = PERSONAS[id];
  if (!def) throw new Error(`Unknown persona id: "${id}"`);
  return def;
}
