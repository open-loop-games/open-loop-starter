import type { UnlockDef } from './types';

// ─── Skeleton ───
// 12 visibility unlocks. 5 producer reveals (planter at threshold 0 is
// default-visible — `tilled-earth` flips immediately on first tick).
// 5 scene-variant reveals matched to scene-variants.ts thresholds.
// 2 UI affordances (achievement grid, welcome-back overlay).
//
// Each unlock is realised as a `Purchasable` in `modules/unlocks.ts`:
// `requirements: createBooleanRequirement(() => lifetime ≥ threshold)`,
// `setupAutoPurchase` flips `bought.value = true` the first tick the
// requirement is met. No cost — soft reveal, not hard gate.

// ─── Costume ───
// Cozy Farm theme labels.

export const UNLOCKS: UnlockDef[] = [
  // Producer reveals
  {
    id: 'tilled-earth',
    label: 'Tilled Earth',
    threshold: 0,
    reveals: { kind: 'producer', producerId: 'planter' },
  },
  {
    id: 'coop-built',
    label: 'Henhouse Plans',
    threshold: 30_810_558,
    reveals: { kind: 'producer', producerId: 'coop' },
  },
  {
    id: 'pond-dug',
    label: 'Streambed Found',
    threshold: 600,
    reveals: { kind: 'producer', producerId: 'pond' },
  },
  {
    id: 'pasture-cleared',
    label: 'Open Acres',
    threshold: 12_000,
    reveals: { kind: 'producer', producerId: 'pasture' },
  },
  {
    id: 'orchard-planted',
    label: 'Sapling Stock',
    threshold: 200_000,
    reveals: { kind: 'producer', producerId: 'orchard' },
  },

  // Scene-variant reveals — thresholds match scene-variants.ts.
  {
    id: 'spring-arrives',
    label: 'Spring Arrives',
    threshold: 1_045_994_938,
    reveals: { kind: 'scene-variant', variantId: 'spring' },
  },
  {
    id: 'summer-warmth',
    label: 'Summer Warmth',
    threshold: 1_487_616_326,
    reveals: { kind: 'scene-variant', variantId: 'summer' },
  },
  {
    id: 'harvest-light',
    label: 'Harvest Light',
    threshold: 2_115_691_245,
    reveals: { kind: 'scene-variant', variantId: 'autumn' },
  },
  {
    id: 'winter-quiet',
    label: 'Winter Quiet',
    threshold: 3_008_940_791,
    reveals: { kind: 'scene-variant', variantId: 'winter' },
  },
  {
    id: 'year-cycles',
    label: 'Year-Round Garden',
    threshold: 4_279_322_281,
    reveals: { kind: 'scene-variant', variantId: 'year-cycles' },
  },

  // UI affordances
  {
    id: 'garden-almanac',
    label: 'Garden Almanac Open',
    threshold: 500,
    reveals: { kind: 'ui', affordance: 'achievement-grid' },
  },
  {
    id: 'returns-welcomed',
    label: 'Returns Welcomed',
    threshold: 100,
    reveals: { kind: 'ui', affordance: 'welcome-back' },
  },
];
