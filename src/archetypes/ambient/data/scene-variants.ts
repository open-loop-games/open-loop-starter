import type { SceneVariantDef } from './types';

// ─── Skeleton ───
// 6 named visual states. `tilled-beginnings` (threshold 0) is the default
// variant rendered before any scene-variant unlock fires. The remaining
// five share thresholds with the matching scene-variant unlocks in
// `unlocks.ts` — keep them in sync. The unlock entry is the gate; the
// variant entry is what it reveals. `modules/scene.ts` realises this set
// as a `ZoneSystem` (named-current-variant state machine, no spatial
// gating, no per-zone content).

// ─── Costume ───
// Cozy Farm: tilled-beginnings → spring → summer → autumn → winter → year-cycles.

export const SCENE_VARIANTS: SceneVariantDef[] = [
  {
    id: 'tilled-beginnings',
    label: 'Tilled Beginnings',
    threshold: 0,
    visualKey: 'scene/tilled',
  },
  {
    id: 'spring',
    label: 'Spring Bloom',
    threshold: 5_000,
    visualKey: 'scene/spring',
  },
  {
    id: 'summer',
    label: 'Summer Warmth',
    threshold: 50_000,
    visualKey: 'scene/summer',
  },
  {
    id: 'autumn',
    label: 'Harvest Light',
    threshold: 500_000,
    visualKey: 'scene/autumn',
  },
  {
    id: 'winter',
    label: 'Winter Quiet',
    threshold: 5_000_000,
    visualKey: 'scene/winter',
  },
  {
    id: 'year-cycles',
    label: 'Year-Round Garden',
    threshold: 50_000_000,
    visualKey: 'scene/year-cycles',
  },
];
