// ─── Skeleton ───
// The extras: the crowd that walks onto the soundstage from every side. A kind is part of
// the cast, not a stat block: its hp is a factor on the scene's hp, and it joins the floor
// from a scene index on. A kind is structural, so nothing here is perturbable.

export type ExtraId = 'grunt' | 'biker' | 'bruiser' | 'henchman';

export interface ExtraKind {
  id: ExtraId;
  /** Multiple of the scene's extra hp. Also the reel a kill drops, so income tracks the hp dealt. */
  hpFactor: number;
  /** Walking speed, world units a second. */
  speed: number;
  /** Draw weight among the kinds open at a scene. */
  weight: number;
  /** First scene index the kind walks on at. */
  fromScene: number;
  radius: number;
}

export const EXTRAS: readonly ExtraKind[] = [
  { id: 'grunt', hpFactor: 1, speed: 62, weight: 10, fromScene: 0, radius: 11 },
  { id: 'biker', hpFactor: 0.7, speed: 165, weight: 4, fromScene: 1, radius: 10 },
  { id: 'bruiser', hpFactor: 4, speed: 42, weight: 2, fromScene: 2, radius: 17 },
  { id: 'henchman', hpFactor: 2, speed: 80, weight: 3, fromScene: 4, radius: 13 },
];

export function eligibleExtras(scene: number): ExtraKind[] {
  return EXTRAS.filter((k) => scene >= k.fromScene);
}

// ─── Balance ───
// The roster shifts the mean hp of what arrives as heavier kinds join: 1.0 at scene 0, 1.41
// from scene 4. The spine's hp flux carries this factor, so the per-level rig gain is solved
// against the mix and not just against the scene's hp.

/** Weighted mean hpFactor of what arrives at a scene. */
export function meanHpFactor(scene: number): number {
  const ks = eligibleExtras(scene);
  const w = ks.reduce((a, k) => a + k.weight, 0);
  return ks.reduce((a, k) => a + k.weight * k.hpFactor, 0) / w;
}
