import type { ActionDef } from './types';

// ─── Skeleton ───
// 16 actions across 4 zones, 4 actions per zone. Every skill is granted XP by
// at least one action in every zone (cardinality-cross-check enforced by
// `sim/balance.probe.test.ts`). Single-tick actions only — multi-part is
// engine-gap territory (looper.md § 10) and the demo doesn't exercise it.

// ─── Costume ───
// Theme A — Classic Adventuring action set. Names lifted from the idle-loops
// lineage; descriptions abbreviated. Forks rename freely.

// ─── Balance ───
// Mana costs, XP grants, and the per-zone mana-positive grants are
// placeholders for OL-737 to bisect against beat windows. The skill-cost
// divisor + retention-curve wire are in balance.ts. Mana-positive actions
// shape per-loop strategy: queue them up to a mana floor, then drive zone
// gates with mana-negative content.

export const ACTIONS: ActionDef[] = [
  // ─── Beginnersville ───
  {
    id: 'wander',
    name: 'Wander',
    description: 'Stroll through the village. Cheap practice for the road.',
    zoneId: 'beginnersville',
    baseCost: 100,
    xpGrants: [{ skillId: 'combat', xp: 5 }],
  },
  {
    id: 'meet-people',
    name: 'Meet People',
    description: 'Chat with villagers. Practical magic helps the small things.',
    zoneId: 'beginnersville',
    baseCost: 200,
    xpGrants: [{ skillId: 'practical', xp: 10 }],
  },
  {
    id: 'attune-shrine',
    name: 'Attune at Shrine',
    description: 'Sit in quiet at the village shrine. The local aether settles around you.',
    zoneId: 'beginnersville',
    baseCost: 150,
    xpGrants: [{ skillId: 'magic', xp: 8 }],
    manaGrant: 250,
  },
  {
    id: 'short-quest',
    name: 'Short Quest',
    description: 'A villager needs a wolf chased off. Light combat training.',
    zoneId: 'beginnersville',
    baseCost: 400,
    xpGrants: [
      { skillId: 'combat', xp: 20 },
      { skillId: 'practical', xp: 4 },
    ],
  },

  // ─── Forest Path ───
  {
    id: 'forest-walk',
    name: 'Forest Walk',
    description: 'Cross between settlements. Deer trails, watchful eyes.',
    zoneId: 'forest-path',
    baseCost: 250,
    xpGrants: [{ skillId: 'combat', xp: 15 }],
  },
  {
    id: 'leyline-tap',
    name: 'Tap the Leyline',
    description: 'Old druids walked these paths. The roots still carry a thin thread of power.',
    zoneId: 'forest-path',
    baseCost: 300,
    xpGrants: [{ skillId: 'magic', xp: 18 }],
    manaGrant: 500,
  },
  {
    id: 'gather-herbs',
    name: 'Gather Herbs',
    description: 'Pick reagents in the forest understory.',
    zoneId: 'forest-path',
    baseCost: 200,
    xpGrants: [{ skillId: 'alchemy', xp: 12 }],
  },
  {
    id: 'hunt',
    name: 'Hunt',
    description: 'Track and dispatch wild game. Tougher fights pay better.',
    zoneId: 'forest-path',
    baseCost: 600,
    xpGrants: [
      { skillId: 'combat', xp: 30 },
      { skillId: 'crafting', xp: 6 },
    ],
  },

  // ─── Merchanton ───
  {
    id: 'apprentice-mason',
    name: 'Apprentice Mason',
    description: 'Lay block, cut stone, drive nails. Long apprenticeship.',
    zoneId: 'merchanton',
    baseCost: 500,
    xpGrants: [{ skillId: 'crafting', xp: 30 }],
  },
  {
    id: 'apprentice-alchemist',
    name: 'Apprentice Alchemist',
    description: 'Brewing under a master alchemist. Long, fume-soaked hours.',
    zoneId: 'merchanton',
    baseCost: 500,
    xpGrants: [{ skillId: 'alchemy', xp: 30 }],
  },
  {
    id: 'practical-magic',
    name: 'Practical Magic',
    description: 'Mage Hand for sheaves, Detect Magic for spoiled wares.',
    zoneId: 'merchanton',
    baseCost: 400,
    xpGrants: [{ skillId: 'practical', xp: 25 }],
  },
  {
    id: 'long-quest',
    name: 'Long Quest',
    description: 'Tracking a band of bandits across two days. Real combat.',
    zoneId: 'merchanton',
    baseCost: 1500,
    xpGrants: [
      { skillId: 'combat', xp: 80 },
      { skillId: 'practical', xp: 10 },
    ],
  },

  // ─── Ruined Keep ───
  {
    id: 'face-undead',
    name: 'Face Undead',
    description: 'Wraiths in the cellars. Bring iron, bring light.',
    zoneId: 'ruined-keep',
    baseCost: 1200,
    xpGrants: [
      { skillId: 'combat', xp: 70 },
      { skillId: 'magic', xp: 10 },
    ],
  },
  {
    id: 'ritual-magic',
    name: 'Ritual Magic',
    description: 'Sealing wards on broken stone. Aether thick with old grief.',
    zoneId: 'ruined-keep',
    baseCost: 1000,
    xpGrants: [{ skillId: 'magic', xp: 60 }],
  },
  {
    id: 'forge-relic',
    name: 'Forge Relic',
    description: 'Reforge a blade from keep-iron. Crafting at its limit.',
    zoneId: 'ruined-keep',
    baseCost: 1500,
    xpGrants: [
      { skillId: 'crafting', xp: 80 },
      { skillId: 'alchemy', xp: 10 },
    ],
  },
  {
    id: 'unlock-secret',
    name: 'Unlock Secret',
    description: "Trace the keep's last spell-circuit. Practical magic, dense.",
    zoneId: 'ruined-keep',
    baseCost: 800,
    xpGrants: [{ skillId: 'practical', xp: 50 }],
  },
];
