import type { CapabilityDef } from './types';

// ─── Skeleton ───
// 4 capabilities, single-axis registry. The canonical Level + Talent two-tier
// role split (Level resets per loop and reduces cost; Talent persists and
// multiplies XP rate) lives in `modules/capabilities.ts` — data carries only
// typed identity. Forks that need a stats-vs-skills two-axis split layer that
// on top by registering a second category; the foundation stays single-axis.

// ─── Costume ───
// Theme-fresh palette: a minimal capability set covering the four flavors
// (physical / mystic / making / knowledge) typical of an idle-loop adventure
// shape, named generically so reskins don't fight the costume. Forks rename.

export const CAPABILITIES: CapabilityDef[] = [
  {
    id: 'vigor',
    name: 'Vigor',
    description: 'Physical conditioning — endurance, strength, reflexes.',
  },
  {
    id: 'aether',
    name: 'Aether',
    description: 'Affinity for the unseen current that ties the world together.',
  },
  {
    id: 'craft',
    name: 'Craft',
    description: 'Hands-on skill — shaping wood, stone, leather, metal, glass.',
  },
  {
    id: 'lore',
    name: 'Lore',
    description: 'Knowing things — names, signs, stories, the price of bread.',
  },
];
