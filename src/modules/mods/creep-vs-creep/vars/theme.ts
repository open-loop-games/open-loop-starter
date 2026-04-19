/**
 * Creep-vs-Creep — theme-layer vars.
 *
 * Theme A (Creep vs Creep) from archetypes/director.md § 11. Slime-mold
 * naming over the Director skeleton; zero mechanical impact.
 */
import type { DirectorVarsOverride } from '@/archetypes/director';

export const creepVsCreepTheme: NonNullable<DirectorVarsOverride['theme']> = {
  factionNames: {
    red: 'Crimson Bloom',
    blue: 'Azure Spore',
    green: 'Verdant Mat',
    yellow: 'Sulfur Web',
  },
  factionEssenceNames: {
    red: 'Crimson Essence',
    blue: 'Azure Essence',
    green: 'Verdant Essence',
    yellow: 'Sulfur Essence',
  },
  // metaCurrencyName / hotspotNoun / tendrilNoun / personalityNames /
  // flavour strings all inherit Director defaults — the Creep theme uses the
  // same "Command" / "hotspot" / "spread" vocabulary as the archetype.
};
