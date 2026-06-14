import type { AbilityDef } from './types';

// ─── Skeleton ───
// 2 spendable off-map abilities — present only when
// `balance.spendableAbilitiesEnabled === true`. Modules read this array
// directly; no `abilityRefs` link from `units.ts` in the skeleton baseline
// (artillery and reinforcement are commander-level surfaces, not unit-
// attached). Forks re-purposing abilityRefs as on-cast effects override
// this list.

// ─── Costume ───
// Theme C SciFi Armada: orbital strike + drop-pod reinforcement. The
// reinforcement default-spawns marines (the cheapest archetype) so the
// ability remains affordable; forks rebind to a different archetypeId.

// ─── Balance ───
// First-cut placeholders chosen for ratio shape — artillery costs ~2× a
// battlecruiser, reinforcement ~3× a marine batch. Leaf-6 retunes if the
// abilities-enabled fork variant joins the regression suite.

export const ABILITIES: AbilityDef[] = [
  {
    id: 'artillery',
    label: 'Orbital Strike',
    cost: 800,
    cooldownSec: 45,
    effect: { kind: 'artillery', damage: 250, radius: 30 },
  },
  {
    id: 'reinforcement',
    label: 'Drop-Pod Reinforcement',
    cost: 300,
    cooldownSec: 60,
    effect: { kind: 'reinforcement', archetypeId: 'marine', count: 5 },
  },
];
